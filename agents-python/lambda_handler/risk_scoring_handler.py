"""
AWS Lambda Handler for Risk Scoring Agent

This Lambda function processes contract risk scoring requests and
integrates with DynamoDB, S3, and Amazon A2I for human review.
"""

import json
import os
import asyncio
from typing import Dict, Any
from datetime import datetime

from core.risk_scoring_agent import RiskScoringAgent
from services.dynamodb_service import DynamoDBService
from services.s3_service import S3Service
from services.a2i_service import A2IService
from services.bedrock_service import BedrockService
from types.risk_scoring_types import (
    RiskScoringInput,
    RiskScoreOutput,
    ErrorResponse,
    RiskWeights,
    RiskThresholds,
    HumanLoopRequest
)


# Global service instances (reused across invocations)
dynamodb_service = None
s3_service = None
a2i_service = None
bedrock_service = None


def get_config() -> dict:
    """Get configuration from environment variables"""
    return {
        'weights': Risk

Weights(
            legal=float(os.getenv('LEGAL_WEIGHT', '0.33')),
            financial=float(os.getenv('FINANCIAL_WEIGHT', '0.33')),
            compliance=float(os.getenv('COMPLIANCE_WEIGHT', '0.34'))
        ),
        'thresholds': RiskThresholds(
            low_risk=float(os.getenv('LOW_RISK_THRESHOLD', '0.4')),
            medium_risk=float(os.getenv('MEDIUM_RISK_THRESHOLD', '0.7')),
            high_risk=float(os.getenv('HIGH_RISK_THRESHOLD', '1.0'))
        ),
        'aws_region': os.getenv('AWS_REGION', 'us-east-1'),
        'dynamodb_table_name': os.getenv('DYNAMODB_TABLE_NAME', 'RiskScoringResults'),
        's3_bucket_name': os.getenv('S3_BUCKET_NAME', 'contract-risk-reports'),
        'bedrock_model_id': os.getenv('BEDROCK_MODEL_ID', 'anthropic.claude-v2'),
        'bedrock_max_tokens': int(os.getenv('BEDROCK_MAX_TOKENS', '4096')),
        'bedrock_temperature': float(os.getenv('BEDROCK_TEMPERATURE', '0.3')),
        'a2i_flow_definition_arn': os.getenv('A2I_FLOW_DEFINITION_ARN', ''),
        'enable_auto_escalation': os.getenv('ENABLE_AUTO_ESCALATION', 'true').lower() == 'true',
        'enable_reviewer_sampling': os.getenv('ENABLE_REVIEWER_SAMPLING', 'true').lower() == 'true',
        'sampling_rate': float(os.getenv('SAMPLING_RATE', '0.1'))
    }


def initialize_services(config: dict):
    """Initialize AWS services (lazy initialization)"""
    global dynamodb_service, s3_service, a2i_service, bedrock_service

    if not dynamodb_service:
        dynamodb_service = DynamoDBService(
            table_name=config['dynamodb_table_name'],
            region=config['aws_region']
        )

    if not s3_service:
        s3_service = S3Service(
            bucket_name=config['s3_bucket_name'],
            region=config['aws_region']
        )

    if not a2i_service:
        a2i_service = A2IService(
            flow_definition_arn=config['a2i_flow_definition_arn'],
            region=config['aws_region']
        )

    if not bedrock_service:
        bedrock_service = BedrockService(
            model_id=config['bedrock_model_id'],
            region=config['aws_region'],
            max_tokens=config['bedrock_max_tokens'],
            temperature=config['bedrock_temperature']
        )


def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Main Lambda handler

    Args:
        event: API Gateway event
        context: Lambda context

    Returns:
        API Gateway response
    """
    print(f"Risk Scoring Lambda invoked - Request ID: {context.request_id}")

    try:
        # Parse request body
        body = json.loads(event.get('body', '{}'))
        input_data = RiskScoringInput(**body)

        # Validate input
        if not input_data.contract_id:
            return create_error_response(400, 'Missing required field: contract_id')

        # Get configuration
        config = get_config()
        initialize_services(config)

        # Create Risk Scoring Agent
        agent = RiskScoringAgent(
            weights=config['weights'],
            thresholds=config['thresholds']
        )

        # Calculate risk score (async)
        risk_score = asyncio.run(agent.calculate_risk_score(input_data))

        # Enhance narrative with Bedrock (optional)
        if bedrock_service and risk_score.composite_severity != 'low':
            try:
                enhanced_narrative = bedrock_service.enhance_narrative(
                    risk_score.detailed_narrative,
                    risk_score
                )
                # Update the risk score with enhanced narrative
                risk_score.detailed_narrative = enhanced_narrative
            except Exception as e:
                print(f"Warning: Failed to enhance narrative with Bedrock: {e}")
                # Continue with original narrative

        # Store in DynamoDB
        print(f"Storing risk score in DynamoDB for contract {input_data.contract_id}")
        dynamodb_service.save_risk_score(risk_score)

        # Save report to S3
        print(f"Saving risk report to S3 for contract {input_data.contract_id}")
        s3_key = s3_service.save_risk_report(risk_score)
        print(f"Risk report saved to S3: {s3_key}")

        # Save HTML report
        html_key = s3_service.save_risk_report_html(risk_score)
        print(f"HTML report saved to S3: {html_key}")

        # Check if escalation is needed
        if config['enable_auto_escalation'] and risk_score.requires_human_review:
            print(f"Escalating contract {input_data.contract_id} to human review")
            escalate_to_human_review(risk_score, s3_key, config)

        # Check for sampling-based review (for low/medium risk contracts)
        import random
        if (config['enable_reviewer_sampling'] and
            not risk_score.requires_human_review and
            random.random() < config['sampling_rate']):
            print(f"Contract {input_data.contract_id} selected for sampling-based review "
                  f"({config['sampling_rate'] * 100}% rate)")
            escalate_to_human_review(risk_score, s3_key, config)

        # Return success response
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'success': True,
                'contract_id': input_data.contract_id,
                'risk_score': json.loads(risk_score.json()),
                's3_report_key': s3_key,
                's3_html_key': html_key,
                'message': 'Risk scoring completed successfully'
            })
        }

    except Exception as e:
        print(f"Risk scoring error: {e}")
        return create_error_response(500, 'Internal server error', str(e))


def escalate_to_human_review(
    risk_score: RiskScoreOutput,
    s3_report_key: str,
    config: dict
) -> None:
    """
    Escalate contract to Amazon A2I for human review

    Args:
        risk_score: Risk score output
        s3_report_key: S3 key for the report
        config: Configuration dictionary
    """
    try:
        human_loop_name = f"risk-review-{risk_score.contract_id}-{int(datetime.utcnow().timestamp())}"

        human_loop_request = HumanLoopRequest(
            flow_definition_arn=config['a2i_flow_definition_arn'],
            human_loop_name=human_loop_name,
            input_content={
                'contract_id': risk_score.contract_id,
                'risk_score': json.loads(risk_score.json()),
                'contract_url': f"s3://{config['s3_bucket_name']}/{s3_report_key}"
            },
            data_attributes={
                'content_classifiers': ['FreeOfPersonallyIdentifiableInformation']
            }
        )

        response = a2i_service.create_human_loop(human_loop_request)
        print(f"Human loop created: {response.human_loop_arn}")

        # Update DynamoDB record with human loop info
        dynamodb_service.update_human_loop_status(
            risk_score.contract_id,
            response.human_loop_arn,
            'pending'
        )

    except Exception as e:
        print(f"Failed to escalate to human review: {e}")
        raise


def create_error_response(
    status_code: int,
    message: str,
    details: str = None
) -> Dict[str, Any]:
    """
    Create error response

    Args:
        status_code: HTTP status code
        message: Error message
        details: Additional details

    Returns:
        API Gateway response
    """
    error_response = ErrorResponse(
        error='Internal Server Error' if status_code >= 500 else 'Bad Request',
        message=message,
        timestamp=datetime.utcnow().isoformat(),
        details=details
    )

    return {
        'statusCode': status_code,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        },
        'body': error_response.json()
    }


def health_check_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Health check handler

    Args:
        event: API Gateway event
        context: Lambda context

    Returns:
        Health check response
    """
    return {
        'statusCode': 200,
        'headers': {
            'Content-Type': 'application/json'
        },
        'body': json.dumps({
            'status': 'healthy',
            'service': 'Risk Scoring Agent',
            'version': '1.0.0',
            'timestamp': datetime.utcnow().isoformat()
        })
    }


def batch_processing_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Batch processing handler (for S3 events)

    Args:
        event: S3 event
        context: Lambda context

    Returns:
        Processing results
    """
    print(f"Batch processing Lambda invoked - Request ID: {context.request_id}")
    print(f"Record count: {len(event.get('Records', []))}")

    config = get_config()
    initialize_services(config)

    agent = RiskScoringAgent(
        weights=config['weights'],
        thresholds=config['thresholds']
    )

    results = []
    errors = []

    # Process S3 event records
    for record in event.get('Records', []):
        try:
            # Get contract data from S3
            bucket = record['s3']['bucket']['name']
            key = record['s3']['object']['key']

            print(f"Processing contract from s3://{bucket}/{key}")

            contract_data = s3_service.get_object(bucket, key)
            input_data = RiskScoringInput(**json.loads(contract_data))

            # Calculate risk score
            risk_score = asyncio.run(agent.calculate_risk_score(input_data))

            # Store results
            dynamodb_service.save_risk_score(risk_score)
            report_key = s3_service.save_risk_report(risk_score)

            # Escalate if needed
            if config['enable_auto_escalation'] and risk_score.requires_human_review:
                escalate_to_human_review(risk_score, report_key, config)

            results.append({
                'contract_id': input_data.contract_id,
                'status': 'success',
                'risk_score': risk_score.composite_score
            })

        except Exception as e:
            print(f"Batch processing error: {e}")
            errors.append({
                'record': record,
                'error': str(e)
            })

    return {
        'statusCode': 200,
        'body': json.dumps({
            'processed': len(results),
            'failed': len(errors),
            'results': results,
            'errors': errors
        })
    }

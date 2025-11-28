"""
DynamoDB Service for Risk Scoring Agent

Handles all DynamoDB operations for storing and retrieving risk scores,
reviewer feedback, and processing metadata.
"""

import boto3
from boto3.dynamodb.conditions import Key
from datetime import datetime, timedelta
from typing import List, Optional
import json

from types.risk_scoring_types import (
    RiskScoreOutput,
    RiskScoreRecord,
    ReviewerFeedback
)


class DynamoDBService:
    """DynamoDB service for risk score storage"""

    def __init__(self, table_name: str, region: str = "us-east-1"):
        """
        Initialize DynamoDB service

        Args:
            table_name: DynamoDB table name
            region: AWS region
        """
        self.table_name = table_name
        self.region = region
        self.dynamodb = boto3.resource('dynamodb', region_name=region)
        self.table = self.dynamodb.Table(table_name)

    def save_risk_score(self, risk_score: RiskScoreOutput) -> None:
        """
        Save risk score to DynamoDB

        Args:
            risk_score: Risk score output to save
        """
        timestamp = datetime.utcnow().isoformat()
        ttl = int((datetime.utcnow() + timedelta(days=90)).timestamp())

        record = RiskScoreRecord(
            pk=risk_score.contract_id,
            sk=timestamp,
            contract_id=risk_score.contract_id,
            risk_score=risk_score,
            created_at=timestamp,
            updated_at=timestamp,
            ttl=ttl
        )

        try:
            self.table.put_item(Item=json.loads(record.json()))
            print(f"Risk score saved for contract {risk_score.contract_id}")
        except Exception as e:
            print(f"Error saving risk score to DynamoDB: {e}")
            raise Exception(f"Failed to save risk score: {str(e)}")

    def get_risk_score(
        self,
        contract_id: str,
        timestamp: Optional[str] = None
    ) -> Optional[RiskScoreRecord]:
        """
        Get risk score by contract ID and timestamp

        Args:
            contract_id: Contract identifier
            timestamp: Specific timestamp (optional, gets latest if not provided)

        Returns:
            RiskScoreRecord or None if not found
        """
        if timestamp:
            # Get specific version
            try:
                response = self.table.get_item(
                    Key={'pk': contract_id, 'sk': timestamp}
                )
                if 'Item' in response:
                    return RiskScoreRecord(**response['Item'])
                return None
            except Exception as e:
                print(f"Error getting risk score from DynamoDB: {e}")
                raise Exception(f"Failed to get risk score: {str(e)}")
        else:
            # Get latest version
            return self.get_latest_risk_score(contract_id)

    def get_latest_risk_score(self, contract_id: str) -> Optional[RiskScoreRecord]:
        """
        Get latest risk score for a contract

        Args:
            contract_id: Contract identifier

        Returns:
            Latest RiskScoreRecord or None
        """
        try:
            response = self.table.query(
                KeyConditionExpression=Key('pk').eq(contract_id),
                ScanIndexForward=False,  # Descending order (latest first)
                Limit=1
            )

            if response['Items']:
                return RiskScoreRecord(**response['Items'][0])
            return None
        except Exception as e:
            print(f"Error querying latest risk score: {e}")
            raise Exception(f"Failed to query risk score: {str(e)}")

    def get_risk_score_history(
        self,
        contract_id: str,
        limit: int = 10
    ) -> List[RiskScoreRecord]:
        """
        Get all risk scores for a contract (history)

        Args:
            contract_id: Contract identifier
            limit: Maximum number of records to return

        Returns:
            List of RiskScoreRecord
        """
        try:
            response = self.table.query(
                KeyConditionExpression=Key('pk').eq(contract_id),
                ScanIndexForward=False,  # Descending order (latest first)
                Limit=limit
            )

            return [RiskScoreRecord(**item) for item in response.get('Items', [])]
        except Exception as e:
            print(f"Error querying risk score history: {e}")
            raise Exception(f"Failed to query risk score history: {str(e)}")

    def add_reviewer_feedback(
        self,
        contract_id: str,
        timestamp: str,
        feedback: ReviewerFeedback
    ) -> None:
        """
        Add reviewer feedback to a risk score

        Args:
            contract_id: Contract identifier
            timestamp: Risk score timestamp
            feedback: Reviewer feedback
        """
        try:
            self.table.update_item(
                Key={'pk': contract_id, 'sk': timestamp},
                UpdateExpression='SET reviewer_feedback = :feedback, updated_at = :updated',
                ExpressionAttributeValues={
                    ':feedback': json.loads(feedback.json()),
                    ':updated': datetime.utcnow().isoformat()
                }
            )
            print(f"Reviewer feedback added for contract {contract_id}")
        except Exception as e:
            print(f"Error adding reviewer feedback: {e}")
            raise Exception(f"Failed to add reviewer feedback: {str(e)}")

    def update_human_loop_status(
        self,
        contract_id: str,
        human_loop_arn: str,
        status: str
    ) -> None:
        """
        Update human loop status

        Args:
            contract_id: Contract identifier
            human_loop_arn: Amazon A2I human loop ARN
            status: Human loop status
        """
        # Get latest record first
        latest_record = self.get_latest_risk_score(contract_id)
        if not latest_record:
            raise Exception(f"No risk score found for contract {contract_id}")

        try:
            self.table.update_item(
                Key={'pk': contract_id, 'sk': latest_record.sk},
                UpdateExpression='SET human_loop_arn = :arn, human_loop_status = :status, updated_at = :updated',
                ExpressionAttributeValues={
                    ':arn': human_loop_arn,
                    ':status': status,
                    ':updated': datetime.utcnow().isoformat()
                }
            )
            print(f"Human loop status updated for contract {contract_id}: {status}")
        except Exception as e:
            print(f"Error updating human loop status: {e}")
            raise Exception(f"Failed to update human loop status: {str(e)}")

    def batch_save_risk_scores(self, risk_scores: List[RiskScoreOutput]) -> None:
        """
        Batch save multiple risk scores

        Args:
            risk_scores: List of risk scores to save
        """
        timestamp = datetime.utcnow().isoformat()
        ttl = int((datetime.utcnow() + timedelta(days=90)).timestamp())

        # DynamoDB batch write supports max 25 items
        for i in range(0, len(risk_scores), 25):
            batch = risk_scores[i:i + 25]

            with self.table.batch_writer() as writer:
                for risk_score in batch:
                    record = RiskScoreRecord(
                        pk=risk_score.contract_id,
                        sk=timestamp,
                        contract_id=risk_score.contract_id,
                        risk_score=risk_score,
                        created_at=timestamp,
                        updated_at=timestamp,
                        ttl=ttl
                    )
                    writer.put_item(Item=json.loads(record.json()))

            print(f"Batch saved {len(batch)} risk scores")

    def query_high_risk_contracts(
        self,
        min_score: float = 0.7,
        limit: int = 100
    ) -> List[RiskScoreRecord]:
        """
        Query high-risk contracts

        Args:
            min_score: Minimum composite score
            limit: Maximum number of records

        Returns:
            List of high-risk contract records
        """
        # Note: This requires a GSI on composite_score
        # For now, scan and filter (not efficient for large datasets)
        try:
            response = self.table.scan(
                FilterExpression='risk_score.composite_score >= :min_score',
                ExpressionAttributeValues={':min_score': min_score},
                Limit=limit
            )

            return [RiskScoreRecord(**item) for item in response.get('Items', [])]
        except Exception as e:
            print(f"Error querying high-risk contracts: {e}")
            print("Consider creating a GSI on composite_score for efficient queries")
            return []

    def get_risk_score_stats(self, start_date: str, end_date: str) -> dict:
        """
        Get statistics for risk scores

        Args:
            start_date: Start date (ISO format)
            end_date: End date (ISO format)

        Returns:
            Dictionary with statistics
        """
        # This would typically use DynamoDB Streams or be computed via analytics
        # Placeholder implementation
        print(f"Getting risk score statistics: {start_date} to {end_date}")
        return {
            'total_contracts': 0,
            'avg_composite_score': 0.0,
            'high_risk_count': 0,
            'medium_risk_count': 0,
            'low_risk_count': 0
        }

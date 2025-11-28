/**
 * AWS Lambda Handler for Risk Scoring Agent
 *
 * This Lambda function processes contract risk scoring requests and
 * integrates with DynamoDB, S3, and Amazon A2I for human review.
 */

import { Handler, Context, APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { RiskScoringAgent } from '../core/risk-scoring-agent';
import { DynamoDBService } from '../services/dynamodb-service';
import { S3Service } from '../services/s3-service';
import { A2IService } from '../services/a2i-service';
import { BedrockService } from '../services/bedrock-service';
import {
  RiskScoringInput,
  RiskScoreOutput,
  ErrorResponse,
  RiskScoringConfig,
} from '../types/risk-scoring.types';

/**
 * Environment configuration
 */
const getConfig = (): RiskScoringConfig => ({
  weights: {
    legal: parseFloat(process.env.LEGAL_WEIGHT || '0.33'),
    financial: parseFloat(process.env.FINANCIAL_WEIGHT || '0.33'),
    compliance: parseFloat(process.env.COMPLIANCE_WEIGHT || '0.34'),
  },
  thresholds: {
    lowRisk: parseFloat(process.env.LOW_RISK_THRESHOLD || '0.4'),
    mediumRisk: parseFloat(process.env.MEDIUM_RISK_THRESHOLD || '0.7'),
    highRisk: parseFloat(process.env.HIGH_RISK_THRESHOLD || '1.0'),
  },
  bedrockConfig: {
    modelId: process.env.BEDROCK_MODEL_ID || 'anthropic.claude-v2',
    region: process.env.AWS_REGION || 'us-east-1',
    maxTokens: parseInt(process.env.BEDROCK_MAX_TOKENS || '4096'),
    temperature: parseFloat(process.env.BEDROCK_TEMPERATURE || '0.3'),
  },
  dynamoDbConfig: {
    tableName: process.env.DYNAMODB_TABLE_NAME || 'RiskScoringResults',
    region: process.env.AWS_REGION || 'us-east-1',
  },
  s3Config: {
    bucketName: process.env.S3_BUCKET_NAME || 'contract-risk-reports',
    region: process.env.AWS_REGION || 'us-east-1',
  },
  a2iConfig: {
    flowDefinitionArn: process.env.A2I_FLOW_DEFINITION_ARN || '',
    region: process.env.AWS_REGION || 'us-east-1',
  },
  enableAutoEscalation: process.env.ENABLE_AUTO_ESCALATION === 'true',
  enableReviewerSampling: process.env.ENABLE_REVIEWER_SAMPLING === 'true',
  samplingRate: parseFloat(process.env.SAMPLING_RATE || '0.1'),
});

/**
 * Service instances
 */
let dynamoDbService: DynamoDBService;
let s3Service: S3Service;
let a2iService: A2IService;
let bedrockService: BedrockService;

/**
 * Initialize services
 */
const initializeServices = (config: RiskScoringConfig) => {
  if (!dynamoDbService) {
    dynamoDbService = new DynamoDBService(config.dynamoDbConfig);
  }
  if (!s3Service) {
    s3Service = new S3Service(config.s3Config);
  }
  if (!a2iService) {
    a2iService = new A2IService(config.a2iConfig);
  }
  if (!bedrockService) {
    bedrockService = new BedrockService(config.bedrockConfig);
  }
};

/**
 * Main Lambda Handler
 */
export const handler: Handler = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  console.log('Risk Scoring Lambda invoked', {
    requestId: context.requestId,
    eventType: event.httpMethod,
  });

  try {
    // Parse request body
    const input: RiskScoringInput = JSON.parse(event.body || '{}');

    // Validate input
    if (!input.contractId) {
      return createErrorResponse(400, 'Missing required field: contractId');
    }

    if (!input.clauseExtraction || !input.complianceCheck || !input.riskAssessment) {
      return createErrorResponse(
        400,
        'Missing required agent outputs: clauseExtraction, complianceCheck, or riskAssessment'
      );
    }

    // Get configuration
    const config = getConfig();
    initializeServices(config);

    // Create Risk Scoring Agent
    const agent = new RiskScoringAgent(config.weights, config.thresholds);

    // Calculate risk score
    console.log(`Calculating risk score for contract ${input.contractId}`);
    const riskScore = await agent.calculateRiskScore(input);

    // Enhance narrative with Bedrock (optional)
    if (bedrockService && riskScore.compositeSeverity !== 'low') {
      try {
        const enhancedNarrative = await bedrockService.enhanceNarrative(
          riskScore.detailedNarrative,
          riskScore
        );
        riskScore.detailedNarrative = enhancedNarrative;
      } catch (error) {
        console.warn('Failed to enhance narrative with Bedrock:', error);
        // Continue with original narrative
      }
    }

    // Store in DynamoDB
    console.log(`Storing risk score in DynamoDB for contract ${input.contractId}`);
    await dynamoDbService.saveRiskScore(riskScore);

    // Save report to S3
    console.log(`Saving risk report to S3 for contract ${input.contractId}`);
    const s3Key = await s3Service.saveRiskReport(riskScore);
    console.log(`Risk report saved to S3: ${s3Key}`);

    // Check if escalation is needed
    if (config.enableAutoEscalation && riskScore.requiresHumanReview) {
      console.log(`Escalating contract ${input.contractId} to human review`);
      await escalateToHumanReview(riskScore, s3Key, config);
    }

    // Check for sampling-based review (for low/medium risk contracts)
    if (
      config.enableReviewerSampling &&
      !riskScore.requiresHumanReview &&
      Math.random() < config.samplingRate
    ) {
      console.log(
        `Contract ${input.contractId} selected for sampling-based review (${config.samplingRate * 100}% rate)`
      );
      await escalateToHumanReview(riskScore, s3Key, config);
    }

    // Return success response
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        success: true,
        contractId: input.contractId,
        riskScore,
        s3ReportKey: s3Key,
        message: 'Risk scoring completed successfully',
      }),
    };
  } catch (error) {
    console.error('Risk scoring error:', error);
    return createErrorResponse(500, 'Internal server error', error.message);
  }
};

/**
 * Escalate contract to Amazon A2I for human review
 */
async function escalateToHumanReview(
  riskScore: RiskScoreOutput,
  s3ReportKey: string,
  config: RiskScoringConfig
): Promise<void> {
  try {
    const humanLoopName = `risk-review-${riskScore.contractId}-${Date.now()}`;

    const humanLoopRequest = {
      flowDefinitionArn: config.a2iConfig.flowDefinitionArn,
      humanLoopName,
      inputContent: {
        contractId: riskScore.contractId,
        riskScore,
        contractUrl: `s3://${config.s3Config.bucketName}/${s3ReportKey}`,
      },
      dataAttributes: {
        contentClassifiers: ['FreeOfPersonallyIdentifiableInformation'],
      },
    };

    const response = await a2iService.createHumanLoop(humanLoopRequest);
    console.log(`Human loop created: ${response.humanLoopArn}`);

    // Update DynamoDB record with human loop info
    await dynamoDbService.updateHumanLoopStatus(
      riskScore.contractId,
      response.humanLoopArn,
      'pending'
    );
  } catch (error) {
    console.error('Failed to escalate to human review:', error);
    throw error;
  }
}

/**
 * Create error response
 */
function createErrorResponse(
  statusCode: number,
  message: string,
  details?: string
): APIGatewayProxyResult {
  const errorResponse: ErrorResponse = {
    error: statusCode >= 500 ? 'Internal Server Error' : 'Bad Request',
    message,
    timestamp: new Date().toISOString(),
    details,
  };

  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
    body: JSON.stringify(errorResponse),
  };
}

/**
 * Health check handler
 */
export const healthCheckHandler: Handler = async (): Promise<APIGatewayProxyResult> => {
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      status: 'healthy',
      service: 'Risk Scoring Agent',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
    }),
  };
};

/**
 * Batch processing handler (for processing multiple contracts)
 */
export const batchProcessingHandler: Handler = async (
  event: any,
  context: Context
): Promise<any> => {
  console.log('Batch processing Lambda invoked', {
    requestId: context.requestId,
    recordCount: event.Records?.length || 0,
  });

  const config = getConfig();
  initializeServices(config);

  const agent = new RiskScoringAgent(config.weights, config.thresholds);
  const results = [];
  const errors = [];

  // Process S3 event records
  for (const record of event.Records || []) {
    try {
      // Get contract data from S3
      const bucket = record.s3.bucket.name;
      const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, ' '));

      console.log(`Processing contract from s3://${bucket}/${key}`);

      const contractData = await s3Service.getObject(bucket, key);
      const input: RiskScoringInput = JSON.parse(contractData);

      // Calculate risk score
      const riskScore = await agent.calculateRiskScore(input);

      // Store results
      await dynamoDbService.saveRiskScore(riskScore);
      const reportKey = await s3Service.saveRiskReport(riskScore);

      // Escalate if needed
      if (config.enableAutoEscalation && riskScore.requiresHumanReview) {
        await escalateToHumanReview(riskScore, reportKey, config);
      }

      results.push({
        contractId: input.contractId,
        status: 'success',
        riskScore: riskScore.compositeScore,
      });
    } catch (error) {
      console.error('Batch processing error:', error);
      errors.push({
        record,
        error: error.message,
      });
    }
  }

  return {
    statusCode: 200,
    body: JSON.stringify({
      processed: results.length,
      failed: errors.length,
      results,
      errors,
    }),
  };
};

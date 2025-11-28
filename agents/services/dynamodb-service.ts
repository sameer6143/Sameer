/**
 * DynamoDB Service for Risk Scoring Agent
 *
 * Handles all DynamoDB operations for storing and retrieving risk scores,
 * reviewer feedback, and processing metadata.
 */

import {
  DynamoDBClient,
  PutItemCommand,
  GetItemCommand,
  QueryCommand,
  UpdateItemCommand,
  BatchWriteItemCommand,
} from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import {
  RiskScoreOutput,
  RiskScoreRecord,
  ReviewerFeedback,
} from '../types/risk-scoring.types';

export interface DynamoDBConfig {
  tableName: string;
  region: string;
}

export class DynamoDBService {
  private client: DynamoDBClient;
  private tableName: string;

  constructor(config: DynamoDBConfig) {
    this.client = new DynamoDBClient({ region: config.region });
    this.tableName = config.tableName;
  }

  /**
   * Save risk score to DynamoDB
   */
  async saveRiskScore(riskScore: RiskScoreOutput): Promise<void> {
    const timestamp = new Date().toISOString();

    const record: RiskScoreRecord = {
      pk: riskScore.contractId,
      sk: timestamp,
      contractId: riskScore.contractId,
      riskScore,
      createdAt: timestamp,
      updatedAt: timestamp,
      // Set TTL to 90 days from now (in seconds)
      ttl: Math.floor(Date.now() / 1000) + 90 * 24 * 60 * 60,
    };

    const command = new PutItemCommand({
      TableName: this.tableName,
      Item: marshall(record, {
        removeUndefinedValues: true,
        convertClassInstanceToMap: true,
      }),
    });

    try {
      await this.client.send(command);
      console.log(`Risk score saved for contract ${riskScore.contractId}`);
    } catch (error) {
      console.error('Error saving risk score to DynamoDB:', error);
      throw new Error(`Failed to save risk score: ${error.message}`);
    }
  }

  /**
   * Get risk score by contract ID and timestamp
   */
  async getRiskScore(contractId: string, timestamp?: string): Promise<RiskScoreRecord | null> {
    if (timestamp) {
      // Get specific version
      const command = new GetItemCommand({
        TableName: this.tableName,
        Key: marshall({
          pk: contractId,
          sk: timestamp,
        }),
      });

      try {
        const response = await this.client.send(command);
        if (!response.Item) {
          return null;
        }
        return unmarshall(response.Item) as RiskScoreRecord;
      } catch (error) {
        console.error('Error getting risk score from DynamoDB:', error);
        throw new Error(`Failed to get risk score: ${error.message}`);
      }
    } else {
      // Get latest version
      return this.getLatestRiskScore(contractId);
    }
  }

  /**
   * Get latest risk score for a contract
   */
  async getLatestRiskScore(contractId: string): Promise<RiskScoreRecord | null> {
    const command = new QueryCommand({
      TableName: this.tableName,
      KeyConditionExpression: 'pk = :contractId',
      ExpressionAttributeValues: marshall({
        ':contractId': contractId,
      }),
      ScanIndexForward: false, // Descending order (latest first)
      Limit: 1,
    });

    try {
      const response = await this.client.send(command);
      if (!response.Items || response.Items.length === 0) {
        return null;
      }
      return unmarshall(response.Items[0]) as RiskScoreRecord;
    } catch (error) {
      console.error('Error querying latest risk score:', error);
      throw new Error(`Failed to query risk score: ${error.message}`);
    }
  }

  /**
   * Get all risk scores for a contract (history)
   */
  async getRiskScoreHistory(contractId: string, limit: number = 10): Promise<RiskScoreRecord[]> {
    const command = new QueryCommand({
      TableName: this.tableName,
      KeyConditionExpression: 'pk = :contractId',
      ExpressionAttributeValues: marshall({
        ':contractId': contractId,
      }),
      ScanIndexForward: false, // Descending order (latest first)
      Limit: limit,
    });

    try {
      const response = await this.client.send(command);
      if (!response.Items || response.Items.length === 0) {
        return [];
      }
      return response.Items.map((item) => unmarshall(item) as RiskScoreRecord);
    } catch (error) {
      console.error('Error querying risk score history:', error);
      throw new Error(`Failed to query risk score history: ${error.message}`);
    }
  }

  /**
   * Add reviewer feedback to a risk score
   */
  async addReviewerFeedback(
    contractId: string,
    timestamp: string,
    feedback: ReviewerFeedback
  ): Promise<void> {
    const command = new UpdateItemCommand({
      TableName: this.tableName,
      Key: marshall({
        pk: contractId,
        sk: timestamp,
      }),
      UpdateExpression: 'SET reviewerFeedback = :feedback, updatedAt = :updatedAt',
      ExpressionAttributeValues: marshall({
        ':feedback': feedback,
        ':updatedAt': new Date().toISOString(),
      }),
    });

    try {
      await this.client.send(command);
      console.log(`Reviewer feedback added for contract ${contractId}`);
    } catch (error) {
      console.error('Error adding reviewer feedback:', error);
      throw new Error(`Failed to add reviewer feedback: ${error.message}`);
    }
  }

  /**
   * Update human loop status
   */
  async updateHumanLoopStatus(
    contractId: string,
    humanLoopArn: string,
    status: string
  ): Promise<void> {
    // Get latest record first
    const latestRecord = await this.getLatestRiskScore(contractId);
    if (!latestRecord) {
      throw new Error(`No risk score found for contract ${contractId}`);
    }

    const command = new UpdateItemCommand({
      TableName: this.tableName,
      Key: marshall({
        pk: contractId,
        sk: latestRecord.sk,
      }),
      UpdateExpression: 'SET humanLoopArn = :arn, humanLoopStatus = :status, updatedAt = :updatedAt',
      ExpressionAttributeValues: marshall({
        ':arn': humanLoopArn,
        ':status': status,
        ':updatedAt': new Date().toISOString(),
      }),
    });

    try {
      await this.client.send(command);
      console.log(`Human loop status updated for contract ${contractId}: ${status}`);
    } catch (error) {
      console.error('Error updating human loop status:', error);
      throw new Error(`Failed to update human loop status: ${error.message}`);
    }
  }

  /**
   * Batch save multiple risk scores
   */
  async batchSaveRiskScores(riskScores: RiskScoreOutput[]): Promise<void> {
    const timestamp = new Date().toISOString();
    const ttl = Math.floor(Date.now() / 1000) + 90 * 24 * 60 * 60;

    // DynamoDB batch write supports max 25 items
    const batches: RiskScoreRecord[][] = [];
    for (let i = 0; i < riskScores.length; i += 25) {
      batches.push(
        riskScores.slice(i, i + 25).map((riskScore) => ({
          pk: riskScore.contractId,
          sk: timestamp,
          contractId: riskScore.contractId,
          riskScore,
          createdAt: timestamp,
          updatedAt: timestamp,
          ttl,
        }))
      );
    }

    for (const batch of batches) {
      const command = new BatchWriteItemCommand({
        RequestItems: {
          [this.tableName]: batch.map((record) => ({
            PutRequest: {
              Item: marshall(record, {
                removeUndefinedValues: true,
                convertClassInstanceToMap: true,
              }),
            },
          })),
        },
      });

      try {
        await this.client.send(command);
        console.log(`Batch saved ${batch.length} risk scores`);
      } catch (error) {
        console.error('Error batch saving risk scores:', error);
        throw new Error(`Failed to batch save risk scores: ${error.message}`);
      }
    }
  }

  /**
   * Query high-risk contracts
   */
  async queryHighRiskContracts(
    minScore: number = 0.7,
    limit: number = 100
  ): Promise<RiskScoreRecord[]> {
    // Note: This requires a GSI on compositeScore
    const command = new QueryCommand({
      TableName: this.tableName,
      IndexName: 'CompositeScoreIndex', // Assumes GSI exists
      KeyConditionExpression: 'scoreType = :scoreType',
      FilterExpression: 'riskScore.compositeScore >= :minScore',
      ExpressionAttributeValues: marshall({
        ':scoreType': 'COMPOSITE',
        ':minScore': minScore,
      }),
      ScanIndexForward: false,
      Limit: limit,
    });

    try {
      const response = await this.client.send(command);
      if (!response.Items || response.Items.length === 0) {
        return [];
      }
      return response.Items.map((item) => unmarshall(item) as RiskScoreRecord);
    } catch (error) {
      console.error('Error querying high-risk contracts:', error);
      // If GSI doesn't exist, return empty array
      console.warn('CompositeScoreIndex may not exist. Consider creating a GSI for efficient queries.');
      return [];
    }
  }

  /**
   * Get statistics for risk scores
   */
  async getRiskScoreStats(startDate: string, endDate: string): Promise<any> {
    // This would typically use DynamoDB Streams or be computed via analytics
    // For now, return a placeholder
    console.log('Getting risk score statistics:', { startDate, endDate });
    return {
      totalContracts: 0,
      avgCompositeScore: 0,
      highRiskCount: 0,
      mediumRiskCount: 0,
      lowRiskCount: 0,
    };
  }
}

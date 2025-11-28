/**
 * Amazon Augmented AI (A2I) Service
 *
 * Handles human-in-the-loop review escalation for high-risk contracts.
 */

import {
  SageMakerA2IRuntimeClient,
  StartHumanLoopCommand,
  StopHumanLoopCommand,
  DescribeHumanLoopCommand,
  ListHumanLoopsCommand,
} from '@aws-sdk/client-sagemaker-a2i-runtime';
import {
  HumanLoopRequest,
  HumanLoopResponse,
} from '../types/risk-scoring.types';

export interface A2IConfig {
  flowDefinitionArn: string;
  region: string;
}

export class A2IService {
  private client: SageMakerA2IRuntimeClient;
  private flowDefinitionArn: string;

  constructor(config: A2IConfig) {
    this.client = new SageMakerA2IRuntimeClient({ region: config.region });
    this.flowDefinitionArn = config.flowDefinitionArn;
  }

  /**
   * Create a human loop for manual review
   */
  async createHumanLoop(request: HumanLoopRequest): Promise<HumanLoopResponse> {
    const command = new StartHumanLoopCommand({
      HumanLoopName: request.humanLoopName,
      FlowDefinitionArn: request.flowDefinitionArn || this.flowDefinitionArn,
      HumanLoopInput: {
        InputContent: JSON.stringify(request.inputContent),
      },
      DataAttributes: request.dataAttributes,
    });

    try {
      const response = await this.client.send(command);
      console.log(`Human loop created: ${response.HumanLoopArn}`);

      return {
        humanLoopArn: response.HumanLoopArn || '',
        humanLoopName: request.humanLoopName,
        status: 'InProgress',
      };
    } catch (error) {
      console.error('Error creating human loop:', error);
      throw new Error(`Failed to create human loop: ${error.message}`);
    }
  }

  /**
   * Get human loop status
   */
  async getHumanLoopStatus(humanLoopName: string): Promise<HumanLoopResponse> {
    const command = new DescribeHumanLoopCommand({
      HumanLoopName: humanLoopName,
    });

    try {
      const response = await this.client.send(command);

      return {
        humanLoopArn: response.HumanLoopArn || '',
        humanLoopName: humanLoopName,
        status: response.HumanLoopStatus as any,
        outputDestination: response.HumanLoopOutput?.OutputS3Uri,
      };
    } catch (error) {
      console.error('Error getting human loop status:', error);
      throw new Error(`Failed to get human loop status: ${error.message}`);
    }
  }

  /**
   * Stop a human loop
   */
  async stopHumanLoop(humanLoopName: string): Promise<void> {
    const command = new StopHumanLoopCommand({
      HumanLoopName: humanLoopName,
    });

    try {
      await this.client.send(command);
      console.log(`Human loop stopped: ${humanLoopName}`);
    } catch (error) {
      console.error('Error stopping human loop:', error);
      throw new Error(`Failed to stop human loop: ${error.message}`);
    }
  }

  /**
   * List human loops by status
   */
  async listHumanLoops(
    flowDefinitionArn?: string,
    createdAfter?: Date,
    maxResults: number = 100
  ): Promise<any[]> {
    const command = new ListHumanLoopsCommand({
      FlowDefinitionArn: flowDefinitionArn || this.flowDefinitionArn,
      CreationTimeAfter: createdAfter,
      MaxResults: maxResults,
      SortOrder: 'Descending',
    });

    try {
      const response = await this.client.send(command);
      return response.HumanLoopSummaries || [];
    } catch (error) {
      console.error('Error listing human loops:', error);
      throw new Error(`Failed to list human loops: ${error.message}`);
    }
  }

  /**
   * Check if human loop is complete
   */
  async isHumanLoopComplete(humanLoopName: string): Promise<boolean> {
    const status = await this.getHumanLoopStatus(humanLoopName);
    return status.status === 'Completed' || status.status === 'Failed' || status.status === 'Stopped';
  }

  /**
   * Wait for human loop completion
   */
  async waitForCompletion(
    humanLoopName: string,
    maxWaitTimeMs: number = 3600000, // 1 hour
    pollIntervalMs: number = 30000 // 30 seconds
  ): Promise<HumanLoopResponse> {
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitTimeMs) {
      const status = await this.getHumanLoopStatus(humanLoopName);

      if (status.status === 'Completed') {
        console.log(`Human loop completed: ${humanLoopName}`);
        return status;
      } else if (status.status === 'Failed' || status.status === 'Stopped') {
        throw new Error(`Human loop ${status.status.toLowerCase()}: ${humanLoopName}`);
      }

      // Wait before polling again
      await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
    }

    throw new Error(`Human loop timed out after ${maxWaitTimeMs}ms: ${humanLoopName}`);
  }
}

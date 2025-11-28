/**
 * Amazon Bedrock Service
 *
 * Handles AI-powered narrative enhancement using Claude models via Amazon Bedrock.
 */

import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from '@aws-sdk/client-bedrock-runtime';
import { RiskScoreOutput } from '../types/risk-scoring.types';

export interface BedrockConfig {
  modelId: string;
  region: string;
  maxTokens: number;
  temperature: number;
}

export class BedrockService {
  private client: BedrockRuntimeClient;
  private modelId: string;
  private maxTokens: number;
  private temperature: number;

  constructor(config: BedrockConfig) {
    this.client = new BedrockRuntimeClient({ region: config.region });
    this.modelId = config.modelId;
    this.maxTokens = config.maxTokens;
    this.temperature = config.temperature;
  }

  /**
   * Enhance risk narrative using Claude
   */
  async enhanceNarrative(
    originalNarrative: string,
    riskScore: RiskScoreOutput
  ): Promise<string> {
    const prompt = this.buildNarrativePrompt(originalNarrative, riskScore);

    try {
      const response = await this.invokeModel(prompt);
      return response;
    } catch (error) {
      console.error('Error enhancing narrative with Bedrock:', error);
      // Return original narrative if enhancement fails
      return originalNarrative;
    }
  }

  /**
   * Generate executive summary
   */
  async generateExecutiveSummary(riskScore: RiskScoreOutput): Promise<string> {
    const prompt = `You are a legal risk analyst. Based on the following risk scoring data, generate a concise 2-3 sentence executive summary for senior management.

Risk Scores:
- Legal Risk: ${(riskScore.legalRisk.score * 100).toFixed(1)}% (${riskScore.legalRisk.severity})
- Financial Risk: ${(riskScore.financialRisk.score * 100).toFixed(1)}% (${riskScore.financialRisk.severity})
- Compliance Risk: ${(riskScore.complianceRisk.score * 100).toFixed(1)}% (${riskScore.complianceRisk.severity})
- Overall: ${(riskScore.compositeScore * 100).toFixed(1)}% (${riskScore.compositeSeverity})

Key Factors:
${this.formatRiskFactors(riskScore)}

Generate an executive summary that is:
1. Concise and actionable
2. Highlights the most critical risks
3. Provides clear next steps

Executive Summary:`;

    try {
      return await this.invokeModel(prompt);
    } catch (error) {
      console.error('Error generating executive summary:', error);
      throw error;
    }
  }

  /**
   * Generate recommendations
   */
  async generateRecommendations(riskScore: RiskScoreOutput): Promise<string[]> {
    const prompt = `You are a legal risk advisor. Based on the following risk assessment, provide 3-5 specific, actionable recommendations.

Risk Assessment:
- Contract ID: ${riskScore.contractId}
- Overall Risk: ${(riskScore.compositeScore * 100).toFixed(1)}% (${riskScore.compositeSeverity})
- Legal Risk: ${(riskScore.legalRisk.score * 100).toFixed(1)}% - ${riskScore.legalRisk.narrative}
- Financial Risk: ${(riskScore.financialRisk.score * 100).toFixed(1)}% - ${riskScore.financialRisk.narrative}
- Compliance Risk: ${(riskScore.complianceRisk.score * 100).toFixed(1)}% - ${riskScore.complianceRisk.narrative}

Provide actionable recommendations in a numbered list format. Each recommendation should be specific and implementable.

Recommendations:`;

    try {
      const response = await this.invokeModel(prompt);
      // Parse numbered list into array
      return response
        .split('\n')
        .filter((line) => /^\d+\./.test(line.trim()))
        .map((line) => line.replace(/^\d+\.\s*/, '').trim());
    } catch (error) {
      console.error('Error generating recommendations:', error);
      throw error;
    }
  }

  /**
   * Analyze contract clause and assess risk
   */
  async analyzeClauseRisk(clauseText: string, clauseType: string): Promise<any> {
    const prompt = `You are a legal contract analyst. Analyze the following ${clauseType} clause and assess its risk level.

Clause Text:
${clauseText}

Provide:
1. Risk Level (Low/Medium/High/Critical)
2. Key concerns (if any)
3. Recommendations for improvement

Analysis:`;

    try {
      const response = await this.invokeModel(prompt);
      return {
        clauseType,
        analysis: response,
      };
    } catch (error) {
      console.error('Error analyzing clause risk:', error);
      throw error;
    }
  }

  /**
   * Build narrative enhancement prompt
   */
  private buildNarrativePrompt(narrative: string, riskScore: RiskScoreOutput): string {
    return `You are a senior legal risk analyst. Your task is to enhance the following risk analysis narrative to make it more clear, comprehensive, and actionable for business stakeholders.

Contract ID: ${riskScore.contractId}
Overall Risk Score: ${(riskScore.compositeScore * 100).toFixed(1)}% (${riskScore.compositeSeverity})

Current Narrative:
${narrative}

Risk Details:
- Legal Risk: ${(riskScore.legalRisk.score * 100).toFixed(1)}% (${riskScore.legalRisk.severity})
  Factors: ${riskScore.legalRisk.factors.map((f) => f.name).join(', ')}

- Financial Risk: ${(riskScore.financialRisk.score * 100).toFixed(1)}% (${riskScore.financialRisk.severity})
  Factors: ${riskScore.financialRisk.factors.map((f) => f.name).join(', ')}

- Compliance Risk: ${(riskScore.complianceRisk.score * 100).toFixed(1)}% (${riskScore.complianceRisk.severity})
  Factors: ${riskScore.complianceRisk.factors.map((f) => f.name).join(', ')}

Please enhance this narrative to:
1. Make it more readable and well-structured
2. Highlight critical risks prominently
3. Provide clear context for business impact
4. Maintain all factual information
5. Use professional legal and business terminology

Enhanced Narrative:`;
  }

  /**
   * Format risk factors for prompt
   */
  private formatRiskFactors(riskScore: RiskScoreOutput): string {
    const factors: string[] = [];

    if (riskScore.legalRisk.factors.length > 0) {
      factors.push('Legal: ' + riskScore.legalRisk.factors.map((f) => f.name).join(', '));
    }
    if (riskScore.financialRisk.factors.length > 0) {
      factors.push('Financial: ' + riskScore.financialRisk.factors.map((f) => f.name).join(', '));
    }
    if (riskScore.complianceRisk.factors.length > 0) {
      factors.push('Compliance: ' + riskScore.complianceRisk.factors.map((f) => f.name).join(', '));
    }

    return factors.join('\n');
  }

  /**
   * Invoke Bedrock model
   */
  private async invokeModel(prompt: string): Promise<string> {
    const body = JSON.stringify({
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: this.maxTokens,
      temperature: this.temperature,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const command = new InvokeModelCommand({
      modelId: this.modelId,
      contentType: 'application/json',
      accept: 'application/json',
      body,
    });

    try {
      const response = await this.client.send(command);
      const responseBody = JSON.parse(new TextDecoder().decode(response.body));

      if (responseBody.content && responseBody.content.length > 0) {
        return responseBody.content[0].text;
      }

      throw new Error('Invalid response from Bedrock');
    } catch (error) {
      console.error('Error invoking Bedrock model:', error);
      throw new Error(`Bedrock invocation failed: ${error.message}`);
    }
  }

  /**
   * Invoke model with streaming (for long responses)
   */
  async invokeModelWithStreaming(prompt: string, onChunk: (chunk: string) => void): Promise<void> {
    // Implementation would use InvokeModelWithResponseStreamCommand
    // Simplified for now
    const response = await this.invokeModel(prompt);
    onChunk(response);
  }
}

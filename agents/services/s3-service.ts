/**
 * S3 Service for Risk Scoring Agent
 *
 * Handles all S3 operations for storing risk reports and contract documents.
 */

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3';
import { RiskScoreOutput } from '../types/risk-scoring.types';

export interface S3Config {
  bucketName: string;
  region: string;
}

export class S3Service {
  private client: S3Client;
  private bucketName: string;

  constructor(config: S3Config) {
    this.client = new S3Client({ region: config.region });
    this.bucketName = config.bucketName;
  }

  /**
   * Save risk report to S3
   */
  async saveRiskReport(riskScore: RiskScoreOutput): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const key = `risk-reports/${riskScore.contractId}/${timestamp}/report.json`;

    // Create comprehensive report
    const report = {
      metadata: {
        reportType: 'Risk Scoring Report',
        generatedAt: riskScore.timestamp,
        reportVersion: '1.0',
      },
      contractId: riskScore.contractId,
      riskScore,
      // Add formatted text version
      textReport: this.generateTextReport(riskScore),
    };

    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      Body: JSON.stringify(report, null, 2),
      ContentType: 'application/json',
      Metadata: {
        contractId: riskScore.contractId,
        compositeScore: riskScore.compositeScore.toString(),
        severity: riskScore.compositeSeverity,
        status: riskScore.status,
        requiresReview: riskScore.requiresHumanReview.toString(),
      },
      ServerSideEncryption: 'AES256',
    });

    try {
      await this.client.send(command);
      console.log(`Risk report saved to S3: ${key}`);
      return key;
    } catch (error) {
      console.error('Error saving risk report to S3:', error);
      throw new Error(`Failed to save risk report: ${error.message}`);
    }
  }

  /**
   * Save risk report as HTML
   */
  async saveRiskReportHtml(riskScore: RiskScoreOutput): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const key = `risk-reports/${riskScore.contractId}/${timestamp}/report.html`;

    const html = this.generateHtmlReport(riskScore);

    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      Body: html,
      ContentType: 'text/html',
      Metadata: {
        contractId: riskScore.contractId,
        compositeScore: riskScore.compositeScore.toString(),
        severity: riskScore.compositeSeverity,
      },
      ServerSideEncryption: 'AES256',
    });

    try {
      await this.client.send(command);
      console.log(`HTML risk report saved to S3: ${key}`);
      return key;
    } catch (error) {
      console.error('Error saving HTML risk report to S3:', error);
      throw new Error(`Failed to save HTML risk report: ${error.message}`);
    }
  }

  /**
   * Get object from S3
   */
  async getObject(bucket: string, key: string): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    try {
      const response = await this.client.send(command);
      const body = await response.Body?.transformToString();
      return body || '';
    } catch (error) {
      console.error('Error getting object from S3:', error);
      throw new Error(`Failed to get object from S3: ${error.message}`);
    }
  }

  /**
   * Get risk report from S3
   */
  async getRiskReport(key: string): Promise<any> {
    const data = await this.getObject(this.bucketName, key);
    return JSON.parse(data);
  }

  /**
   * List all reports for a contract
   */
  async listContractReports(contractId: string): Promise<string[]> {
    const command = new ListObjectsV2Command({
      Bucket: this.bucketName,
      Prefix: `risk-reports/${contractId}/`,
    });

    try {
      const response = await this.client.send(command);
      return response.Contents?.map((obj) => obj.Key || '') || [];
    } catch (error) {
      console.error('Error listing contract reports:', error);
      throw new Error(`Failed to list contract reports: ${error.message}`);
    }
  }

  /**
   * Delete risk report
   */
  async deleteRiskReport(key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });

    try {
      await this.client.send(command);
      console.log(`Risk report deleted from S3: ${key}`);
    } catch (error) {
      console.error('Error deleting risk report:', error);
      throw new Error(`Failed to delete risk report: ${error.message}`);
    }
  }

  /**
   * Generate text report
   */
  private generateTextReport(riskScore: RiskScoreOutput): string {
    const lines: string[] = [];

    lines.push('='.repeat(80));
    lines.push('CONTRACT RISK SCORING REPORT');
    lines.push('='.repeat(80));
    lines.push('');
    lines.push(`Contract ID: ${riskScore.contractId}`);
    lines.push(`Generated: ${riskScore.timestamp}`);
    lines.push('');

    lines.push('-'.repeat(80));
    lines.push('EXECUTIVE SUMMARY');
    lines.push('-'.repeat(80));
    lines.push(riskScore.executiveSummary);
    lines.push('');

    lines.push('-'.repeat(80));
    lines.push('RISK SCORES');
    lines.push('-'.repeat(80));
    lines.push(
      `Legal Risk:      ${(riskScore.legalRisk.score * 100).toFixed(1)}% (${riskScore.legalRisk.severity.toUpperCase()})`
    );
    lines.push(
      `Financial Risk:  ${(riskScore.financialRisk.score * 100).toFixed(1)}% (${riskScore.financialRisk.severity.toUpperCase()})`
    );
    lines.push(
      `Compliance Risk: ${(riskScore.complianceRisk.score * 100).toFixed(1)}% (${riskScore.complianceRisk.severity.toUpperCase()})`
    );
    lines.push('');
    lines.push(
      `COMPOSITE SCORE: ${(riskScore.compositeScore * 100).toFixed(1)}% (${riskScore.compositeSeverity.toUpperCase()})`
    );
    lines.push('');

    lines.push('-'.repeat(80));
    lines.push('STATUS AND RECOMMENDATIONS');
    lines.push('-'.repeat(80));
    lines.push(`Status: ${riskScore.status.toUpperCase()}`);
    lines.push(`Requires Human Review: ${riskScore.requiresHumanReview ? 'YES' : 'NO'}`);
    if (riskScore.escalationReason) {
      lines.push(`Escalation Reason: ${riskScore.escalationReason}`);
    }
    lines.push('');
    lines.push('Recommendations:');
    riskScore.recommendations.forEach((rec, idx) => {
      lines.push(`  ${idx + 1}. ${rec}`);
    });
    lines.push('');

    lines.push('-'.repeat(80));
    lines.push('DETAILED ANALYSIS');
    lines.push('-'.repeat(80));
    lines.push(riskScore.detailedNarrative);
    lines.push('');

    lines.push('='.repeat(80));
    lines.push('END OF REPORT');
    lines.push('='.repeat(80));

    return lines.join('\n');
  }

  /**
   * Generate HTML report
   */
  private generateHtmlReport(riskScore: RiskScoreOutput): string {
    const getSeverityColor = (severity: string): string => {
      switch (severity.toLowerCase()) {
        case 'low':
          return '#28a745';
        case 'medium':
          return '#ffc107';
        case 'high':
          return '#dc3545';
        case 'critical':
          return '#8b0000';
        default:
          return '#6c757d';
      }
    };

    const scorePercent = (riskScore.compositeScore * 100).toFixed(1);
    const severityColor = getSeverityColor(riskScore.compositeSeverity);

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Risk Scoring Report - ${riskScore.contractId}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            border-radius: 8px;
            margin-bottom: 30px;
        }
        .header h1 {
            margin: 0;
            font-size: 28px;
        }
        .contract-id {
            font-size: 14px;
            opacity: 0.9;
            margin-top: 10px;
        }
        .card {
            background: white;
            border-radius: 8px;
            padding: 25px;
            margin-bottom: 20px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .score-container {
            display: flex;
            justify-content: space-between;
            gap: 20px;
            margin-bottom: 30px;
        }
        .score-card {
            flex: 1;
            text-align: center;
            padding: 20px;
            border-radius: 8px;
            background: white;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .score-label {
            font-size: 14px;
            color: #666;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 10px;
        }
        .score-value {
            font-size: 36px;
            font-weight: bold;
            margin: 10px 0;
        }
        .severity-badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: bold;
            text-transform: uppercase;
            color: white;
        }
        .composite-score {
            background: ${severityColor};
            color: white;
            padding: 30px;
            border-radius: 8px;
            text-align: center;
            margin-bottom: 30px;
        }
        .composite-score .score-value {
            font-size: 48px;
            color: white;
        }
        .section-title {
            font-size: 20px;
            font-weight: 600;
            margin-bottom: 15px;
            padding-bottom: 10px;
            border-bottom: 2px solid #e0e0e0;
        }
        .recommendations {
            list-style: none;
            padding: 0;
        }
        .recommendations li {
            padding: 12px;
            margin-bottom: 10px;
            background: #f8f9fa;
            border-left: 4px solid #667eea;
            border-radius: 4px;
        }
        .narrative {
            white-space: pre-wrap;
            line-height: 1.8;
            background: #f8f9fa;
            padding: 20px;
            border-radius: 4px;
        }
        .status-badge {
            display: inline-block;
            padding: 8px 16px;
            border-radius: 4px;
            font-weight: 600;
            margin-right: 10px;
        }
        .status-approved { background: #d4edda; color: #155724; }
        .status-review { background: #fff3cd; color: #856404; }
        .status-mandatory { background: #f8d7da; color: #721c24; }
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
        }
        th, td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #e0e0e0;
        }
        th {
            background: #f8f9fa;
            font-weight: 600;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>Contract Risk Scoring Report</h1>
        <div class="contract-id">Contract ID: ${riskScore.contractId}</div>
        <div class="contract-id">Generated: ${new Date(riskScore.timestamp).toLocaleString()}</div>
    </div>

    <div class="composite-score">
        <div class="score-label">Overall Composite Risk Score</div>
        <div class="score-value">${scorePercent}%</div>
        <span class="severity-badge" style="background: rgba(255,255,255,0.3);">${riskScore.compositeSeverity.toUpperCase()} RISK</span>
    </div>

    <div class="score-container">
        <div class="score-card">
            <div class="score-label">Legal Risk</div>
            <div class="score-value" style="color: ${getSeverityColor(riskScore.legalRisk.severity)}">
                ${(riskScore.legalRisk.score * 100).toFixed(1)}%
            </div>
            <span class="severity-badge" style="background: ${getSeverityColor(riskScore.legalRisk.severity)}">
                ${riskScore.legalRisk.severity.toUpperCase()}
            </span>
        </div>
        <div class="score-card">
            <div class="score-label">Financial Risk</div>
            <div class="score-value" style="color: ${getSeverityColor(riskScore.financialRisk.severity)}">
                ${(riskScore.financialRisk.score * 100).toFixed(1)}%
            </div>
            <span class="severity-badge" style="background: ${getSeverityColor(riskScore.financialRisk.severity)}">
                ${riskScore.financialRisk.severity.toUpperCase()}
            </span>
        </div>
        <div class="score-card">
            <div class="score-label">Compliance Risk</div>
            <div class="score-value" style="color: ${getSeverityColor(riskScore.complianceRisk.severity)}">
                ${(riskScore.complianceRisk.score * 100).toFixed(1)}%
            </div>
            <span class="severity-badge" style="background: ${getSeverityColor(riskScore.complianceRisk.severity)}">
                ${riskScore.complianceRisk.severity.toUpperCase()}
            </span>
        </div>
    </div>

    <div class="card">
        <h2 class="section-title">Executive Summary</h2>
        <p>${riskScore.executiveSummary}</p>
    </div>

    <div class="card">
        <h2 class="section-title">Status & Action Required</h2>
        <div>
            <span class="status-badge ${riskScore.status === 'auto_approved' ? 'status-approved' : riskScore.status === 'review_recommended' ? 'status-review' : 'status-mandatory'}">
                ${riskScore.status.replace(/_/g, ' ').toUpperCase()}
            </span>
            <span class="status-badge ${riskScore.requiresHumanReview ? 'status-mandatory' : 'status-approved'}">
                ${riskScore.requiresHumanReview ? 'HUMAN REVIEW REQUIRED' : 'NO REVIEW REQUIRED'}
            </span>
        </div>
        ${riskScore.escalationReason ? `<p style="margin-top: 15px;"><strong>Escalation Reason:</strong> ${riskScore.escalationReason}</p>` : ''}
    </div>

    <div class="card">
        <h2 class="section-title">Recommendations</h2>
        <ul class="recommendations">
            ${riskScore.recommendations.map((rec) => `<li>${rec}</li>`).join('')}
        </ul>
    </div>

    <div class="card">
        <h2 class="section-title">Detailed Analysis</h2>
        <div class="narrative">${riskScore.detailedNarrative}</div>
    </div>

    <div class="card">
        <h2 class="section-title">Processing Metadata</h2>
        <table>
            <tr>
                <th>Property</th>
                <th>Value</th>
            </tr>
            <tr>
                <td>Agent Version</td>
                <td>${riskScore.processingMetadata.agentVersion}</td>
            </tr>
            <tr>
                <td>Processing Time</td>
                <td>${riskScore.processingMetadata.processingTimeMs}ms</td>
            </tr>
            <tr>
                <td>Model Used</td>
                <td>${riskScore.processingMetadata.modelUsed}</td>
            </tr>
            <tr>
                <td>Confidence Score</td>
                <td>${(riskScore.confidenceScore * 100).toFixed(1)}%</td>
            </tr>
        </table>
    </div>
</body>
</html>
    `.trim();
  }
}

"""
S3 Service for Risk Scoring Agent

Handles all S3 operations for storing risk reports and contract documents.
"""

import boto3
import json
from datetime import datetime
from typing import List

from types.risk_scoring_types import RiskScoreOutput, RiskSeverity


class S3Service:
    """S3 service for risk report storage"""

    def __init__(self, bucket_name: str, region: str = "us-east-1"):
        """
        Initialize S3 service

        Args:
            bucket_name: S3 bucket name
            region: AWS region
        """
        self.bucket_name = bucket_name
        self.region = region
        self.s3_client = boto3.client('s3', region_name=region)

    def save_risk_report(self, risk_score: RiskScoreOutput) -> str:
        """
        Save risk report to S3

        Args:
            risk_score: Risk score output

        Returns:
            S3 key of saved report
        """
        timestamp = datetime.utcnow().isoformat().replace(':', '-')
        key = f"risk-reports/{risk_score.contract_id}/{timestamp}/report.json"

        # Create comprehensive report
        report = {
            'metadata': {
                'report_type': 'Risk Scoring Report',
                'generated_at': risk_score.timestamp,
                'report_version': '1.0'
            },
            'contract_id': risk_score.contract_id,
            'risk_score': json.loads(risk_score.json()),
            'text_report': self._generate_text_report(risk_score)
        }

        try:
            self.s3_client.put_object(
                Bucket=self.bucket_name,
                Key=key,
                Body=json.dumps(report, indent=2),
                ContentType='application/json',
                Metadata={
                    'contract_id': risk_score.contract_id,
                    'composite_score': str(risk_score.composite_score),
                    'severity': risk_score.composite_severity.value,
                    'status': risk_score.status.value,
                    'requires_review': str(risk_score.requires_human_review)
                },
                ServerSideEncryption='AES256'
            )
            print(f"Risk report saved to S3: {key}")
            return key
        except Exception as e:
            print(f"Error saving risk report to S3: {e}")
            raise Exception(f"Failed to save risk report: {str(e)}")

    def save_risk_report_html(self, risk_score: RiskScoreOutput) -> str:
        """
        Save risk report as HTML

        Args:
            risk_score: Risk score output

        Returns:
            S3 key of saved HTML report
        """
        timestamp = datetime.utcnow().isoformat().replace(':', '-')
        key = f"risk-reports/{risk_score.contract_id}/{timestamp}/report.html"

        html = self._generate_html_report(risk_score)

        try:
            self.s3_client.put_object(
                Bucket=self.bucket_name,
                Key=key,
                Body=html,
                ContentType='text/html',
                Metadata={
                    'contract_id': risk_score.contract_id,
                    'composite_score': str(risk_score.composite_score),
                    'severity': risk_score.composite_severity.value
                },
                ServerSideEncryption='AES256'
            )
            print(f"HTML risk report saved to S3: {key}")
            return key
        except Exception as e:
            print(f"Error saving HTML risk report to S3: {e}")
            raise Exception(f"Failed to save HTML risk report: {str(e)}")

    def get_object(self, bucket: str, key: str) -> str:
        """
        Get object from S3

        Args:
            bucket: S3 bucket name
            key: Object key

        Returns:
            Object content as string
        """
        try:
            response = self.s3_client.get_object(Bucket=bucket, Key=key)
            return response['Body'].read().decode('utf-8')
        except Exception as e:
            print(f"Error getting object from S3: {e}")
            raise Exception(f"Failed to get object from S3: {str(e)}")

    def get_risk_report(self, key: str) -> dict:
        """
        Get risk report from S3

        Args:
            key: S3 object key

        Returns:
            Risk report dictionary
        """
        data = self.get_object(self.bucket_name, key)
        return json.loads(data)

    def list_contract_reports(self, contract_id: str) -> List[str]:
        """
        List all reports for a contract

        Args:
            contract_id: Contract identifier

        Returns:
            List of S3 keys
        """
        try:
            response = self.s3_client.list_objects_v2(
                Bucket=self.bucket_name,
                Prefix=f"risk-reports/{contract_id}/"
            )

            return [obj['Key'] for obj in response.get('Contents', [])]
        except Exception as e:
            print(f"Error listing contract reports: {e}")
            raise Exception(f"Failed to list contract reports: {str(e)}")

    def delete_risk_report(self, key: str) -> None:
        """
        Delete risk report

        Args:
            key: S3 object key
        """
        try:
            self.s3_client.delete_object(Bucket=self.bucket_name, Key=key)
            print(f"Risk report deleted from S3: {key}")
        except Exception as e:
            print(f"Error deleting risk report: {e}")
            raise Exception(f"Failed to delete risk report: {str(e)}")

    def _generate_text_report(self, risk_score: RiskScoreOutput) -> str:
        """Generate text report"""
        lines = [
            "=" * 80,
            "CONTRACT RISK SCORING REPORT",
            "=" * 80,
            "",
            f"Contract ID: {risk_score.contract_id}",
            f"Generated: {risk_score.timestamp}",
            "",
            "-" * 80,
            "EXECUTIVE SUMMARY",
            "-" * 80,
            risk_score.executive_summary,
            "",
            "-" * 80,
            "RISK SCORES",
            "-" * 80,
            f"Legal Risk:      {risk_score.legal_risk.score * 100:.1f}% ({risk_score.legal_risk.severity.value.upper()})",
            f"Financial Risk:  {risk_score.financial_risk.score * 100:.1f}% ({risk_score.financial_risk.severity.value.upper()})",
            f"Compliance Risk: {risk_score.compliance_risk.score * 100:.1f}% ({risk_score.compliance_risk.severity.value.upper()})",
            "",
            f"COMPOSITE SCORE: {risk_score.composite_score * 100:.1f}% ({risk_score.composite_severity.value.upper()})",
            "",
            "-" * 80,
            "STATUS AND RECOMMENDATIONS",
            "-" * 80,
            f"Status: {risk_score.status.value.upper()}",
            f"Requires Human Review: {'YES' if risk_score.requires_human_review else 'NO'}",
        ]

        if risk_score.escalation_reason:
            lines.append(f"Escalation Reason: {risk_score.escalation_reason}")

        lines.extend([
            "",
            "Recommendations:",
        ])

        for idx, rec in enumerate(risk_score.recommendations, 1):
            lines.append(f"  {idx}. {rec}")

        lines.extend([
            "",
            "-" * 80,
            "DETAILED ANALYSIS",
            "-" * 80,
            risk_score.detailed_narrative,
            "",
            "=" * 80,
            "END OF REPORT",
            "=" * 80
        ])

        return "\n".join(lines)

    def _generate_html_report(self, risk_score: RiskScoreOutput) -> str:
        """Generate HTML report"""

        def get_severity_color(severity: str) -> str:
            colors = {
                'low': '#28a745',
                'medium': '#ffc107',
                'high': '#dc3545',
                'critical': '#8b0000'
            }
            return colors.get(severity.lower(), '#6c757d')

        score_percent = f"{risk_score.composite_score * 100:.1f}"
        severity_color = get_severity_color(risk_score.composite_severity.value)

        # Generate recommendations HTML
        recommendations_html = "\n".join(
            f"<li>{rec}</li>" for rec in risk_score.recommendations
        )

        html = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Risk Scoring Report - {risk_score.contract_id}</title>
    <style>
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
        }}
        .header {{
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            border-radius: 8px;
            margin-bottom: 30px;
        }}
        .header h1 {{ margin: 0; font-size: 28px; }}
        .contract-id {{ font-size: 14px; opacity: 0.9; margin-top: 10px; }}
        .card {{
            background: white;
            border-radius: 8px;
            padding: 25px;
            margin-bottom: 20px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }}
        .score-container {{
            display: flex;
            justify-content: space-between;
            gap: 20px;
            margin-bottom: 30px;
        }}
        .score-card {{
            flex: 1;
            text-align: center;
            padding: 20px;
            border-radius: 8px;
            background: white;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }}
        .score-label {{
            font-size: 14px;
            color: #666;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 10px;
        }}
        .score-value {{
            font-size: 36px;
            font-weight: bold;
            margin: 10px 0;
        }}
        .severity-badge {{
            display: inline-block;
            padding: 4px 12px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: bold;
            text-transform: uppercase;
            color: white;
        }}
        .composite-score {{
            background: {severity_color};
            color: white;
            padding: 30px;
            border-radius: 8px;
            text-align: center;
            margin-bottom: 30px;
        }}
        .composite-score .score-value {{ font-size: 48px; color: white; }}
        .section-title {{
            font-size: 20px;
            font-weight: 600;
            margin-bottom: 15px;
            padding-bottom: 10px;
            border-bottom: 2px solid #e0e0e0;
        }}
        .recommendations {{
            list-style: none;
            padding: 0;
        }}
        .recommendations li {{
            padding: 12px;
            margin-bottom: 10px;
            background: #f8f9fa;
            border-left: 4px solid #667eea;
            border-radius: 4px;
        }}
        .narrative {{
            white-space: pre-wrap;
            line-height: 1.8;
            background: #f8f9fa;
            padding: 20px;
            border-radius: 4px;
        }}
        .status-badge {{
            display: inline-block;
            padding: 8px 16px;
            border-radius: 4px;
            font-weight: 600;
            margin-right: 10px;
        }}
        .status-approved {{ background: #d4edda; color: #155724; }}
        .status-review {{ background: #fff3cd; color: #856404; }}
        .status-mandatory {{ background: #f8d7da; color: #721c24; }}
        table {{
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
        }}
        th, td {{
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #e0e0e0;
        }}
        th {{
            background: #f8f9fa;
            font-weight: 600;
        }}
    </style>
</head>
<body>
    <div class="header">
        <h1>Contract Risk Scoring Report</h1>
        <div class="contract-id">Contract ID: {risk_score.contract_id}</div>
        <div class="contract-id">Generated: {datetime.fromisoformat(risk_score.timestamp.replace('Z', '+00:00')).strftime('%Y-%m-%d %H:%M:%S UTC')}</div>
    </div>

    <div class="composite-score">
        <div class="score-label">Overall Composite Risk Score</div>
        <div class="score-value">{score_percent}%</div>
        <span class="severity-badge" style="background: rgba(255,255,255,0.3);">{risk_score.composite_severity.value.upper()} RISK</span>
    </div>

    <div class="score-container">
        <div class="score-card">
            <div class="score-label">Legal Risk</div>
            <div class="score-value" style="color: {get_severity_color(risk_score.legal_risk.severity.value)}">
                {risk_score.legal_risk.score * 100:.1f}%
            </div>
            <span class="severity-badge" style="background: {get_severity_color(risk_score.legal_risk.severity.value)}">
                {risk_score.legal_risk.severity.value.upper()}
            </span>
        </div>
        <div class="score-card">
            <div class="score-label">Financial Risk</div>
            <div class="score-value" style="color: {get_severity_color(risk_score.financial_risk.severity.value)}">
                {risk_score.financial_risk.score * 100:.1f}%
            </div>
            <span class="severity-badge" style="background: {get_severity_color(risk_score.financial_risk.severity.value)}">
                {risk_score.financial_risk.severity.value.upper()}
            </span>
        </div>
        <div class="score-card">
            <div class="score-label">Compliance Risk</div>
            <div class="score-value" style="color: {get_severity_color(risk_score.compliance_risk.severity.value)}">
                {risk_score.compliance_risk.score * 100:.1f}%
            </div>
            <span class="severity-badge" style="background: {get_severity_color(risk_score.compliance_risk.severity.value)}">
                {risk_score.compliance_risk.severity.value.upper()}
            </span>
        </div>
    </div>

    <div class="card">
        <h2 class="section-title">Executive Summary</h2>
        <p>{risk_score.executive_summary}</p>
    </div>

    <div class="card">
        <h2 class="section-title">Status & Action Required</h2>
        <div>
            <span class="status-badge {'status-approved' if risk_score.status == 'auto_approved' else 'status-review' if risk_score.status == 'review_recommended' else 'status-mandatory'}">
                {risk_score.status.value.replace('_', ' ').upper()}
            </span>
            <span class="status-badge {'status-mandatory' if risk_score.requires_human_review else 'status-approved'}">
                {'HUMAN REVIEW REQUIRED' if risk_score.requires_human_review else 'NO REVIEW REQUIRED'}
            </span>
        </div>
        {f'<p style="margin-top: 15px;"><strong>Escalation Reason:</strong> {risk_score.escalation_reason}</p>' if risk_score.escalation_reason else ''}
    </div>

    <div class="card">
        <h2 class="section-title">Recommendations</h2>
        <ul class="recommendations">
            {recommendations_html}
        </ul>
    </div>

    <div class="card">
        <h2 class="section-title">Detailed Analysis</h2>
        <div class="narrative">{risk_score.detailed_narrative}</div>
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
                <td>{risk_score.processing_metadata.agent_version}</td>
            </tr>
            <tr>
                <td>Processing Time</td>
                <td>{risk_score.processing_metadata.processing_time_ms:.2f}ms</td>
            </tr>
            <tr>
                <td>Model Used</td>
                <td>{risk_score.processing_metadata.model_used}</td>
            </tr>
            <tr>
                <td>Confidence Score</td>
                <td>{risk_score.confidence_score * 100:.1f}%</td>
            </tr>
        </table>
    </div>
</body>
</html>"""
        return html

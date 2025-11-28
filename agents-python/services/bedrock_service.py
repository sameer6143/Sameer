"""
Amazon Bedrock Service

Handles AI-powered narrative enhancement using Claude models via Amazon Bedrock.
"""

import boto3
import json
from typing import List

from types.risk_scoring_types import RiskScoreOutput


class BedrockService:
    """Amazon Bedrock service for AI-powered narrative generation"""

    def __init__(
        self,
        model_id: str = "anthropic.claude-v2",
        region: str = "us-east-1",
        max_tokens: int = 4096,
        temperature: float = 0.3
    ):
        """
        Initialize Bedrock service

        Args:
            model_id: Bedrock model ID
            region: AWS region
            max_tokens: Maximum tokens to generate
            temperature: Model temperature
        """
        self.model_id = model_id
        self.region = region
        self.max_tokens = max_tokens
        self.temperature = temperature
        self.client = boto3.client('bedrock-runtime', region_name=region)

    def enhance_narrative(
        self,
        original_narrative: str,
        risk_score: RiskScoreOutput
    ) -> str:
        """
        Enhance risk narrative using Claude

        Args:
            original_narrative: Original narrative text
            risk_score: Risk score output

        Returns:
            Enhanced narrative
        """
        prompt = self._build_narrative_prompt(original_narrative, risk_score)

        try:
            response = self._invoke_model(prompt)
            return response
        except Exception as e:
            print(f"Error enhancing narrative with Bedrock: {e}")
            # Return original narrative if enhancement fails
            return original_narrative

    def generate_executive_summary(self, risk_score: RiskScoreOutput) -> str:
        """
        Generate executive summary

        Args:
            risk_score: Risk score output

        Returns:
            Executive summary text
        """
        prompt = f"""You are a legal risk analyst. Based on the following risk scoring data, generate a concise 2-3 sentence executive summary for senior management.

Risk Scores:
- Legal Risk: {risk_score.legal_risk.score * 100:.1f}% ({risk_score.legal_risk.severity.value})
- Financial Risk: {risk_score.financial_risk.score * 100:.1f}% ({risk_score.financial_risk.severity.value})
- Compliance Risk: {risk_score.compliance_risk.score * 100:.1f}% ({risk_score.compliance_risk.severity.value})
- Overall: {risk_score.composite_score * 100:.1f}% ({risk_score.composite_severity.value})

Key Factors:
{self._format_risk_factors(risk_score)}

Generate an executive summary that is:
1. Concise and actionable
2. Highlights the most critical risks
3. Provides clear next steps

Executive Summary:"""

        try:
            return self._invoke_model(prompt)
        except Exception as e:
            print(f"Error generating executive summary: {e}")
            raise

    def generate_recommendations(self, risk_score: RiskScoreOutput) -> List[str]:
        """
        Generate recommendations

        Args:
            risk_score: Risk score output

        Returns:
            List of recommendations
        """
        prompt = f"""You are a legal risk advisor. Based on the following risk assessment, provide 3-5 specific, actionable recommendations.

Risk Assessment:
- Contract ID: {risk_score.contract_id}
- Overall Risk: {risk_score.composite_score * 100:.1f}% ({risk_score.composite_severity.value})
- Legal Risk: {risk_score.legal_risk.score * 100:.1f}% - {risk_score.legal_risk.narrative}
- Financial Risk: {risk_score.financial_risk.score * 100:.1f}% - {risk_score.financial_risk.narrative}
- Compliance Risk: {risk_score.compliance_risk.score * 100:.1f}% - {risk_score.compliance_risk.narrative}

Provide actionable recommendations in a numbered list format. Each recommendation should be specific and implementable.

Recommendations:"""

        try:
            response = self._invoke_model(prompt)
            # Parse numbered list into array
            recommendations = []
            for line in response.split('\n'):
                line = line.strip()
                if line and (line[0].isdigit() or line.startswith('-')):
                    # Remove numbering
                    rec = line.lstrip('0123456789.-) ').strip()
                    if rec:
                        recommendations.append(rec)
            return recommendations
        except Exception as e:
            print(f"Error generating recommendations: {e}")
            raise

    def analyze_clause_risk(self, clause_text: str, clause_type: str) -> dict:
        """
        Analyze contract clause and assess risk

        Args:
            clause_text: Clause text to analyze
            clause_type: Type of clause

        Returns:
            Dictionary with analysis results
        """
        prompt = f"""You are a legal contract analyst. Analyze the following {clause_type} clause and assess its risk level.

Clause Text:
{clause_text}

Provide:
1. Risk Level (Low/Medium/High/Critical)
2. Key concerns (if any)
3. Recommendations for improvement

Analysis:"""

        try:
            response = self._invoke_model(prompt)
            return {
                'clause_type': clause_type,
                'analysis': response
            }
        except Exception as e:
            print(f"Error analyzing clause risk: {e}")
            raise

    def _build_narrative_prompt(
        self,
        narrative: str,
        risk_score: RiskScoreOutput
    ) -> str:
        """Build narrative enhancement prompt"""
        return f"""You are a senior legal risk analyst. Your task is to enhance the following risk analysis narrative to make it more clear, comprehensive, and actionable for business stakeholders.

Contract ID: {risk_score.contract_id}
Overall Risk Score: {risk_score.composite_score * 100:.1f}% ({risk_score.composite_severity.value})

Current Narrative:
{narrative}

Risk Details:
- Legal Risk: {risk_score.legal_risk.score * 100:.1f}% ({risk_score.legal_risk.severity.value})
  Factors: {', '.join(f.name for f in risk_score.legal_risk.factors)}

- Financial Risk: {risk_score.financial_risk.score * 100:.1f}% ({risk_score.financial_risk.severity.value})
  Factors: {', '.join(f.name for f in risk_score.financial_risk.factors)}

- Compliance Risk: {risk_score.compliance_risk.score * 100:.1f}% ({risk_score.compliance_risk.severity.value})
  Factors: {', '.join(f.name for f in risk_score.compliance_risk.factors)}

Please enhance this narrative to:
1. Make it more readable and well-structured
2. Highlight critical risks prominently
3. Provide clear context for business impact
4. Maintain all factual information
5. Use professional legal and business terminology

Enhanced Narrative:"""

    def _format_risk_factors(self, risk_score: RiskScoreOutput) -> str:
        """Format risk factors for prompt"""
        factors = []

        if risk_score.legal_risk.factors:
            factors.append(
                f"Legal: {', '.join(f.name for f in risk_score.legal_risk.factors)}"
            )
        if risk_score.financial_risk.factors:
            factors.append(
                f"Financial: {', '.join(f.name for f in risk_score.financial_risk.factors)}"
            )
        if risk_score.compliance_risk.factors:
            factors.append(
                f"Compliance: {', '.join(f.name for f in risk_score.compliance_risk.factors)}"
            )

        return "\n".join(factors)

    def _invoke_model(self, prompt: str) -> str:
        """
        Invoke Bedrock model

        Args:
            prompt: Prompt text

        Returns:
            Model response
        """
        body = json.dumps({
            'anthropic_version': 'bedrock-2023-05-31',
            'max_tokens': self.max_tokens,
            'temperature': self.temperature,
            'messages': [
                {
                    'role': 'user',
                    'content': prompt
                }
            ]
        })

        try:
            response = self.client.invoke_model(
                modelId=self.model_id,
                contentType='application/json',
                accept='application/json',
                body=body
            )

            response_body = json.loads(response['body'].read())

            if 'content' in response_body and response_body['content']:
                return response_body['content'][0]['text']

            raise Exception('Invalid response from Bedrock')

        except Exception as e:
            print(f"Error invoking Bedrock model: {e}")
            raise Exception(f"Bedrock invocation failed: {str(e)}")

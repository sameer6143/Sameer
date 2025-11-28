"""
Risk Scoring Agent - Unit Tests

Comprehensive test suite for the Risk Scoring Agent (Python version)
"""

import pytest
import asyncio
from examples.sample_scenarios import (
    scenario_1_low_risk,
    scenario_2_medium_risk,
    scenario_3_high_risk
)
from core.risk_scoring_agent import RiskScoringAgent
from types.risk_scoring_types import (
    RiskSeverity,
    ContractStatus,
    RiskWeights,
    RiskThresholds
)


@pytest.mark.asyncio
class TestRiskScoringAgent:
    """Test suite for Risk Scoring Agent"""

    def setup_method(self):
        """Set up test fixtures"""
        self.agent = RiskScoringAgent()

    async def test_scenario_1_low_risk(self):
        """Test low risk contract scenario"""
        result = await self.agent.calculate_risk_score(scenario_1_low_risk)

        assert result.contract_id == "CONTRACT-2024-001-LOW"
        assert result.legal_risk.severity == RiskSeverity.LOW
        assert result.financial_risk.severity == RiskSeverity.LOW
        assert result.compliance_risk.severity == RiskSeverity.LOW
        assert result.composite_severity == RiskSeverity.LOW
        assert result.composite_score < 0.4
        assert result.status == ContractStatus.AUTO_APPROVED
        assert not result.requires_human_review

    async def test_scenario_2_medium_risk(self):
        """Test medium risk contract scenario"""
        result = await self.agent.calculate_risk_score(scenario_2_medium_risk)

        assert result.contract_id == "CONTRACT-2024-002-MEDIUM"
        assert result.composite_severity == RiskSeverity.MEDIUM
        assert 0.4 <= result.composite_score < 0.7
        assert result.status == ContractStatus.REVIEW_RECOMMENDED

    async def test_scenario_3_high_risk(self):
        """Test high risk contract scenario"""
        result = await self.agent.calculate_risk_score(scenario_3_high_risk)

        assert result.contract_id == "CONTRACT-2024-003-HIGH"
        assert result.composite_severity == RiskSeverity.HIGH
        assert result.composite_score >= 0.7
        assert result.status == ContractStatus.MANDATORY_REVIEW
        assert result.requires_human_review
        assert result.escalation_reason is not None

    async def test_custom_weights(self):
        """Test custom weights"""
        weights = RiskWeights(legal=0.5, financial=0.3, compliance=0.2)
        agent = RiskScoringAgent(weights=weights)

        result = await agent.calculate_risk_score(scenario_1_low_risk)
        assert result is not None

    async def test_composite_score_calculation(self):
        """Test composite score calculation"""
        result = await self.agent.calculate_risk_score(scenario_2_medium_risk)

        expected_composite = (
            result.legal_risk.score * 0.33 +
            result.financial_risk.score * 0.33 +
            result.compliance_risk.score * 0.34
        )

        assert abs(result.composite_score - expected_composite) < 0.01

    async def test_executive_summary_generation(self):
        """Test executive summary generation"""
        result = await self.agent.calculate_risk_score(scenario_1_low_risk)

        assert result.executive_summary is not None
        assert len(result.executive_summary) > 50
        assert 'risk' in result.executive_summary.lower()

    async def test_detailed_narrative(self):
        """Test detailed narrative generation"""
        result = await self.agent.calculate_risk_score(scenario_1_low_risk)

        assert 'Legal Risk Analysis' in result.detailed_narrative
        assert 'Financial Risk Analysis' in result.detailed_narrative
        assert 'Compliance Risk Analysis' in result.detailed_narrative

    async def test_recommendations(self):
        """Test recommendations generation"""
        result = await self.agent.calculate_risk_score(scenario_3_high_risk)

        assert len(result.recommendations) > 0
        assert any('escalat' in r.lower() for r in result.recommendations)

    async def test_processing_metadata(self):
        """Test processing metadata"""
        result = await self.agent.calculate_risk_score(scenario_1_low_risk)

        assert result.processing_metadata.agent_version is not None
        assert result.processing_metadata.processing_time_ms > 0
        assert result.processing_metadata.model_used is not None

    async def test_confidence_score(self):
        """Test confidence score calculation"""
        result = await self.agent.calculate_risk_score(scenario_1_low_risk)

        assert 0.0 <= result.confidence_score <= 1.0


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

"""
Risk Scoring Agent - Core Implementation

This agent evaluates the overall risk profile of a contract by analyzing
aggregated outputs from clause extraction, compliance check, and risk assessment agents.
"""

import time
from typing import List, Tuple
from datetime import datetime

from types.risk_scoring_types import (
    RiskScoringInput,
    RiskScoreOutput,
    RiskDimensionScore,
    RiskCategory,
    RiskSeverity,
    RiskFactor,
    ContractStatus,
    RiskWeights,
    RiskThresholds,
    ProcessingMetadata,
    IdentifiedRisk,
    ComplianceViolation,
)


class RiskScoringAgent:
    """Risk Scoring Agent for contract risk assessment"""

    AGENT_VERSION = "1.0.0"

    def __init__(
        self,
        weights: RiskWeights = None,
        thresholds: RiskThresholds = None
    ):
        """
        Initialize Risk Scoring Agent

        Args:
            weights: Custom risk weights (default: equal weights)
            thresholds: Custom risk thresholds (default: 0.4, 0.7, 1.0)
        """
        self.weights = weights or RiskWeights()
        self.thresholds = thresholds or RiskThresholds()
        self._normalize_weights()

    def _normalize_weights(self):
        """Normalize weights to ensure they sum to 1.0"""
        total = self.weights.legal + self.weights.financial + self.weights.compliance
        if abs(total - 1.0) > 0.001:
            self.weights.legal /= total
            self.weights.financial /= total
            self.weights.compliance /= total

    async def calculate_risk_score(self, input_data: RiskScoringInput) -> RiskScoreOutput:
        """
        Main entry point: Calculate comprehensive risk score

        Args:
            input_data: Input from upstream agents

        Returns:
            RiskScoreOutput with complete risk assessment
        """
        start_time = time.time()

        try:
            # Calculate individual dimension scores
            legal_risk = self._calculate_legal_risk(input_data)
            financial_risk = self._calculate_financial_risk(input_data)
            compliance_risk = self._calculate_compliance_risk(input_data)

            # Calculate composite score
            composite_score = self._calculate_composite_score(
                legal_risk.score,
                financial_risk.score,
                compliance_risk.score
            )

            # Determine severity and status
            composite_severity = self._determine_risk_severity(composite_score)
            status = self._determine_contract_status(composite_score)
            requires_human_review = self._should_escalate(composite_score, composite_severity)

            # Generate narratives
            executive_summary = self._generate_executive_summary(
                legal_risk, financial_risk, compliance_risk,
                composite_score, composite_severity
            )

            detailed_narrative = self._generate_detailed_narrative(
                legal_risk, financial_risk, compliance_risk, input_data
            )

            recommendations = self._generate_recommendations(
                legal_risk, financial_risk, compliance_risk, composite_severity
            )

            escalation_reason = (
                self._generate_escalation_reason(composite_severity, composite_score)
                if requires_human_review else None
            )

            # Calculate overall confidence
            confidence_score = self._calculate_confidence(
                legal_risk.confidence,
                financial_risk.confidence,
                compliance_risk.confidence
            )

            # Processing metadata
            processing_time_ms = (time.time() - start_time) * 1000
            processing_metadata = ProcessingMetadata(
                agent_version=self.AGENT_VERSION,
                processing_time_ms=processing_time_ms,
                model_used="Risk Scoring Engine v1.0",
                weights_applied=self.weights,
                thresholds_applied=self.thresholds
            )

            return RiskScoreOutput(
                contract_id=input_data.contract_id,
                timestamp=datetime.utcnow().isoformat(),
                legal_risk=legal_risk,
                financial_risk=financial_risk,
                compliance_risk=compliance_risk,
                composite_score=composite_score,
                composite_severity=composite_severity,
                executive_summary=executive_summary,
                detailed_narrative=detailed_narrative,
                recommendations=recommendations,
                status=status,
                requires_human_review=requires_human_review,
                escalation_reason=escalation_reason,
                confidence_score=confidence_score,
                processing_metadata=processing_metadata
            )

        except Exception as e:
            raise Exception(f"Risk scoring failed for contract {input_data.contract_id}: {str(e)}")

    def _calculate_legal_risk(self, input_data: RiskScoringInput) -> RiskDimensionScore:
        """Calculate Legal Risk Score"""
        factors: List[RiskFactor] = []
        total_impact = 0.0

        # Analyze legal risks from risk assessment
        legal_risks = [r for r in input_data.risk_assessment.identified_risks
                      if r.category == RiskCategory.LEGAL]

        for risk in legal_risks:
            impact = self._severity_to_score(risk.severity) * self._likelihood_to_multiplier(risk.likelihood)
            factors.append(RiskFactor(
                name=risk.title,
                impact=impact,
                description=risk.description,
                source="risk_assessment",
                source_reference=risk.risk_id
            ))
            total_impact += impact

        # Analyze key legal clauses
        legal_clause_types = ['indemnity', 'liability', 'dispute_resolution',
                             'termination', 'warranty', 'intellectual_property']
        legal_clauses = [c for c in input_data.clause_extraction.clauses
                        if any(t in c.clause_type.lower() for t in legal_clause_types)]

        # Check for missing critical legal clauses
        expected_legal_clauses = ['liability', 'indemnity', 'dispute_resolution']
        missing_clauses = [
            expected for expected in expected_legal_clauses
            if not any(expected in c.clause_type.lower() for c in legal_clauses)
        ]

        for missing_clause in missing_clauses:
            impact = 0.3
            factors.append(RiskFactor(
                name=f"Missing {missing_clause} clause",
                impact=impact,
                description=f"Contract lacks a {missing_clause} clause, increasing legal exposure",
                source="clause_extraction"
            ))
            total_impact += impact

        # Calculate normalized score
        score = min(total_impact / max(len(factors), 1), 1.0) if factors else 0.0
        severity = self._determine_risk_severity(score)
        confidence = 0.85 if factors else 0.5

        narrative = self._generate_legal_narrative(factors, score, severity, legal_risks)

        return RiskDimensionScore(
            category=RiskCategory.LEGAL,
            score=score,
            severity=severity,
            factors=factors,
            narrative=narrative,
            confidence=confidence
        )

    def _calculate_financial_risk(self, input_data: RiskScoringInput) -> RiskDimensionScore:
        """Calculate Financial Risk Score"""
        factors: List[RiskFactor] = []
        total_impact = 0.0

        # Analyze financial risks from risk assessment
        financial_risks = [r for r in input_data.risk_assessment.identified_risks
                          if r.category == RiskCategory.FINANCIAL]

        for risk in financial_risks:
            impact = self._severity_to_score(risk.severity) * self._likelihood_to_multiplier(risk.likelihood)
            factors.append(RiskFactor(
                name=risk.title,
                impact=impact,
                description=risk.description,
                source="risk_assessment",
                source_reference=risk.risk_id
            ))
            total_impact += impact

        # Analyze financial clauses
        financial_clause_types = ['payment', 'penalty', 'pricing', 'late_fee',
                                 'liquidated_damages', 'financial_obligation']
        financial_clauses = [c for c in input_data.clause_extraction.clauses
                            if any(t in c.clause_type.lower() for t in financial_clause_types)]

        # Check for high-penalty clauses
        penalty_types = ['penalty', 'late_fee', 'liquidated_damages']
        penalty_clauses = [c for c in financial_clauses
                          if any(t in c.clause_type.lower() for t in penalty_types)]

        if penalty_clauses:
            impact = min(0.4 * len(penalty_clauses), 0.8)
            factors.append(RiskFactor(
                name="Penalty exposure",
                impact=impact,
                description=f"Contract contains {len(penalty_clauses)} penalty/liquidated damages clauses",
                source="clause_extraction"
            ))
            total_impact += impact

        # Analyze contract value if available
        if input_data.clause_extraction.metadata.contract_value:
            value = input_data.clause_extraction.metadata.contract_value
            if value > 1000000:
                impact = 0.3
                currency = input_data.clause_extraction.metadata.currency or 'USD'
                factors.append(RiskFactor(
                    name="High contract value",
                    impact=impact,
                    description=f"Contract value of {value} {currency} increases financial exposure",
                    source="clause_extraction"
                ))
                total_impact += impact

        # Calculate normalized score
        score = min(total_impact / max(len(factors), 1), 1.0) if factors else 0.0
        severity = self._determine_risk_severity(score)
        confidence = 0.8 if factors else 0.5

        narrative = self._generate_financial_narrative(factors, score, severity, financial_risks)

        return RiskDimensionScore(
            category=RiskCategory.FINANCIAL,
            score=score,
            severity=severity,
            factors=factors,
            narrative=narrative,
            confidence=confidence
        )

    def _calculate_compliance_risk(self, input_data: RiskScoringInput) -> RiskDimensionScore:
        """Calculate Compliance Risk Score"""
        factors: List[RiskFactor] = []
        total_impact = 0.0

        # Analyze compliance violations
        violations = input_data.compliance_check.violations

        for violation in violations:
            impact = self._severity_to_score(violation.severity)
            factors.append(RiskFactor(
                name=f"{violation.standard} violation: {violation.requirement}",
                impact=impact,
                description=violation.description,
                source="compliance_check",
                source_reference=violation.clause_reference
            ))
            total_impact += impact

        # Analyze compliance-related risks
        compliance_risks = [r for r in input_data.risk_assessment.identified_risks
                           if r.category == RiskCategory.COMPLIANCE]

        for risk in compliance_risks:
            impact = self._severity_to_score(risk.severity) * self._likelihood_to_multiplier(risk.likelihood)
            factors.append(RiskFactor(
                name=risk.title,
                impact=impact,
                description=risk.description,
                source="risk_assessment",
                source_reference=risk.risk_id
            ))
            total_impact += impact

        # Check for missing compliance frameworks
        compliance_clause_types = ['data_protection', 'privacy', 'gdpr', 'hipaa',
                                   'compliance', 'regulatory']
        compliance_clauses = [c for c in input_data.clause_extraction.clauses
                             if any(t in c.clause_type.lower() for t in compliance_clause_types)]

        if not compliance_clauses and violations:
            impact = 0.5
            factors.append(RiskFactor(
                name="Missing compliance clauses",
                impact=impact,
                description="Contract lacks explicit compliance and regulatory adherence clauses",
                source="clause_extraction"
            ))
            total_impact += impact

        # Calculate normalized score
        score = min(total_impact / max(len(factors), 1), 1.0) if factors else 0.0
        severity = self._determine_risk_severity(score)
        confidence = 0.9 if factors else 0.6

        narrative = self._generate_compliance_narrative(factors, score, severity, violations)

        return RiskDimensionScore(
            category=RiskCategory.COMPLIANCE,
            score=score,
            severity=severity,
            factors=factors,
            narrative=narrative,
            confidence=confidence
        )

    def _calculate_composite_score(self, legal: float, financial: float, compliance: float) -> float:
        """Calculate weighted composite score"""
        return (
            legal * self.weights.legal +
            financial * self.weights.financial +
            compliance * self.weights.compliance
        )

    def _determine_risk_severity(self, score: float) -> RiskSeverity:
        """Determine risk severity based on score"""
        if score >= self.thresholds.medium_risk:
            return RiskSeverity.HIGH
        elif score >= self.thresholds.low_risk:
            return RiskSeverity.MEDIUM
        else:
            return RiskSeverity.LOW

    def _determine_contract_status(self, composite_score: float) -> ContractStatus:
        """Determine contract status based on composite score"""
        if composite_score >= self.thresholds.medium_risk:
            return ContractStatus.MANDATORY_REVIEW
        elif composite_score >= self.thresholds.low_risk:
            return ContractStatus.REVIEW_RECOMMENDED
        else:
            return ContractStatus.AUTO_APPROVED

    def _should_escalate(self, score: float, severity: RiskSeverity) -> bool:
        """Determine if contract should be escalated to human review"""
        return score >= self.thresholds.medium_risk or severity == RiskSeverity.HIGH

    def _generate_executive_summary(
        self,
        legal_risk: RiskDimensionScore,
        financial_risk: RiskDimensionScore,
        compliance_risk: RiskDimensionScore,
        composite_score: float,
        composite_severity: RiskSeverity
    ) -> str:
        """Generate executive summary"""
        score_percent = f"{composite_score * 100:.1f}"
        severity_text = composite_severity.value.upper()

        summary = (
            f"Contract Risk Assessment Summary: Overall risk score is {score_percent}% "
            f"({severity_text} RISK). "
            f"Legal risk: {legal_risk.score * 100:.1f}% ({legal_risk.severity.value}), "
            f"Financial risk: {financial_risk.score * 100:.1f}% ({financial_risk.severity.value}), "
            f"Compliance risk: {compliance_risk.score * 100:.1f}% ({compliance_risk.severity.value}). "
            f"{self._get_actionable_insight(composite_severity)}"
        )
        return summary

    def _generate_detailed_narrative(
        self,
        legal_risk: RiskDimensionScore,
        financial_risk: RiskDimensionScore,
        compliance_risk: RiskDimensionScore,
        input_data: RiskScoringInput
    ) -> str:
        """Generate detailed narrative"""
        narrative_parts = [
            f"# Detailed Risk Analysis for Contract {input_data.contract_id}\n",
            f"## Legal Risk Analysis\n{legal_risk.narrative}\n",
            f"## Financial Risk Analysis\n{financial_risk.narrative}\n",
            f"## Compliance Risk Analysis\n{compliance_risk.narrative}\n",
            "## Contract Metadata",
            f"- Contract Type: {input_data.clause_extraction.metadata.contract_type}"
        ]

        if input_data.clause_extraction.metadata.jurisdiction:
            narrative_parts.append(f"- Jurisdiction: {input_data.clause_extraction.metadata.jurisdiction}")

        if input_data.clause_extraction.metadata.contract_value:
            currency = input_data.clause_extraction.metadata.currency or 'USD'
            narrative_parts.append(
                f"- Contract Value: {input_data.clause_extraction.metadata.contract_value} {currency}"
            )

        narrative_parts.append(f"- Parties: {', '.join(input_data.clause_extraction.metadata.parties)}")

        return "\n".join(narrative_parts)

    def _generate_legal_narrative(
        self,
        factors: List[RiskFactor],
        score: float,
        severity: RiskSeverity,
        risks: List[IdentifiedRisk]
    ) -> str:
        """Generate legal risk narrative"""
        if not factors:
            return "No significant legal risks identified. Contract contains standard legal protections."

        narrative = f"Legal risk score: {score * 100:.1f}% ({severity.value}). "
        narrative += f"{len(factors)} legal risk factor(s) identified: "
        narrative += ", ".join(f.name for f in factors) + ". "

        high_risks = [r for r in risks if r.severity in [RiskSeverity.HIGH, RiskSeverity.CRITICAL]]
        if high_risks:
            narrative += f"Critical concerns: {', '.join(r.title for r in high_risks)}. "

        return narrative

    def _generate_financial_narrative(
        self,
        factors: List[RiskFactor],
        score: float,
        severity: RiskSeverity,
        risks: List[IdentifiedRisk]
    ) -> str:
        """Generate financial risk narrative"""
        if not factors:
            return "No significant financial risks identified. Payment terms and financial obligations appear standard."

        narrative = f"Financial risk score: {score * 100:.1f}% ({severity.value}). "
        narrative += f"{len(factors)} financial risk factor(s) identified: "
        narrative += ", ".join(f.name for f in factors) + ". "

        high_risks = [r for r in risks if r.severity in [RiskSeverity.HIGH, RiskSeverity.CRITICAL]]
        if high_risks:
            narrative += f"Critical financial concerns: {', '.join(r.title for r in high_risks)}. "

        return narrative

    def _generate_compliance_narrative(
        self,
        factors: List[RiskFactor],
        score: float,
        severity: RiskSeverity,
        violations: List[ComplianceViolation]
    ) -> str:
        """Generate compliance risk narrative"""
        if not factors:
            return "No compliance violations identified. Contract meets required regulatory standards."

        narrative = f"Compliance risk score: {score * 100:.1f}% ({severity.value}). "
        narrative += f"{len(violations)} compliance violation(s) found: "

        violations_by_standard = {}
        for v in violations:
            violations_by_standard[v.standard] = violations_by_standard.get(v.standard, 0) + 1

        narrative += ", ".join(f"{std} ({count})" for std, count in violations_by_standard.items()) + ". "

        critical_violations = [v for v in violations if v.severity in [RiskSeverity.HIGH, RiskSeverity.CRITICAL]]
        if critical_violations:
            narrative += f"Critical violations require immediate attention: {', '.join(v.requirement for v in critical_violations)}. "

        return narrative

    def _generate_recommendations(
        self,
        legal_risk: RiskDimensionScore,
        financial_risk: RiskDimensionScore,
        compliance_risk: RiskDimensionScore,
        severity: RiskSeverity
    ) -> List[str]:
        """Generate recommendations"""
        recommendations = []

        # Legal recommendations
        if legal_risk.severity in [RiskSeverity.HIGH, RiskSeverity.CRITICAL]:
            recommendations.append("Engage legal counsel to review and strengthen legal protections")
            missing_clauses = [f for f in legal_risk.factors if "Missing" in f.name]
            if missing_clauses:
                recommendations.append(f"Add missing clauses: {', '.join(f.name for f in missing_clauses)}")

        # Financial recommendations
        if financial_risk.severity in [RiskSeverity.HIGH, RiskSeverity.CRITICAL]:
            recommendations.append("Review and negotiate financial terms to reduce exposure")
            penalty_factors = [f for f in financial_risk.factors if "penalty" in f.name.lower()]
            if penalty_factors:
                recommendations.append("Negotiate penalty caps and reasonable payment terms")

        # Compliance recommendations
        if compliance_risk.severity in [RiskSeverity.HIGH, RiskSeverity.CRITICAL]:
            recommendations.append("Address compliance violations before contract execution")
            recommendations.append("Consult compliance team to ensure regulatory adherence")

        # Overall recommendations
        if severity in [RiskSeverity.HIGH, RiskSeverity.CRITICAL]:
            recommendations.append("Mandatory escalation to senior management for approval")
            recommendations.append("Consider contract renegotiation or rejection")
        elif severity == RiskSeverity.MEDIUM:
            recommendations.append("Obtain additional review and validation from subject matter experts")

        return recommendations if recommendations else ["Contract approved with standard monitoring"]

    def _generate_escalation_reason(self, severity: RiskSeverity, score: float) -> str:
        """Generate escalation reason"""
        score_percent = f"{score * 100:.1f}"

        if severity == RiskSeverity.CRITICAL or score >= 0.9:
            return f"CRITICAL RISK: Overall risk score of {score_percent}% requires immediate executive review and approval."
        elif severity == RiskSeverity.HIGH or score >= self.thresholds.medium_risk:
            return f"HIGH RISK: Contract exceeds acceptable risk threshold ({score_percent}%). Mandatory human review required before approval."
        else:
            return f"MEDIUM RISK: Contract recommended for additional review and validation ({score_percent}%)."

    def _get_actionable_insight(self, severity: RiskSeverity) -> str:
        """Get actionable insight based on severity"""
        insights = {
            RiskSeverity.LOW: "This contract is suitable for auto-approval with standard monitoring.",
            RiskSeverity.MEDIUM: "Additional review recommended before approval.",
            RiskSeverity.HIGH: "Mandatory escalation to human reviewers required.",
            RiskSeverity.CRITICAL: "CRITICAL: Immediate executive review and intervention required."
        }
        return insights.get(severity, "Review status unclear.")

    def _calculate_confidence(self, legal: float, financial: float, compliance: float) -> float:
        """Calculate overall confidence score"""
        return (legal + financial + compliance) / 3

    def _severity_to_score(self, severity: RiskSeverity) -> float:
        """Convert severity enum to numeric score"""
        severity_map = {
            RiskSeverity.LOW: 0.25,
            RiskSeverity.MEDIUM: 0.5,
            RiskSeverity.HIGH: 0.75,
            RiskSeverity.CRITICAL: 1.0
        }
        return severity_map.get(severity, 0.5)

    def _likelihood_to_multiplier(self, likelihood: str) -> float:
        """Convert likelihood to multiplier"""
        likelihood_map = {
            "high": 1.0,
            "medium": 0.7,
            "low": 0.4
        }
        return likelihood_map.get(likelihood, 0.7)

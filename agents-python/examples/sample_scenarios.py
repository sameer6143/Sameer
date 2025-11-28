"""
Risk Scoring Agent - Sample Scenarios

These scenarios demonstrate the Risk Scoring Agent's behavior
for low, medium, and high-risk contracts as specified in the design document.
"""

import asyncio
from datetime import datetime

from core.risk_scoring_agent import RiskScoringAgent
from types.risk_scoring_types import (
    RiskScoringInput,
    ClauseExtractionOutput,
    ComplianceCheckOutput,
    RiskAssessmentOutput,
    ExtractedClause,
    ClauseLocation,
    ContractMetadata,
    ComplianceViolation,
    ComplianceCheck,
    IdentifiedRisk,
    RiskSeverity,
    RiskCategory
)


# Scenario 1: Low Risk Contract
scenario_1_low_risk = RiskScoringInput(
    contract_id="CONTRACT-2024-001-LOW",
    clause_extraction=ClauseExtractionOutput(
        contract_id="CONTRACT-2024-001-LOW",
        extracted_at=datetime.utcnow().isoformat(),
        metadata=ContractMetadata(
            contract_type="Software License Agreement",
            jurisdiction="Delaware, USA",
            effective_date="2024-01-01",
            expiration_date="2025-01-01",
            parties=["TCS Inc.", "Client Corp."],
            contract_value=50000.0,
            currency="USD"
        ),
        clauses=[
            ExtractedClause(
                clause_type="indemnity",
                content="Comprehensive indemnity clause with mutual protections...",
                location=ClauseLocation(page=5, section="8.1", paragraph=1),
                importance="high",
                tags=["legal_protection", "indemnity", "liability"]
            ),
            ExtractedClause(
                clause_type="liability",
                content="Liability capped at contract value with clear exclusions...",
                location=ClauseLocation(page=6, section="8.2", paragraph=1),
                importance="high",
                tags=["legal_protection", "liability_cap"]
            ),
            ExtractedClause(
                clause_type="dispute_resolution",
                content="Disputes resolved through binding arbitration...",
                location=ClauseLocation(page=10, section="12.1", paragraph=1),
                importance="medium",
                tags=["legal_protection", "arbitration"]
            ),
            ExtractedClause(
                clause_type="payment",
                content="Standard NET 30 payment terms...",
                location=ClauseLocation(page=3, section="4.1", paragraph=1),
                importance="medium",
                tags=["financial", "payment_terms"]
            ),
            ExtractedClause(
                clause_type="data_protection",
                content="GDPR-compliant data protection measures...",
                location=ClauseLocation(page=7, section="9.1", paragraph=1),
                importance="high",
                tags=["compliance", "gdpr", "data_protection"]
            )
        ]
    ),
    compliance_check=ComplianceCheckOutput(
        contract_id="CONTRACT-2024-001-LOW",
        checked_at=datetime.utcnow().isoformat(),
        overall_compliance=True,
        framework=["GDPR", "SOC2"],
        violations=[],
        passed_checks=[
            ComplianceCheck(
                standard="GDPR",
                requirement="Data protection measures",
                status="passed",
                clause_reference="Section 9.1"
            ),
            ComplianceCheck(
                standard="GDPR",
                requirement="Right to erasure",
                status="passed",
                clause_reference="Section 9.2"
            ),
            ComplianceCheck(
                standard="SOC2",
                requirement="Security controls",
                status="passed",
                clause_reference="Section 9.3"
            )
        ]
    ),
    risk_assessment=RiskAssessmentOutput(
        contract_id="CONTRACT-2024-001-LOW",
        assessed_at=datetime.utcnow().isoformat(),
        overall_risk_level=RiskSeverity.LOW,
        identified_risks=[
            IdentifiedRisk(
                risk_id="RISK-001",
                category=RiskCategory.LEGAL,
                title="Standard liability exposure",
                description="Liability capped at contract value, standard for this type of agreement",
                severity=RiskSeverity.LOW,
                impact="Low financial impact if liability is triggered",
                likelihood="low",
                mitigation="Liability cap and insurance coverage",
                clause_reference="Section 8.2"
            )
        ]
    )
)


# Scenario 2: Medium Risk Contract
scenario_2_medium_risk = RiskScoringInput(
    contract_id="CONTRACT-2024-002-MEDIUM",
    clause_extraction=ClauseExtractionOutput(
        contract_id="CONTRACT-2024-002-MEDIUM",
        extracted_at=datetime.utcnow().isoformat(),
        metadata=ContractMetadata(
            contract_type="Service Agreement",
            jurisdiction="New York, USA",
            effective_date="2024-02-01",
            expiration_date="2026-02-01",
            parties=["TCS Inc.", "Enterprise Client LLC"],
            contract_value=250000.0,
            currency="USD"
        ),
        clauses=[
            ExtractedClause(
                clause_type="indemnity",
                content="Limited indemnity with exclusions that may expose TCS...",
                location=ClauseLocation(page=8, section="10.1", paragraph=1),
                importance="high",
                tags=["legal_protection", "indemnity", "weak"]
            ),
            ExtractedClause(
                clause_type="payment",
                content="NET 60 payment terms with automatic renewal...",
                location=ClauseLocation(page=4, section="5.1", paragraph=1),
                importance="medium",
                tags=["financial", "payment_terms", "extended"]
            ),
            ExtractedClause(
                clause_type="penalty",
                content="Late delivery penalties up to 10% of contract value...",
                location=ClauseLocation(page=5, section="6.1", paragraph=1),
                importance="high",
                tags=["financial", "penalty", "liquidated_damages"]
            ),
            ExtractedClause(
                clause_type="data_protection",
                content="Basic data protection clause, 72-hour breach notification...",
                location=ClauseLocation(page=9, section="11.1", paragraph=1),
                importance="high",
                tags=["compliance", "data_protection", "breach_notification"]
            )
        ]
    ),
    compliance_check=ComplianceCheckOutput(
        contract_id="CONTRACT-2024-002-MEDIUM",
        checked_at=datetime.utcnow().isoformat(),
        overall_compliance=False,
        framework=["GDPR", "CCPA"],
        violations=[
            ComplianceViolation(
                standard="GDPR",
                requirement="Breach notification within 72 hours",
                severity=RiskSeverity.MEDIUM,
                description="Contract allows up to 72 hours for breach notification, which may not meet GDPR's 72-hour requirement when considering internal processing time",
                recommendation="Reduce breach notification period to 48 hours to ensure GDPR compliance",
                clause_reference="Section 11.1"
            ),
            ComplianceViolation(
                standard="CCPA",
                requirement="Consumer data rights",
                severity=RiskSeverity.MEDIUM,
                description="Contract lacks explicit provisions for CCPA consumer rights",
                recommendation="Add CCPA-specific consumer rights provisions"
            )
        ],
        passed_checks=[
            ComplianceCheck(
                standard="GDPR",
                requirement="Data processing agreement",
                status="passed",
                clause_reference="Section 11.2"
            )
        ]
    ),
    risk_assessment=RiskAssessmentOutput(
        contract_id="CONTRACT-2024-002-MEDIUM",
        assessed_at=datetime.utcnow().isoformat(),
        overall_risk_level=RiskSeverity.MEDIUM,
        identified_risks=[
            IdentifiedRisk(
                risk_id="RISK-101",
                category=RiskCategory.LEGAL,
                title="Weak indemnity provisions",
                description="Indemnity clause contains significant exclusions that may leave TCS exposed",
                severity=RiskSeverity.MEDIUM,
                impact="Potential unindemnified legal expenses",
                likelihood="medium",
                mitigation="Negotiate broader indemnity coverage",
                clause_reference="Section 10.1"
            ),
            IdentifiedRisk(
                risk_id="RISK-102",
                category=RiskCategory.FINANCIAL,
                title="Late delivery penalties",
                description="Penalties up to 10% of contract value ($25,000) for late delivery",
                severity=RiskSeverity.MEDIUM,
                impact="Up to $25,000 in penalties",
                likelihood="medium",
                mitigation="Implement strict project management and buffer time",
                clause_reference="Section 6.1"
            ),
            IdentifiedRisk(
                risk_id="RISK-103",
                category=RiskCategory.COMPLIANCE,
                title="Delayed breach notification",
                description="72-hour breach notification may not meet GDPR requirements",
                severity=RiskSeverity.MEDIUM,
                impact="GDPR fines and regulatory action",
                likelihood="medium",
                mitigation="Reduce notification period to 48 hours",
                clause_reference="Section 11.1"
            )
        ]
    )
)


# Scenario 3: High Risk Contract (truncated for brevity - see full implementation in TypeScript version)
scenario_3_high_risk = RiskScoringInput(
    contract_id="CONTRACT-2024-003-HIGH",
    clause_extraction=ClauseExtractionOutput(
        contract_id="CONTRACT-2024-003-HIGH",
        extracted_at=datetime.utcnow().isoformat(),
        metadata=ContractMetadata(
            contract_type="Master Services Agreement",
            jurisdiction="California, USA",
            effective_date="2024-03-01",
            expiration_date="2027-03-01",
            parties=["TCS Inc.", "MegaCorp International"],
            contract_value=5000000.0,
            currency="USD"
        ),
        clauses=[
            ExtractedClause(
                clause_type="termination",
                content="Client may terminate for convenience with 30-day notice...",
                location=ClauseLocation(page=12, section="15.1", paragraph=1),
                importance="high",
                tags=["legal", "termination", "convenience"]
            ),
            ExtractedClause(
                clause_type="penalty",
                content="Service level agreement penalties up to 25% of annual contract value per incident...",
                location=ClauseLocation(page=6, section="8.1", paragraph=1),
                importance="high",
                tags=["financial", "penalty", "sla", "critical"]
            ),
            ExtractedClause(
                clause_type="liquidated_damages",
                content="Liquidated damages for data breaches up to $1,000,000...",
                location=ClauseLocation(page=7, section="9.1", paragraph=1),
                importance="high",
                tags=["financial", "penalty", "liquidated_damages", "data_breach"]
            )
        ]
    ),
    compliance_check=ComplianceCheckOutput(
        contract_id="CONTRACT-2024-003-HIGH",
        checked_at=datetime.utcnow().isoformat(),
        overall_compliance=False,
        framework=["GDPR", "HIPAA", "SOC2"],
        violations=[
            ComplianceViolation(
                standard="GDPR",
                requirement="Data protection impact assessment",
                severity=RiskSeverity.HIGH,
                description="Contract completely lacks GDPR-compliant data protection clauses and DPIA requirements",
                recommendation="Add comprehensive GDPR compliance section including DPIA, data subject rights, and breach notification"
            ),
            ComplianceViolation(
                standard="HIPAA",
                requirement="Business Associate Agreement",
                severity=RiskSeverity.CRITICAL,
                description="Contract involves healthcare data but lacks required BAA",
                recommendation="Execute HIPAA-compliant Business Associate Agreement immediately"
            )
        ],
        passed_checks=[]
    ),
    risk_assessment=RiskAssessmentOutput(
        contract_id="CONTRACT-2024-003-HIGH",
        assessed_at=datetime.utcnow().isoformat(),
        overall_risk_level=RiskSeverity.HIGH,
        identified_risks=[
            IdentifiedRisk(
                risk_id="RISK-201",
                category=RiskCategory.LEGAL,
                title="Unlimited warranty liability",
                description="Warranty obligations with no liability cap expose TCS to unlimited financial risk",
                severity=RiskSeverity.HIGH,
                impact="Potentially unlimited financial exposure",
                likelihood="high",
                mitigation="CRITICAL: Negotiate liability cap at 2x annual contract value"
            ),
            IdentifiedRisk(
                risk_id="RISK-203",
                category=RiskCategory.FINANCIAL,
                title="Excessive SLA penalties",
                description="SLA penalties up to 25% of annual value ($1.25M) per incident",
                severity=RiskSeverity.HIGH,
                impact="Up to $1,250,000 per SLA breach",
                likelihood="high",
                mitigation="CRITICAL: Reduce penalty cap to 10% annually with incident limits"
            ),
            IdentifiedRisk(
                risk_id="RISK-206",
                category=RiskCategory.COMPLIANCE,
                title="Missing GDPR compliance",
                description="No GDPR compliance provisions despite European data processing",
                severity=RiskSeverity.CRITICAL,
                impact="GDPR fines up to €20M or 4% of revenue, plus contractual liability",
                likelihood="high",
                mitigation="CRITICAL: Add comprehensive GDPR compliance section and execute DPA"
            )
        ]
    )
)


async def run_all_scenarios():
    """Run all scenarios and display results"""
    print("=" * 80)
    print("Risk Scoring Agent - Sample Scenarios (Python)")
    print("=" * 80)
    print()

    agent = RiskScoringAgent()

    # Scenario 1: Low Risk
    print("SCENARIO 1: Low Risk Contract")
    print("-" * 80)
    result1 = await agent.calculate_risk_score(scenario_1_low_risk)
    display_scenario_result(result1)
    print()

    # Scenario 2: Medium Risk
    print("SCENARIO 2: Medium Risk Contract")
    print("-" * 80)
    result2 = await agent.calculate_risk_score(scenario_2_medium_risk)
    display_scenario_result(result2)
    print()

    # Scenario 3: High Risk
    print("SCENARIO 3: High Risk Contract")
    print("-" * 80)
    result3 = await agent.calculate_risk_score(scenario_3_high_risk)
    display_scenario_result(result3)
    print()

    print("=" * 80)
    print("All scenarios completed")
    print("=" * 80)


def display_scenario_result(result):
    """Display scenario result"""
    print(f"Contract ID: {result.contract_id}")
    print(f"Legal Risk: {result.legal_risk.score * 100:.1f}% ({result.legal_risk.severity.value})")
    print(f"Financial Risk: {result.financial_risk.score * 100:.1f}% ({result.financial_risk.severity.value})")
    print(f"Compliance Risk: {result.compliance_risk.score * 100:.1f}% ({result.compliance_risk.severity.value})")
    print(f"Overall Risk: {result.composite_score * 100:.1f}% ({result.composite_severity.value})")
    print(f"Status: {result.status.value}")
    print(f"Requires Human Review: {'YES' if result.requires_human_review else 'NO'}")
    if result.escalation_reason:
        print(f"Escalation Reason: {result.escalation_reason}")
    print(f"\nExecutive Summary:")
    print(result.executive_summary)


if __name__ == "__main__":
    asyncio.run(run_all_scenarios())

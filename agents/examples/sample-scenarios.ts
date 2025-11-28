/**
 * Sample Scenarios for Risk Scoring Agent
 *
 * These scenarios demonstrate the Risk Scoring Agent's behavior
 * for low, medium, and high-risk contracts as specified in the design document.
 */

import { RiskScoringAgent } from '../core/risk-scoring-agent';
import {
  RiskScoringInput,
  RiskSeverity,
  RiskCategory,
  ContractStatus,
} from '../types/risk-scoring.types';

/**
 * Scenario 1: Low Risk Contract
 *
 * Characteristics:
 * - No major compliance violations
 * - Strong indemnity clauses
 * - Standard payment terms
 *
 * Expected Output:
 * - Legal Risk: 0.2 (Low)
 * - Financial Risk: 0.1 (Low)
 * - Compliance Risk: 0.2 (Low)
 * - Overall Risk: ~0.17 (Low)
 * - Status: Auto-approved
 */
export const scenario1LowRisk: RiskScoringInput = {
  contractId: 'CONTRACT-2024-001-LOW',
  clauseExtraction: {
    contractId: 'CONTRACT-2024-001-LOW',
    extractedAt: new Date().toISOString(),
    metadata: {
      contractType: 'Software License Agreement',
      jurisdiction: 'Delaware, USA',
      effectiveDate: '2024-01-01',
      expirationDate: '2025-01-01',
      parties: ['TCS Inc.', 'Client Corp.'],
      contractValue: 50000,
      currency: 'USD',
    },
    clauses: [
      {
        clauseType: 'indemnity',
        content: 'Comprehensive indemnity clause with mutual protections...',
        location: { page: 5, section: '8.1', paragraph: 1 },
        importance: 'high',
        tags: ['legal_protection', 'indemnity', 'liability'],
      },
      {
        clauseType: 'liability',
        content: 'Liability capped at contract value with clear exclusions...',
        location: { page: 6, section: '8.2', paragraph: 1 },
        importance: 'high',
        tags: ['legal_protection', 'liability_cap'],
      },
      {
        clauseType: 'dispute_resolution',
        content: 'Disputes resolved through binding arbitration...',
        location: { page: 10, section: '12.1', paragraph: 1 },
        importance: 'medium',
        tags: ['legal_protection', 'arbitration'],
      },
      {
        clauseType: 'payment',
        content: 'Standard NET 30 payment terms...',
        location: { page: 3, section: '4.1', paragraph: 1 },
        importance: 'medium',
        tags: ['financial', 'payment_terms'],
      },
      {
        clauseType: 'data_protection',
        content: 'GDPR-compliant data protection measures...',
        location: { page: 7, section: '9.1', paragraph: 1 },
        importance: 'high',
        tags: ['compliance', 'gdpr', 'data_protection'],
      },
    ],
  },
  complianceCheck: {
    contractId: 'CONTRACT-2024-001-LOW',
    checkedAt: new Date().toISOString(),
    overallCompliance: true,
    framework: ['GDPR', 'SOC2'],
    violations: [],
    passedChecks: [
      {
        standard: 'GDPR',
        requirement: 'Data protection measures',
        status: 'passed',
        clauseReference: 'Section 9.1',
      },
      {
        standard: 'GDPR',
        requirement: 'Right to erasure',
        status: 'passed',
        clauseReference: 'Section 9.2',
      },
      {
        standard: 'SOC2',
        requirement: 'Security controls',
        status: 'passed',
        clauseReference: 'Section 9.3',
      },
    ],
  },
  riskAssessment: {
    contractId: 'CONTRACT-2024-001-LOW',
    assessedAt: new Date().toISOString(),
    overallRiskLevel: RiskSeverity.LOW,
    identifiedRisks: [
      {
        riskId: 'RISK-001',
        category: RiskCategory.LEGAL,
        title: 'Standard liability exposure',
        description: 'Liability capped at contract value, standard for this type of agreement',
        severity: RiskSeverity.LOW,
        impact: 'Low financial impact if liability is triggered',
        likelihood: 'low',
        mitigation: 'Liability cap and insurance coverage',
        clauseReference: 'Section 8.2',
      },
    ],
  },
};

/**
 * Scenario 2: Medium Risk Contract
 *
 * Characteristics:
 * - Weak liability clauses
 * - Delayed breach notification
 *
 * Expected Output:
 * - Legal Risk: 0.5 (Medium)
 * - Financial Risk: 0.4 (Medium)
 * - Compliance Risk: 0.6 (Medium)
 * - Overall Risk: ~0.5 (Medium)
 * - Status: Review recommended
 */
export const scenario2MediumRisk: RiskScoringInput = {
  contractId: 'CONTRACT-2024-002-MEDIUM',
  clauseExtraction: {
    contractId: 'CONTRACT-2024-002-MEDIUM',
    extractedAt: new Date().toISOString(),
    metadata: {
      contractType: 'Service Agreement',
      jurisdiction: 'New York, USA',
      effectiveDate: '2024-02-01',
      expirationDate: '2026-02-01',
      parties: ['TCS Inc.', 'Enterprise Client LLC'],
      contractValue: 250000,
      currency: 'USD',
    },
    clauses: [
      {
        clauseType: 'indemnity',
        content: 'Limited indemnity with exclusions that may expose TCS...',
        location: { page: 8, section: '10.1', paragraph: 1 },
        importance: 'high',
        tags: ['legal_protection', 'indemnity', 'weak'],
      },
      {
        clauseType: 'payment',
        content: 'NET 60 payment terms with automatic renewal...',
        location: { page: 4, section: '5.1', paragraph: 1 },
        importance: 'medium',
        tags: ['financial', 'payment_terms', 'extended'],
      },
      {
        clauseType: 'penalty',
        content: 'Late delivery penalties up to 10% of contract value...',
        location: { page: 5, section: '6.1', paragraph: 1 },
        importance: 'high',
        tags: ['financial', 'penalty', 'liquidated_damages'],
      },
      {
        clauseType: 'data_protection',
        content: 'Basic data protection clause, 72-hour breach notification...',
        location: { page: 9, section: '11.1', paragraph: 1 },
        importance: 'high',
        tags: ['compliance', 'data_protection', 'breach_notification'],
      },
    ],
  },
  complianceCheck: {
    contractId: 'CONTRACT-2024-002-MEDIUM',
    checkedAt: new Date().toISOString(),
    overallCompliance: false,
    framework: ['GDPR', 'CCPA'],
    violations: [
      {
        standard: 'GDPR',
        requirement: 'Breach notification within 72 hours',
        severity: RiskSeverity.MEDIUM,
        description: 'Contract allows up to 72 hours for breach notification, which may not meet GDPR\'s 72-hour requirement when considering internal processing time',
        recommendation: 'Reduce breach notification period to 48 hours to ensure GDPR compliance',
        clauseReference: 'Section 11.1',
      },
      {
        standard: 'CCPA',
        requirement: 'Consumer data rights',
        severity: RiskSeverity.MEDIUM,
        description: 'Contract lacks explicit provisions for CCPA consumer rights',
        recommendation: 'Add CCPA-specific consumer rights provisions',
      },
    ],
    passedChecks: [
      {
        standard: 'GDPR',
        requirement: 'Data processing agreement',
        status: 'passed',
        clauseReference: 'Section 11.2',
      },
    ],
  },
  riskAssessment: {
    contractId: 'CONTRACT-2024-002-MEDIUM',
    assessedAt: new Date().toISOString(),
    overallRiskLevel: RiskSeverity.MEDIUM,
    identifiedRisks: [
      {
        riskId: 'RISK-101',
        category: RiskCategory.LEGAL,
        title: 'Weak indemnity provisions',
        description: 'Indemnity clause contains significant exclusions that may leave TCS exposed',
        severity: RiskSeverity.MEDIUM,
        impact: 'Potential unindemnified legal expenses',
        likelihood: 'medium',
        mitigation: 'Negotiate broader indemnity coverage',
        clauseReference: 'Section 10.1',
      },
      {
        riskId: 'RISK-102',
        category: RiskCategory.FINANCIAL,
        title: 'Late delivery penalties',
        description: 'Penalties up to 10% of contract value ($25,000) for late delivery',
        severity: RiskSeverity.MEDIUM,
        impact: 'Up to $25,000 in penalties',
        likelihood: 'medium',
        mitigation: 'Implement strict project management and buffer time',
        clauseReference: 'Section 6.1',
      },
      {
        riskId: 'RISK-103',
        category: RiskCategory.COMPLIANCE,
        title: 'Delayed breach notification',
        description: '72-hour breach notification may not meet GDPR requirements',
        severity: RiskSeverity.MEDIUM,
        impact: 'GDPR fines and regulatory action',
        likelihood: 'medium',
        mitigation: 'Reduce notification period to 48 hours',
        clauseReference: 'Section 11.1',
      },
    ],
  },
};

/**
 * Scenario 3: High Risk Contract
 *
 * Characteristics:
 * - Missing GDPR compliance terms
 * - High penalty exposure
 *
 * Expected Output:
 * - Legal Risk: 0.7 (High)
 * - Financial Risk: 0.8 (High)
 * - Compliance Risk: 0.9 (High)
 * - Overall Risk: ~0.8 (High)
 * - Status: Mandatory escalation to HITL
 */
export const scenario3HighRisk: RiskScoringInput = {
  contractId: 'CONTRACT-2024-003-HIGH',
  clauseExtraction: {
    contractId: 'CONTRACT-2024-003-HIGH',
    extractedAt: new Date().toISOString(),
    metadata: {
      contractType: 'Master Services Agreement',
      jurisdiction: 'California, USA',
      effectiveDate: '2024-03-01',
      expirationDate: '2027-03-01',
      parties: ['TCS Inc.', 'MegaCorp International'],
      contractValue: 5000000,
      currency: 'USD',
    },
    clauses: [
      {
        clauseType: 'termination',
        content: 'Client may terminate for convenience with 30-day notice...',
        location: { page: 12, section: '15.1', paragraph: 1 },
        importance: 'high',
        tags: ['legal', 'termination', 'convenience'],
      },
      {
        clauseType: 'payment',
        content: 'Payment terms NET 90 with performance holdbacks...',
        location: { page: 5, section: '7.1', paragraph: 1 },
        importance: 'high',
        tags: ['financial', 'payment_terms', 'extended', 'holdback'],
      },
      {
        clauseType: 'penalty',
        content: 'Service level agreement penalties up to 25% of annual contract value per incident...',
        location: { page: 6, section: '8.1', paragraph: 1 },
        importance: 'high',
        tags: ['financial', 'penalty', 'sla', 'critical'],
      },
      {
        clauseType: 'liquidated_damages',
        content: 'Liquidated damages for data breaches up to $1,000,000...',
        location: { page: 7, section: '9.1', paragraph: 1 },
        importance: 'high',
        tags: ['financial', 'penalty', 'liquidated_damages', 'data_breach'],
      },
      {
        clauseType: 'warranty',
        content: 'Unlimited warranty obligations with no liability cap...',
        location: { page: 10, section: '12.1', paragraph: 1 },
        importance: 'high',
        tags: ['legal', 'warranty', 'unlimited_liability'],
      },
    ],
  },
  complianceCheck: {
    contractId: 'CONTRACT-2024-003-HIGH',
    checkedAt: new Date().toISOString(),
    overallCompliance: false,
    framework: ['GDPR', 'HIPAA', 'SOC2'],
    violations: [
      {
        standard: 'GDPR',
        requirement: 'Data protection impact assessment',
        severity: RiskSeverity.HIGH,
        description: 'Contract completely lacks GDPR-compliant data protection clauses and DPIA requirements',
        recommendation: 'Add comprehensive GDPR compliance section including DPIA, data subject rights, and breach notification',
      },
      {
        standard: 'GDPR',
        requirement: 'Data processing agreement',
        severity: RiskSeverity.HIGH,
        description: 'No data processing agreement (DPA) included',
        recommendation: 'Execute a separate DPA compliant with GDPR Article 28',
      },
      {
        standard: 'HIPAA',
        requirement: 'Business Associate Agreement',
        severity: RiskSeverity.CRITICAL,
        description: 'Contract involves healthcare data but lacks required BAA',
        recommendation: 'Execute HIPAA-compliant Business Associate Agreement immediately',
      },
      {
        standard: 'SOC2',
        requirement: 'Security controls documentation',
        severity: RiskSeverity.MEDIUM,
        description: 'Insufficient documentation of security controls and audit rights',
        recommendation: 'Add SOC2 compliance requirements and audit rights',
      },
    ],
    passedChecks: [],
  },
  riskAssessment: {
    contractId: 'CONTRACT-2024-003-HIGH',
    assessedAt: new Date().toISOString(),
    overallRiskLevel: RiskSeverity.HIGH,
    identifiedRisks: [
      {
        riskId: 'RISK-201',
        category: RiskCategory.LEGAL,
        title: 'Unlimited warranty liability',
        description: 'Warranty obligations with no liability cap expose TCS to unlimited financial risk',
        severity: RiskSeverity.HIGH,
        impact: 'Potentially unlimited financial exposure',
        likelihood: 'high',
        mitigation: 'CRITICAL: Negotiate liability cap at 2x annual contract value',
        clauseReference: 'Section 12.1',
      },
      {
        riskId: 'RISK-202',
        category: RiskCategory.LEGAL,
        title: 'Termination for convenience',
        description: 'Client can terminate without cause, leaving TCS with unrecovered costs',
        severity: RiskSeverity.MEDIUM,
        impact: 'Loss of expected revenue and unrecovered investment',
        likelihood: 'medium',
        mitigation: 'Negotiate termination fees and minimum commitment period',
        clauseReference: 'Section 15.1',
      },
      {
        riskId: 'RISK-203',
        category: RiskCategory.FINANCIAL,
        title: 'Excessive SLA penalties',
        description: 'SLA penalties up to 25% of annual value ($1.25M) per incident',
        severity: RiskSeverity.HIGH,
        impact: 'Up to $1,250,000 per SLA breach',
        likelihood: 'high',
        mitigation: 'CRITICAL: Reduce penalty cap to 10% annually with incident limits',
        clauseReference: 'Section 8.1',
      },
      {
        riskId: 'RISK-204',
        category: RiskCategory.FINANCIAL,
        title: 'Data breach liquidated damages',
        description: 'Liquidated damages of $1M for data breaches',
        severity: RiskSeverity.HIGH,
        impact: '$1,000,000 per breach incident',
        likelihood: 'medium',
        mitigation: 'Negotiate lower damages and ensure adequate cyber insurance',
        clauseReference: 'Section 9.1',
      },
      {
        riskId: 'RISK-205',
        category: RiskCategory.FINANCIAL,
        title: 'Extended payment terms with holdbacks',
        description: 'NET 90 terms with performance holdbacks delay cash flow',
        severity: RiskSeverity.MEDIUM,
        impact: 'Significant working capital impact on $5M contract',
        likelihood: 'high',
        mitigation: 'Negotiate NET 60 and reduce holdback percentage',
        clauseReference: 'Section 7.1',
      },
      {
        riskId: 'RISK-206',
        category: RiskCategory.COMPLIANCE,
        title: 'Missing GDPR compliance',
        description: 'No GDPR compliance provisions despite European data processing',
        severity: RiskSeverity.CRITICAL,
        impact: 'GDPR fines up to €20M or 4% of revenue, plus contractual liability',
        likelihood: 'high',
        mitigation: 'CRITICAL: Add comprehensive GDPR compliance section and execute DPA',
      },
      {
        riskId: 'RISK-207',
        category: RiskCategory.COMPLIANCE,
        title: 'Missing HIPAA BAA',
        description: 'Contract involves healthcare data but lacks required Business Associate Agreement',
        severity: RiskSeverity.CRITICAL,
        impact: 'HIPAA violations, fines up to $50,000 per violation, and criminal liability',
        likelihood: 'high',
        mitigation: 'CRITICAL: Execute HIPAA-compliant BAA before contract execution',
      },
    ],
  },
};

/**
 * Run all scenarios and display results
 */
export async function runAllScenarios(): Promise<void> {
  console.log('='.repeat(80));
  console.log('Risk Scoring Agent - Sample Scenarios');
  console.log('='.repeat(80));
  console.log('');

  const agent = new RiskScoringAgent();

  // Scenario 1: Low Risk
  console.log('SCENARIO 1: Low Risk Contract');
  console.log('-'.repeat(80));
  const result1 = await agent.calculateRiskScore(scenario1LowRisk);
  displayScenarioResult(result1);
  console.log('');

  // Scenario 2: Medium Risk
  console.log('SCENARIO 2: Medium Risk Contract');
  console.log('-'.repeat(80));
  const result2 = await agent.calculateRiskScore(scenario2MediumRisk);
  displayScenarioResult(result2);
  console.log('');

  // Scenario 3: High Risk
  console.log('SCENARIO 3: High Risk Contract');
  console.log('-'.repeat(80));
  const result3 = await agent.calculateRiskScore(scenario3HighRisk);
  displayScenarioResult(result3);
  console.log('');

  console.log('='.repeat(80));
  console.log('All scenarios completed');
  console.log('='.repeat(80));
}

/**
 * Display scenario result
 */
function displayScenarioResult(result: any): void {
  console.log(`Contract ID: ${result.contractId}`);
  console.log(`Legal Risk: ${(result.legalRisk.score * 100).toFixed(1)}% (${result.legalRisk.severity})`);
  console.log(`Financial Risk: ${(result.financialRisk.score * 100).toFixed(1)}% (${result.financialRisk.severity})`);
  console.log(`Compliance Risk: ${(result.complianceRisk.score * 100).toFixed(1)}% (${result.complianceRisk.severity})`);
  console.log(`Overall Risk: ${(result.compositeScore * 100).toFixed(1)}% (${result.compositeSeverity})`);
  console.log(`Status: ${result.status}`);
  console.log(`Requires Human Review: ${result.requiresHumanReview ? 'YES' : 'NO'}`);
  if (result.escalationReason) {
    console.log(`Escalation Reason: ${result.escalationReason}`);
  }
  console.log(`\nExecutive Summary:`);
  console.log(result.executiveSummary);
}

// Export scenarios for testing
export const scenarios = {
  lowRisk: scenario1LowRisk,
  mediumRisk: scenario2MediumRisk,
  highRisk: scenario3HighRisk,
};

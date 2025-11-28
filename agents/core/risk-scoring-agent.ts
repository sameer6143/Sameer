/**
 * Risk Scoring Agent - Core Implementation
 *
 * This agent evaluates the overall risk profile of a contract by analyzing
 * aggregated outputs from clause extraction, compliance check, and risk assessment agents.
 */

import {
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
} from '../types/risk-scoring.types';

/**
 * Default configuration values
 */
const DEFAULT_WEIGHTS: RiskWeights = {
  legal: 0.33,
  financial: 0.33,
  compliance: 0.34,
};

const DEFAULT_THRESHOLDS: RiskThresholds = {
  lowRisk: 0.4,
  mediumRisk: 0.7,
  highRisk: 1.0,
};

/**
 * Risk Scoring Agent Class
 */
export class RiskScoringAgent {
  private weights: RiskWeights;
  private thresholds: RiskThresholds;
  private readonly agentVersion = '1.0.0';

  constructor(
    weights: RiskWeights = DEFAULT_WEIGHTS,
    thresholds: RiskThresholds = DEFAULT_THRESHOLDS
  ) {
    this.weights = this.normalizeWeights(weights);
    this.thresholds = thresholds;
  }

  /**
   * Main entry point: Calculate comprehensive risk score
   */
  public async calculateRiskScore(
    input: RiskScoringInput
  ): Promise<RiskScoreOutput> {
    const startTime = Date.now();

    try {
      // Calculate individual dimension scores
      const legalRisk = this.calculateLegalRisk(input);
      const financialRisk = this.calculateFinancialRisk(input);
      const complianceRisk = this.calculateComplianceRisk(input);

      // Calculate composite score
      const compositeScore = this.calculateCompositeScore(
        legalRisk.score,
        financialRisk.score,
        complianceRisk.score
      );

      // Determine severity and status
      const compositeSeverity = this.determineRiskSeverity(compositeScore);
      const status = this.determineContractStatus(compositeScore);
      const requiresHumanReview = this.shouldEscalate(compositeScore, compositeSeverity);

      // Generate narratives
      const executiveSummary = this.generateExecutiveSummary(
        legalRisk,
        financialRisk,
        complianceRisk,
        compositeScore,
        compositeSeverity
      );

      const detailedNarrative = this.generateDetailedNarrative(
        legalRisk,
        financialRisk,
        complianceRisk,
        input
      );

      const recommendations = this.generateRecommendations(
        legalRisk,
        financialRisk,
        complianceRisk,
        compositeSeverity
      );

      const escalationReason = requiresHumanReview
        ? this.generateEscalationReason(compositeSeverity, compositeScore)
        : undefined;

      // Calculate overall confidence
      const confidenceScore = this.calculateConfidence(
        legalRisk.confidence,
        financialRisk.confidence,
        complianceRisk.confidence
      );

      // Processing metadata
      const processingMetadata: ProcessingMetadata = {
        agentVersion: this.agentVersion,
        processingTimeMs: Date.now() - startTime,
        modelUsed: 'Risk Scoring Engine v1.0',
        weightsApplied: this.weights,
        thresholdsApplied: this.thresholds,
      };

      return {
        contractId: input.contractId,
        timestamp: new Date().toISOString(),
        legalRisk,
        financialRisk,
        complianceRisk,
        compositeScore,
        compositeSeverity,
        executiveSummary,
        detailedNarrative,
        recommendations,
        status,
        requiresHumanReview,
        escalationReason,
        confidenceScore,
        processingMetadata,
      };
    } catch (error) {
      throw new Error(
        `Risk scoring failed for contract ${input.contractId}: ${error.message}`
      );
    }
  }

  /**
   * Calculate Legal Risk Score
   */
  private calculateLegalRisk(input: RiskScoringInput): RiskDimensionScore {
    const factors: RiskFactor[] = [];
    let totalImpact = 0;

    // Analyze legal risks from risk assessment
    const legalRisks = input.riskAssessment.identifiedRisks.filter(
      (risk) => risk.category === RiskCategory.LEGAL
    );

    for (const risk of legalRisks) {
      const impact = this.severityToScore(risk.severity) * this.likelihoodToMultiplier(risk.likelihood);
      factors.push({
        name: risk.title,
        impact,
        description: risk.description,
        source: 'risk_assessment',
        sourceReference: risk.riskId,
      });
      totalImpact += impact;
    }

    // Analyze key legal clauses
    const legalClauses = input.clauseExtraction.clauses.filter((clause) =>
      ['indemnity', 'liability', 'dispute_resolution', 'termination', 'warranty', 'intellectual_property'].includes(
        clause.clauseType.toLowerCase()
      )
    );

    // Missing critical legal clauses increases risk
    const expectedLegalClauses = ['liability', 'indemnity', 'dispute_resolution'];
    const missingClauses = expectedLegalClauses.filter(
      (expected) =>
        !legalClauses.some((clause) =>
          clause.clauseType.toLowerCase().includes(expected)
        )
    );

    for (const missingClause of missingClauses) {
      const impact = 0.3; // Missing critical clause has moderate impact
      factors.push({
        name: `Missing ${missingClause} clause`,
        impact,
        description: `Contract lacks a ${missingClause} clause, increasing legal exposure`,
        source: 'clause_extraction',
      });
      totalImpact += impact;
    }

    // Calculate normalized score
    const score = Math.min(totalImpact / Math.max(factors.length, 1), 1.0);
    const severity = this.determineRiskSeverity(score);
    const confidence = factors.length > 0 ? 0.85 : 0.5;

    const narrative = this.generateLegalNarrative(factors, score, severity, legalRisks);

    return {
      category: RiskCategory.LEGAL,
      score,
      severity,
      factors,
      narrative,
      confidence,
    };
  }

  /**
   * Calculate Financial Risk Score
   */
  private calculateFinancialRisk(input: RiskScoringInput): RiskDimensionScore {
    const factors: RiskFactor[] = [];
    let totalImpact = 0;

    // Analyze financial risks from risk assessment
    const financialRisks = input.riskAssessment.identifiedRisks.filter(
      (risk) => risk.category === RiskCategory.FINANCIAL
    );

    for (const risk of financialRisks) {
      const impact = this.severityToScore(risk.severity) * this.likelihoodToMultiplier(risk.likelihood);
      factors.push({
        name: risk.title,
        impact,
        description: risk.description,
        source: 'risk_assessment',
        sourceReference: risk.riskId,
      });
      totalImpact += impact;
    }

    // Analyze financial clauses
    const financialClauses = input.clauseExtraction.clauses.filter((clause) =>
      ['payment', 'penalty', 'pricing', 'late_fee', 'liquidated_damages', 'financial_obligation'].includes(
        clause.clauseType.toLowerCase()
      )
    );

    // Check for high-penalty clauses
    const penaltyClauses = financialClauses.filter((clause) =>
      ['penalty', 'late_fee', 'liquidated_damages'].includes(clause.clauseType.toLowerCase())
    );

    if (penaltyClauses.length > 0) {
      const impact = 0.4 * penaltyClauses.length;
      factors.push({
        name: 'Penalty exposure',
        impact: Math.min(impact, 0.8),
        description: `Contract contains ${penaltyClauses.length} penalty/liquidated damages clauses`,
        source: 'clause_extraction',
      });
      totalImpact += Math.min(impact, 0.8);
    }

    // Analyze contract value if available
    if (input.clauseExtraction.metadata.contractValue) {
      const value = input.clauseExtraction.metadata.contractValue;
      if (value > 1000000) {
        // High-value contracts carry more financial risk
        const impact = 0.3;
        factors.push({
          name: 'High contract value',
          impact,
          description: `Contract value of ${value} ${input.clauseExtraction.metadata.currency || 'USD'} increases financial exposure`,
          source: 'clause_extraction',
        });
        totalImpact += impact;
      }
    }

    // Calculate normalized score
    const score = Math.min(totalImpact / Math.max(factors.length, 1), 1.0);
    const severity = this.determineRiskSeverity(score);
    const confidence = factors.length > 0 ? 0.8 : 0.5;

    const narrative = this.generateFinancialNarrative(factors, score, severity, financialRisks);

    return {
      category: RiskCategory.FINANCIAL,
      score,
      severity,
      factors,
      narrative,
      confidence,
    };
  }

  /**
   * Calculate Compliance Risk Score
   */
  private calculateComplianceRisk(input: RiskScoringInput): RiskDimensionScore {
    const factors: RiskFactor[] = [];
    let totalImpact = 0;

    // Analyze compliance violations
    const violations = input.complianceCheck.violations;

    for (const violation of violations) {
      const impact = this.severityToScore(violation.severity);
      factors.push({
        name: `${violation.standard} violation: ${violation.requirement}`,
        impact,
        description: violation.description,
        source: 'compliance_check',
        sourceReference: violation.clauseReference,
      });
      totalImpact += impact;
    }

    // Analyze compliance-related risks
    const complianceRisks = input.riskAssessment.identifiedRisks.filter(
      (risk) => risk.category === RiskCategory.COMPLIANCE
    );

    for (const risk of complianceRisks) {
      const impact = this.severityToScore(risk.severity) * this.likelihoodToMultiplier(risk.likelihood);
      factors.push({
        name: risk.title,
        impact,
        description: risk.description,
        source: 'risk_assessment',
        sourceReference: risk.riskId,
      });
      totalImpact += impact;
    }

    // Check for missing compliance frameworks
    const complianceClauses = input.clauseExtraction.clauses.filter((clause) =>
      ['data_protection', 'privacy', 'gdpr', 'hipaa', 'compliance', 'regulatory'].includes(
        clause.clauseType.toLowerCase()
      )
    );

    if (complianceClauses.length === 0 && input.complianceCheck.violations.length > 0) {
      const impact = 0.5;
      factors.push({
        name: 'Missing compliance clauses',
        impact,
        description: 'Contract lacks explicit compliance and regulatory adherence clauses',
        source: 'clause_extraction',
      });
      totalImpact += impact;
    }

    // Calculate normalized score
    const score = Math.min(totalImpact / Math.max(factors.length, 1), 1.0);
    const severity = this.determineRiskSeverity(score);
    const confidence = factors.length > 0 ? 0.9 : 0.6;

    const narrative = this.generateComplianceNarrative(factors, score, severity, violations);

    return {
      category: RiskCategory.COMPLIANCE,
      score,
      severity,
      factors,
      narrative,
      confidence,
    };
  }

  /**
   * Calculate weighted composite score
   */
  private calculateCompositeScore(
    legalScore: number,
    financialScore: number,
    complianceScore: number
  ): number {
    return (
      legalScore * this.weights.legal +
      financialScore * this.weights.financial +
      complianceScore * this.weights.compliance
    );
  }

  /**
   * Determine risk severity based on score
   */
  private determineRiskSeverity(score: number): RiskSeverity {
    if (score >= this.thresholds.mediumRisk) {
      return RiskSeverity.HIGH;
    } else if (score >= this.thresholds.lowRisk) {
      return RiskSeverity.MEDIUM;
    } else {
      return RiskSeverity.LOW;
    }
  }

  /**
   * Determine contract status based on composite score
   */
  private determineContractStatus(compositeScore: number): ContractStatus {
    if (compositeScore >= this.thresholds.mediumRisk) {
      return ContractStatus.MANDATORY_REVIEW;
    } else if (compositeScore >= this.thresholds.lowRisk) {
      return ContractStatus.REVIEW_RECOMMENDED;
    } else {
      return ContractStatus.AUTO_APPROVED;
    }
  }

  /**
   * Determine if contract should be escalated to human review
   */
  private shouldEscalate(score: number, severity: RiskSeverity): boolean {
    return score >= this.thresholds.mediumRisk || severity === RiskSeverity.HIGH;
  }

  /**
   * Generate executive summary
   */
  private generateExecutiveSummary(
    legalRisk: RiskDimensionScore,
    financialRisk: RiskDimensionScore,
    complianceRisk: RiskDimensionScore,
    compositeScore: number,
    compositeSeverity: RiskSeverity
  ): string {
    const scorePercent = (compositeScore * 100).toFixed(1);
    const severityText = compositeSeverity.toUpperCase();

    return `Contract Risk Assessment Summary: Overall risk score is ${scorePercent}% (${severityText} RISK). ` +
      `Legal risk: ${(legalRisk.score * 100).toFixed(1)}% (${legalRisk.severity}), ` +
      `Financial risk: ${(financialRisk.score * 100).toFixed(1)}% (${financialRisk.severity}), ` +
      `Compliance risk: ${(complianceRisk.score * 100).toFixed(1)}% (${complianceRisk.severity}). ` +
      this.getActionableInsight(compositeSeverity);
  }

  /**
   * Generate detailed narrative
   */
  private generateDetailedNarrative(
    legalRisk: RiskDimensionScore,
    financialRisk: RiskDimensionScore,
    complianceRisk: RiskDimensionScore,
    input: RiskScoringInput
  ): string {
    let narrative = `# Detailed Risk Analysis for Contract ${input.contractId}\n\n`;

    narrative += `## Legal Risk Analysis\n${legalRisk.narrative}\n\n`;
    narrative += `## Financial Risk Analysis\n${financialRisk.narrative}\n\n`;
    narrative += `## Compliance Risk Analysis\n${complianceRisk.narrative}\n\n`;

    narrative += `## Contract Metadata\n`;
    narrative += `- Contract Type: ${input.clauseExtraction.metadata.contractType}\n`;
    if (input.clauseExtraction.metadata.jurisdiction) {
      narrative += `- Jurisdiction: ${input.clauseExtraction.metadata.jurisdiction}\n`;
    }
    if (input.clauseExtraction.metadata.contractValue) {
      narrative += `- Contract Value: ${input.clauseExtraction.metadata.contractValue} ${input.clauseExtraction.metadata.currency || 'USD'}\n`;
    }
    narrative += `- Parties: ${input.clauseExtraction.metadata.parties.join(', ')}\n`;

    return narrative;
  }

  /**
   * Generate legal risk narrative
   */
  private generateLegalNarrative(
    factors: RiskFactor[],
    score: number,
    severity: RiskSeverity,
    risks: IdentifiedRisk[]
  ): string {
    if (factors.length === 0) {
      return 'No significant legal risks identified. Contract contains standard legal protections.';
    }

    let narrative = `Legal risk score: ${(score * 100).toFixed(1)}% (${severity}). `;
    narrative += `${factors.length} legal risk factor(s) identified: `;
    narrative += factors.map((f) => f.name).join(', ') + '. ';

    if (risks.length > 0) {
      const highRisks = risks.filter((r) => r.severity === RiskSeverity.HIGH || r.severity === RiskSeverity.CRITICAL);
      if (highRisks.length > 0) {
        narrative += `Critical concerns: ${highRisks.map((r) => r.title).join(', ')}. `;
      }
    }

    return narrative;
  }

  /**
   * Generate financial risk narrative
   */
  private generateFinancialNarrative(
    factors: RiskFactor[],
    score: number,
    severity: RiskSeverity,
    risks: IdentifiedRisk[]
  ): string {
    if (factors.length === 0) {
      return 'No significant financial risks identified. Payment terms and financial obligations appear standard.';
    }

    let narrative = `Financial risk score: ${(score * 100).toFixed(1)}% (${severity}). `;
    narrative += `${factors.length} financial risk factor(s) identified: `;
    narrative += factors.map((f) => f.name).join(', ') + '. ';

    if (risks.length > 0) {
      const highRisks = risks.filter((r) => r.severity === RiskSeverity.HIGH || r.severity === RiskSeverity.CRITICAL);
      if (highRisks.length > 0) {
        narrative += `Critical financial concerns: ${highRisks.map((r) => r.title).join(', ')}. `;
      }
    }

    return narrative;
  }

  /**
   * Generate compliance risk narrative
   */
  private generateComplianceNarrative(
    factors: RiskFactor[],
    score: number,
    severity: RiskSeverity,
    violations: ComplianceViolation[]
  ): string {
    if (factors.length === 0) {
      return 'No compliance violations identified. Contract meets required regulatory standards.';
    }

    let narrative = `Compliance risk score: ${(score * 100).toFixed(1)}% (${severity}). `;
    narrative += `${violations.length} compliance violation(s) found: `;

    const violationsByStandard = violations.reduce((acc, v) => {
      acc[v.standard] = (acc[v.standard] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    narrative += Object.entries(violationsByStandard)
      .map(([standard, count]) => `${standard} (${count})`)
      .join(', ') + '. ';

    const criticalViolations = violations.filter(
      (v) => v.severity === RiskSeverity.HIGH || v.severity === RiskSeverity.CRITICAL
    );
    if (criticalViolations.length > 0) {
      narrative += `Critical violations require immediate attention: ${criticalViolations.map((v) => v.requirement).join(', ')}. `;
    }

    return narrative;
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(
    legalRisk: RiskDimensionScore,
    financialRisk: RiskDimensionScore,
    complianceRisk: RiskDimensionScore,
    severity: RiskSeverity
  ): string[] {
    const recommendations: string[] = [];

    // Legal recommendations
    if (legalRisk.severity === RiskSeverity.HIGH || legalRisk.severity === RiskSeverity.CRITICAL) {
      recommendations.push('Engage legal counsel to review and strengthen legal protections');
      const missingClauses = legalRisk.factors.filter((f) => f.name.includes('Missing'));
      if (missingClauses.length > 0) {
        recommendations.push(`Add missing clauses: ${missingClauses.map((f) => f.name).join(', ')}`);
      }
    }

    // Financial recommendations
    if (financialRisk.severity === RiskSeverity.HIGH || financialRisk.severity === RiskSeverity.CRITICAL) {
      recommendations.push('Review and negotiate financial terms to reduce exposure');
      const penaltyFactors = financialRisk.factors.filter((f) => f.name.toLowerCase().includes('penalty'));
      if (penaltyFactors.length > 0) {
        recommendations.push('Negotiate penalty caps and reasonable payment terms');
      }
    }

    // Compliance recommendations
    if (complianceRisk.severity === RiskSeverity.HIGH || complianceRisk.severity === RiskSeverity.CRITICAL) {
      recommendations.push('Address compliance violations before contract execution');
      recommendations.push('Consult compliance team to ensure regulatory adherence');
    }

    // Overall recommendations
    if (severity === RiskSeverity.HIGH || severity === RiskSeverity.CRITICAL) {
      recommendations.push('Mandatory escalation to senior management for approval');
      recommendations.push('Consider contract renegotiation or rejection');
    } else if (severity === RiskSeverity.MEDIUM) {
      recommendations.push('Obtain additional review and validation from subject matter experts');
    }

    return recommendations.length > 0 ? recommendations : ['Contract approved with standard monitoring'];
  }

  /**
   * Generate escalation reason
   */
  private generateEscalationReason(severity: RiskSeverity, score: number): string {
    if (severity === RiskSeverity.CRITICAL || score >= 0.9) {
      return `CRITICAL RISK: Overall risk score of ${(score * 100).toFixed(1)}% requires immediate executive review and approval.`;
    } else if (severity === RiskSeverity.HIGH || score >= this.thresholds.mediumRisk) {
      return `HIGH RISK: Contract exceeds acceptable risk threshold (${(score * 100).toFixed(1)}%). Mandatory human review required before approval.`;
    } else {
      return `MEDIUM RISK: Contract recommended for additional review and validation (${(score * 100).toFixed(1)}%).`;
    }
  }

  /**
   * Get actionable insight based on severity
   */
  private getActionableInsight(severity: RiskSeverity): string {
    switch (severity) {
      case RiskSeverity.LOW:
        return 'This contract is suitable for auto-approval with standard monitoring.';
      case RiskSeverity.MEDIUM:
        return 'Additional review recommended before approval.';
      case RiskSeverity.HIGH:
        return 'Mandatory escalation to human reviewers required.';
      case RiskSeverity.CRITICAL:
        return 'CRITICAL: Immediate executive review and intervention required.';
      default:
        return 'Review status unclear.';
    }
  }

  /**
   * Calculate overall confidence score
   */
  private calculateConfidence(
    legalConfidence: number,
    financialConfidence: number,
    complianceConfidence: number
  ): number {
    return (legalConfidence + financialConfidence + complianceConfidence) / 3;
  }

  /**
   * Convert severity enum to numeric score
   */
  private severityToScore(severity: RiskSeverity): number {
    switch (severity) {
      case RiskSeverity.LOW:
        return 0.25;
      case RiskSeverity.MEDIUM:
        return 0.5;
      case RiskSeverity.HIGH:
        return 0.75;
      case RiskSeverity.CRITICAL:
        return 1.0;
      default:
        return 0.5;
    }
  }

  /**
   * Convert likelihood to multiplier
   */
  private likelihoodToMultiplier(likelihood: 'high' | 'medium' | 'low'): number {
    switch (likelihood) {
      case 'high':
        return 1.0;
      case 'medium':
        return 0.7;
      case 'low':
        return 0.4;
      default:
        return 0.7;
    }
  }

  /**
   * Normalize weights to ensure they sum to 1.0
   */
  private normalizeWeights(weights: RiskWeights): RiskWeights {
    const sum = weights.legal + weights.financial + weights.compliance;
    if (Math.abs(sum - 1.0) < 0.001) {
      return weights;
    }
    return {
      legal: weights.legal / sum,
      financial: weights.financial / sum,
      compliance: weights.compliance / sum,
    };
  }
}

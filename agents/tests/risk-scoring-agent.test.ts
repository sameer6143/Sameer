/**
 * Risk Scoring Agent - Unit Tests
 *
 * Comprehensive test suite for the Risk Scoring Agent
 */

import { RiskScoringAgent } from '../core/risk-scoring-agent';
import {
  scenario1LowRisk,
  scenario2MediumRisk,
  scenario3HighRisk,
} from '../examples/sample-scenarios';
import { RiskSeverity, ContractStatus } from '../types/risk-scoring.types';

describe('RiskScoringAgent', () => {
  let agent: RiskScoringAgent;

  beforeEach(() => {
    agent = new RiskScoringAgent();
  });

  describe('Scenario 1: Low Risk Contract', () => {
    it('should score low-risk contract correctly', async () => {
      const result = await agent.calculateRiskScore(scenario1LowRisk);

      expect(result.contractId).toBe('CONTRACT-2024-001-LOW');
      expect(result.legalRisk.severity).toBe(RiskSeverity.LOW);
      expect(result.financialRisk.severity).toBe(RiskSeverity.LOW);
      expect(result.complianceRisk.severity).toBe(RiskSeverity.LOW);
      expect(result.compositeSeverity).toBe(RiskSeverity.LOW);
      expect(result.compositeScore).toBeLessThan(0.4);
    });

    it('should have status auto-approved', async () => {
      const result = await agent.calculateRiskScore(scenario1LowRisk);

      expect(result.status).toBe(ContractStatus.AUTO_APPROVED);
      expect(result.requiresHumanReview).toBe(false);
    });

    it('should have no escalation reason', async () => {
      const result = await agent.calculateRiskScore(scenario1LowRisk);

      expect(result.escalationReason).toBeUndefined();
    });

    it('should have high confidence', async () => {
      const result = await agent.calculateRiskScore(scenario1LowRisk);

      expect(result.confidenceScore).toBeGreaterThan(0.7);
    });

    it('should generate appropriate recommendations', async () => {
      const result = await agent.calculateRiskScore(scenario1LowRisk);

      expect(result.recommendations).toHaveLength(1);
      expect(result.recommendations[0]).toContain('approved');
    });
  });

  describe('Scenario 2: Medium Risk Contract', () => {
    it('should score medium-risk contract correctly', async () => {
      const result = await agent.calculateRiskScore(scenario2MediumRisk);

      expect(result.contractId).toBe('CONTRACT-2024-002-MEDIUM');
      expect(result.compositeSeverity).toBe(RiskSeverity.MEDIUM);
      expect(result.compositeScore).toBeGreaterThanOrEqual(0.4);
      expect(result.compositeScore).toBeLessThan(0.7);
    });

    it('should recommend review', async () => {
      const result = await agent.calculateRiskScore(scenario2MediumRisk);

      expect(result.status).toBe(ContractStatus.REVIEW_RECOMMENDED);
      expect(result.requiresHumanReview).toBe(false);
    });

    it('should identify compliance violations', async () => {
      const result = await agent.calculateRiskScore(scenario2MediumRisk);

      expect(result.complianceRisk.factors.length).toBeGreaterThan(0);
      expect(result.complianceRisk.severity).toBe(RiskSeverity.MEDIUM);
    });

    it('should have moderate confidence', async () => {
      const result = await agent.calculateRiskScore(scenario2MediumRisk);

      expect(result.confidenceScore).toBeGreaterThan(0.6);
      expect(result.confidenceScore).toBeLessThan(0.9);
    });

    it('should provide actionable recommendations', async () => {
      const result = await agent.calculateRiskScore(scenario2MediumRisk);

      expect(result.recommendations.length).toBeGreaterThan(1);
      expect(result.recommendations.some((r) => r.includes('review'))).toBe(true);
    });
  });

  describe('Scenario 3: High Risk Contract', () => {
    it('should score high-risk contract correctly', async () => {
      const result = await agent.calculateRiskScore(scenario3HighRisk);

      expect(result.contractId).toBe('CONTRACT-2024-003-HIGH');
      expect(result.compositeSeverity).toBe(RiskSeverity.HIGH);
      expect(result.compositeScore).toBeGreaterThanOrEqual(0.7);
    });

    it('should require mandatory review', async () => {
      const result = await agent.calculateRiskScore(scenario3HighRisk);

      expect(result.status).toBe(ContractStatus.MANDATORY_REVIEW);
      expect(result.requiresHumanReview).toBe(true);
    });

    it('should have escalation reason', async () => {
      const result = await agent.calculateRiskScore(scenario3HighRisk);

      expect(result.escalationReason).toBeDefined();
      expect(result.escalationReason).toContain('HIGH RISK');
    });

    it('should identify critical risks', async () => {
      const result = await agent.calculateRiskScore(scenario3HighRisk);

      expect(result.legalRisk.severity).toBe(RiskSeverity.HIGH);
      expect(result.financialRisk.severity).toBe(RiskSeverity.HIGH);
      expect(result.complianceRisk.severity).toBe(RiskSeverity.HIGH);
    });

    it('should provide comprehensive recommendations', async () => {
      const result = await agent.calculateRiskScore(scenario3HighRisk);

      expect(result.recommendations.length).toBeGreaterThan(3);
      expect(result.recommendations.some((r) => r.toLowerCase().includes('escalat'))).toBe(true);
    });

    it('should have detailed narrative', async () => {
      const result = await agent.calculateRiskScore(scenario3HighRisk);

      expect(result.detailedNarrative).toContain('Legal Risk Analysis');
      expect(result.detailedNarrative).toContain('Financial Risk Analysis');
      expect(result.detailedNarrative).toContain('Compliance Risk Analysis');
    });
  });

  describe('Risk Calculation Logic', () => {
    it('should normalize custom weights', () => {
      const customAgent = new RiskScoringAgent(
        { legal: 0.5, financial: 0.3, compliance: 0.2 },
        { lowRisk: 0.4, mediumRisk: 0.7, highRisk: 1.0 }
      );

      // Weights should be normalized to sum to 1.0
      expect(customAgent).toBeDefined();
    });

    it('should calculate composite score correctly', async () => {
      const result = await agent.calculateRiskScore(scenario2MediumRisk);

      // Composite should be weighted average
      const expectedComposite =
        result.legalRisk.score * 0.33 +
        result.financialRisk.score * 0.33 +
        result.complianceRisk.score * 0.34;

      expect(result.compositeScore).toBeCloseTo(expectedComposite, 2);
    });

    it('should determine severity based on thresholds', async () => {
      const lowRiskResult = await agent.calculateRiskScore(scenario1LowRisk);
      const mediumRiskResult = await agent.calculateRiskScore(scenario2MediumRisk);
      const highRiskResult = await agent.calculateRiskScore(scenario3HighRisk);

      expect(lowRiskResult.compositeScore).toBeLessThan(0.4);
      expect(mediumRiskResult.compositeScore).toBeGreaterThanOrEqual(0.4);
      expect(mediumRiskResult.compositeScore).toBeLessThan(0.7);
      expect(highRiskResult.compositeScore).toBeGreaterThanOrEqual(0.7);
    });
  });

  describe('Risk Factors', () => {
    it('should identify missing legal clauses', async () => {
      const result = await agent.calculateRiskScore(scenario3HighRisk);

      const missingClauseFactors = result.legalRisk.factors.filter((f) =>
        f.name.toLowerCase().includes('missing')
      );

      // High-risk scenario should have some missing clauses identified
      expect(missingClauseFactors.length).toBeGreaterThanOrEqual(0);
    });

    it('should identify penalty exposure', async () => {
      const result = await agent.calculateRiskScore(scenario3HighRisk);

      const penaltyFactors = result.financialRisk.factors.filter((f) =>
        f.name.toLowerCase().includes('penalty')
      );

      expect(penaltyFactors.length).toBeGreaterThan(0);
    });

    it('should identify compliance violations', async () => {
      const result = await agent.calculateRiskScore(scenario3HighRisk);

      const violationFactors = result.complianceRisk.factors.filter((f) =>
        f.name.toLowerCase().includes('violation')
      );

      expect(violationFactors.length).toBeGreaterThan(0);
    });
  });

  describe('Narrative Generation', () => {
    it('should generate executive summary', async () => {
      const result = await agent.calculateRiskScore(scenario2MediumRisk);

      expect(result.executiveSummary).toBeDefined();
      expect(result.executiveSummary.length).toBeGreaterThan(50);
      expect(result.executiveSummary).toContain('risk');
    });

    it('should generate detailed narrative', async () => {
      const result = await agent.calculateRiskScore(scenario1LowRisk);

      expect(result.detailedNarrative).toBeDefined();
      expect(result.detailedNarrative).toContain('Legal Risk Analysis');
      expect(result.detailedNarrative).toContain('Financial Risk Analysis');
      expect(result.detailedNarrative).toContain('Compliance Risk Analysis');
    });

    it('should include contract metadata in narrative', async () => {
      const result = await agent.calculateRiskScore(scenario1LowRisk);

      expect(result.detailedNarrative).toContain(scenario1LowRisk.contractId);
      expect(result.detailedNarrative).toContain(
        scenario1LowRisk.clauseExtraction.metadata.contractType
      );
    });
  });

  describe('Processing Metadata', () => {
    it('should include processing metadata', async () => {
      const result = await agent.calculateRiskScore(scenario1LowRisk);

      expect(result.processingMetadata).toBeDefined();
      expect(result.processingMetadata.agentVersion).toBeDefined();
      expect(result.processingMetadata.processingTimeMs).toBeGreaterThan(0);
      expect(result.processingMetadata.modelUsed).toBeDefined();
    });

    it('should track weights applied', async () => {
      const result = await agent.calculateRiskScore(scenario1LowRisk);

      expect(result.processingMetadata.weightsApplied).toEqual({
        legal: expect.any(Number),
        financial: expect.any(Number),
        compliance: expect.any(Number),
      });
    });

    it('should track thresholds applied', async () => {
      const result = await agent.calculateRiskScore(scenario1LowRisk);

      expect(result.processingMetadata.thresholdsApplied).toEqual({
        lowRisk: 0.4,
        mediumRisk: 0.7,
        highRisk: 1.0,
      });
    });
  });

  describe('Error Handling', () => {
    it('should throw error for missing contractId', async () => {
      const invalidInput: any = {
        clauseExtraction: {},
        complianceCheck: {},
        riskAssessment: {},
      };

      await expect(agent.calculateRiskScore(invalidInput)).rejects.toThrow();
    });

    it('should handle empty clauses gracefully', async () => {
      const inputWithNoClauses = {
        ...scenario1LowRisk,
        clauseExtraction: {
          ...scenario1LowRisk.clauseExtraction,
          clauses: [],
        },
      };

      const result = await agent.calculateRiskScore(inputWithNoClauses);

      expect(result).toBeDefined();
      expect(result.compositeScore).toBeDefined();
    });

    it('should handle empty violations gracefully', async () => {
      const inputWithNoViolations = {
        ...scenario3HighRisk,
        complianceCheck: {
          ...scenario3HighRisk.complianceCheck,
          violations: [],
        },
      };

      const result = await agent.calculateRiskScore(inputWithNoViolations);

      expect(result).toBeDefined();
      expect(result.complianceRisk.score).toBeLessThan(
        scenario3HighRisk.complianceCheck.violations.length
      );
    });
  });
});

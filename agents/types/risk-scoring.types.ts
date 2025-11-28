/**
 * Risk Scoring Agent - Type Definitions
 *
 * This file contains all TypeScript interfaces and types for the Risk Scoring Agent system.
 */

/**
 * Severity levels for risk assessment
 */
export enum RiskSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

/**
 * Risk categories for scoring
 */
export enum RiskCategory {
  LEGAL = 'legal',
  FINANCIAL = 'financial',
  COMPLIANCE = 'compliance'
}

/**
 * Contract status after risk assessment
 */
export enum ContractStatus {
  AUTO_APPROVED = 'auto_approved',
  REVIEW_RECOMMENDED = 'review_recommended',
  MANDATORY_REVIEW = 'mandatory_review',
  REJECTED = 'rejected'
}

/**
 * Input from Clause Extractor Agent
 */
export interface ClauseExtractionOutput {
  contractId: string;
  clauses: ExtractedClause[];
  metadata: ContractMetadata;
  extractedAt: string;
}

/**
 * Individual extracted clause
 */
export interface ExtractedClause {
  clauseType: string;
  content: string;
  location: {
    page?: number;
    section?: string;
    paragraph?: number;
  };
  importance: 'high' | 'medium' | 'low';
  tags: string[];
}

/**
 * Contract metadata
 */
export interface ContractMetadata {
  contractType: string;
  jurisdiction?: string;
  effectiveDate?: string;
  expirationDate?: string;
  parties: string[];
  contractValue?: number;
  currency?: string;
}

/**
 * Input from Compliance Check Agent
 */
export interface ComplianceCheckOutput {
  contractId: string;
  overallCompliance: boolean;
  violations: ComplianceViolation[];
  passedChecks: ComplianceCheck[];
  framework: string[]; // e.g., ['GDPR', 'HIPAA', 'SOC2']
  checkedAt: string;
}

/**
 * Compliance violation details
 */
export interface ComplianceViolation {
  standard: string; // e.g., 'GDPR', 'HIPAA'
  requirement: string;
  severity: RiskSeverity;
  description: string;
  recommendation: string;
  clauseReference?: string;
}

/**
 * Passed compliance checks
 */
export interface ComplianceCheck {
  standard: string;
  requirement: string;
  status: 'passed' | 'partial' | 'not_applicable';
  clauseReference?: string;
}

/**
 * Input from Risk Assessment Agent
 */
export interface RiskAssessmentOutput {
  contractId: string;
  identifiedRisks: IdentifiedRisk[];
  overallRiskLevel: RiskSeverity;
  assessedAt: string;
}

/**
 * Individual identified risk
 */
export interface IdentifiedRisk {
  riskId: string;
  category: RiskCategory;
  title: string;
  description: string;
  severity: RiskSeverity;
  impact: string;
  likelihood: 'high' | 'medium' | 'low';
  mitigation?: string;
  clauseReference?: string;
}

/**
 * Complete input to Risk Scoring Agent
 */
export interface RiskScoringInput {
  contractId: string;
  clauseExtraction: ClauseExtractionOutput;
  complianceCheck: ComplianceCheckOutput;
  riskAssessment: RiskAssessmentOutput;
  customWeights?: RiskWeights;
}

/**
 * Configurable weights for risk scoring
 */
export interface RiskWeights {
  legal: number;      // Default: 0.33
  financial: number;  // Default: 0.33
  compliance: number; // Default: 0.34
}

/**
 * Individual risk dimension score
 */
export interface RiskDimensionScore {
  category: RiskCategory;
  score: number; // 0.0 to 1.0
  severity: RiskSeverity;
  factors: RiskFactor[];
  narrative: string;
  confidence: number; // 0.0 to 1.0
}

/**
 * Contributing risk factor
 */
export interface RiskFactor {
  name: string;
  impact: number; // 0.0 to 1.0
  description: string;
  source: 'clause_extraction' | 'compliance_check' | 'risk_assessment';
  sourceReference?: string;
}

/**
 * Complete Risk Score output
 */
export interface RiskScoreOutput {
  contractId: string;
  timestamp: string;

  // Individual dimension scores
  legalRisk: RiskDimensionScore;
  financialRisk: RiskDimensionScore;
  complianceRisk: RiskDimensionScore;

  // Overall composite score
  compositeScore: number; // 0.0 to 1.0
  compositeSeverity: RiskSeverity;

  // Narrative and recommendations
  executiveSummary: string;
  detailedNarrative: string;
  recommendations: string[];

  // Escalation and status
  status: ContractStatus;
  requiresHumanReview: boolean;
  escalationReason?: string;

  // Confidence and metadata
  confidenceScore: number; // 0.0 to 1.0
  reviewerNotes?: string;
  processingMetadata: ProcessingMetadata;
}

/**
 * Processing metadata
 */
export interface ProcessingMetadata {
  agentVersion: string;
  processingTimeMs: number;
  modelUsed: string;
  weightsApplied: RiskWeights;
  thresholdsApplied: RiskThresholds;
}

/**
 * Risk thresholds for escalation
 */
export interface RiskThresholds {
  lowRisk: number;      // Default: 0.4
  mediumRisk: number;   // Default: 0.7
  highRisk: number;     // Default: 1.0
}

/**
 * DynamoDB storage record
 */
export interface RiskScoreRecord {
  pk: string; // contractId
  sk: string; // timestamp
  contractId: string;
  riskScore: RiskScoreOutput;
  reviewerFeedback?: ReviewerFeedback;
  createdAt: string;
  updatedAt: string;
  ttl?: number; // Unix timestamp for data expiration
}

/**
 * Reviewer feedback for model improvement
 */
export interface ReviewerFeedback {
  reviewerId: string;
  reviewedAt: string;
  agreedWithScore: boolean;
  correctedScore?: {
    legal?: number;
    financial?: number;
    compliance?: number;
    composite?: number;
  };
  comments: string;
  actionTaken: 'approved' | 'rejected' | 'renegotiate' | 'escalate';
}

/**
 * A2I (Amazon Augmented AI) Human Loop Request
 */
export interface HumanLoopRequest {
  flowDefinitionArn: string;
  humanLoopName: string;
  inputContent: {
    contractId: string;
    riskScore: RiskScoreOutput;
    contractUrl: string;
  };
  dataAttributes?: {
    contentClassifiers: string[];
  };
}

/**
 * A2I Human Loop Response
 */
export interface HumanLoopResponse {
  humanLoopArn: string;
  humanLoopName: string;
  status: 'InProgress' | 'Completed' | 'Failed' | 'Stopped';
  outputDestination?: string;
}

/**
 * Configuration for Risk Scoring Agent
 */
export interface RiskScoringConfig {
  weights: RiskWeights;
  thresholds: RiskThresholds;
  bedrockConfig: {
    modelId: string;
    region: string;
    maxTokens: number;
    temperature: number;
  };
  dynamoDbConfig: {
    tableName: string;
    region: string;
  };
  s3Config: {
    bucketName: string;
    region: string;
  };
  a2iConfig: {
    flowDefinitionArn: string;
    region: string;
  };
  enableAutoEscalation: boolean;
  enableReviewerSampling: boolean;
  samplingRate: number; // 0.0 to 1.0
}

/**
 * Error response
 */
export interface ErrorResponse {
  error: string;
  message: string;
  contractId?: string;
  timestamp: string;
  details?: any;
}

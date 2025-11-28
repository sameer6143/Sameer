"""
Risk Scoring Agent - Type Definitions

This module contains all type definitions and data models for the Risk Scoring Agent system.
"""

from dataclasses import dataclass, field
from typing import List, Optional, Dict, Any, Literal
from enum import Enum
from datetime import datetime
from pydantic import BaseModel, Field, validator


class RiskSeverity(str, Enum):
    """Severity levels for risk assessment"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class RiskCategory(str, Enum):
    """Risk categories for scoring"""
    LEGAL = "legal"
    FINANCIAL = "financial"
    COMPLIANCE = "compliance"


class ContractStatus(str, Enum):
    """Contract status after risk assessment"""
    AUTO_APPROVED = "auto_approved"
    REVIEW_RECOMMENDED = "review_recommended"
    MANDATORY_REVIEW = "mandatory_review"
    REJECTED = "rejected"


class ClauseLocation(BaseModel):
    """Location of a clause in the contract"""
    page: Optional[int] = None
    section: Optional[str] = None
    paragraph: Optional[int] = None


class ExtractedClause(BaseModel):
    """Individual extracted clause"""
    clause_type: str
    content: str
    location: ClauseLocation
    importance: Literal["high", "medium", "low"]
    tags: List[str]


class ContractMetadata(BaseModel):
    """Contract metadata"""
    contract_type: str
    jurisdiction: Optional[str] = None
    effective_date: Optional[str] = None
    expiration_date: Optional[str] = None
    parties: List[str]
    contract_value: Optional[float] = None
    currency: Optional[str] = None


class ClauseExtractionOutput(BaseModel):
    """Input from Clause Extractor Agent"""
    contract_id: str
    clauses: List[ExtractedClause]
    metadata: ContractMetadata
    extracted_at: str


class ComplianceViolation(BaseModel):
    """Compliance violation details"""
    standard: str
    requirement: str
    severity: RiskSeverity
    description: str
    recommendation: str
    clause_reference: Optional[str] = None


class ComplianceCheck(BaseModel):
    """Passed compliance checks"""
    standard: str
    requirement: str
    status: Literal["passed", "partial", "not_applicable"]
    clause_reference: Optional[str] = None


class ComplianceCheckOutput(BaseModel):
    """Input from Compliance Check Agent"""
    contract_id: str
    overall_compliance: bool
    violations: List[ComplianceViolation]
    passed_checks: List[ComplianceCheck]
    framework: List[str]
    checked_at: str


class IdentifiedRisk(BaseModel):
    """Individual identified risk"""
    risk_id: str
    category: RiskCategory
    title: str
    description: str
    severity: RiskSeverity
    impact: str
    likelihood: Literal["high", "medium", "low"]
    mitigation: Optional[str] = None
    clause_reference: Optional[str] = None


class RiskAssessmentOutput(BaseModel):
    """Input from Risk Assessment Agent"""
    contract_id: str
    identified_risks: List[IdentifiedRisk]
    overall_risk_level: RiskSeverity
    assessed_at: str


class RiskWeights(BaseModel):
    """Configurable weights for risk scoring"""
    legal: float = 0.33
    financial: float = 0.33
    compliance: float = 0.34

    @validator('*')
    def check_positive(cls, v):
        if v < 0:
            raise ValueError('Weights must be positive')
        return v


class RiskThresholds(BaseModel):
    """Risk thresholds for escalation"""
    low_risk: float = 0.4
    medium_risk: float = 0.7
    high_risk: float = 1.0


class RiskFactor(BaseModel):
    """Contributing risk factor"""
    name: str
    impact: float
    description: str
    source: Literal["clause_extraction", "compliance_check", "risk_assessment"]
    source_reference: Optional[str] = None


class RiskDimensionScore(BaseModel):
    """Individual risk dimension score"""
    category: RiskCategory
    score: float
    severity: RiskSeverity
    factors: List[RiskFactor]
    narrative: str
    confidence: float


class ProcessingMetadata(BaseModel):
    """Processing metadata"""
    agent_version: str
    processing_time_ms: float
    model_used: str
    weights_applied: RiskWeights
    thresholds_applied: RiskThresholds


class RiskScoreOutput(BaseModel):
    """Complete Risk Score output"""
    contract_id: str
    timestamp: str

    # Individual dimension scores
    legal_risk: RiskDimensionScore
    financial_risk: RiskDimensionScore
    compliance_risk: RiskDimensionScore

    # Overall composite score
    composite_score: float
    composite_severity: RiskSeverity

    # Narrative and recommendations
    executive_summary: str
    detailed_narrative: str
    recommendations: List[str]

    # Escalation and status
    status: ContractStatus
    requires_human_review: bool
    escalation_reason: Optional[str] = None

    # Confidence and metadata
    confidence_score: float
    reviewer_notes: Optional[str] = None
    processing_metadata: ProcessingMetadata


class RiskScoringInput(BaseModel):
    """Complete input to Risk Scoring Agent"""
    contract_id: str
    clause_extraction: ClauseExtractionOutput
    compliance_check: ComplianceCheckOutput
    risk_assessment: RiskAssessmentOutput
    custom_weights: Optional[RiskWeights] = None


class ReviewerFeedback(BaseModel):
    """Reviewer feedback for model improvement"""
    reviewer_id: str
    reviewed_at: str
    agreed_with_score: bool
    corrected_score: Optional[Dict[str, float]] = None
    comments: str
    action_taken: Literal["approved", "rejected", "renegotiate", "escalate"]


class RiskScoreRecord(BaseModel):
    """DynamoDB storage record"""
    pk: str  # contract_id
    sk: str  # timestamp
    contract_id: str
    risk_score: RiskScoreOutput
    reviewer_feedback: Optional[ReviewerFeedback] = None
    created_at: str
    updated_at: str
    ttl: Optional[int] = None


class HumanLoopRequest(BaseModel):
    """A2I Human Loop Request"""
    flow_definition_arn: str
    human_loop_name: str
    input_content: Dict[str, Any]
    data_attributes: Optional[Dict[str, List[str]]] = None


class HumanLoopResponse(BaseModel):
    """A2I Human Loop Response"""
    human_loop_arn: str
    human_loop_name: str
    status: Literal["InProgress", "Completed", "Failed", "Stopped"]
    output_destination: Optional[str] = None


class RiskScoringConfig(BaseModel):
    """Configuration for Risk Scoring Agent"""
    weights: RiskWeights = Field(default_factory=RiskWeights)
    thresholds: RiskThresholds = Field(default_factory=RiskThresholds)

    # AWS Configuration
    aws_region: str = "us-east-1"
    dynamodb_table_name: str = "RiskScoringResults"
    s3_bucket_name: str = "contract-risk-reports"

    # Bedrock Configuration
    bedrock_model_id: str = "anthropic.claude-v2"
    bedrock_max_tokens: int = 4096
    bedrock_temperature: float = 0.3

    # A2I Configuration
    a2i_flow_definition_arn: str = ""

    # Escalation Settings
    enable_auto_escalation: bool = True
    enable_reviewer_sampling: bool = True
    sampling_rate: float = 0.1


class ErrorResponse(BaseModel):
    """Error response"""
    error: str
    message: str
    contract_id: Optional[str] = None
    timestamp: str
    details: Optional[Any] = None

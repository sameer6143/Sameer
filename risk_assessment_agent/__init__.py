"""
Risk Assessment Agent
A comprehensive risk assessment system for e-commerce transactions
"""

__version__ = "1.0.0"
__author__ = "Risk Assessment Team"

from .risk_assessment_agent import RiskAssessmentAgent, risk_assessment_agent
from .fraud_detection import FraudDetector, fraud_detector
from .types import (
    RiskLevel,
    RiskCategory,
    RiskFactor,
    CustomerProfile,
    TransactionData,
    RiskAssessmentInput,
    RiskAssessmentResult,
)

__all__ = [
    "RiskAssessmentAgent",
    "risk_assessment_agent",
    "FraudDetector",
    "fraud_detector",
    "RiskLevel",
    "RiskCategory",
    "RiskFactor",
    "CustomerProfile",
    "TransactionData",
    "RiskAssessmentInput",
    "RiskAssessmentResult",
]

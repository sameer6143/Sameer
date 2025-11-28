"""
Risk Assessment Types and Models
Pydantic models for type safety and validation
"""

from datetime import datetime
from enum import Enum
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, EmailStr, field_validator


class RiskLevel(str, Enum):
    """Risk level enumeration"""
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class RiskCategory(str, Enum):
    """Risk category enumeration"""
    FRAUD = "FRAUD"
    PAYMENT = "PAYMENT"
    SHIPPING = "SHIPPING"
    ACCOUNT = "ACCOUNT"
    BEHAVIORAL = "BEHAVIORAL"


class RiskFactor(BaseModel):
    """Individual risk factor"""
    category: RiskCategory
    description: str
    score: float
    weight: float
    severity: RiskLevel


class CustomerProfile(BaseModel):
    """Customer profile information"""
    customer_id: Optional[str] = None
    email: EmailStr
    is_new_customer: bool
    account_age: Optional[int] = None  # Days
    previous_orders: int = 0
    previous_returns: int = 0
    average_order_value: float = 0.0
    email_verified: bool = False
    phone_verified: bool = False

    class Config:
        json_schema_extra = {
            "example": {
                "email": "customer@example.com",
                "is_new_customer": False,
                "account_age": 365,
                "previous_orders": 10,
                "previous_returns": 1,
                "average_order_value": 150.00,
                "email_verified": True,
                "phone_verified": True,
            }
        }


class TransactionItem(BaseModel):
    """Individual transaction item"""
    product_id: str
    quantity: int = Field(gt=0)
    price: float = Field(ge=0)


class Address(BaseModel):
    """Address information"""
    country: str
    city: str
    postal_code: str
    address: str


class TransactionData(BaseModel):
    """Transaction details"""
    order_id: Optional[str] = None
    amount: float = Field(gt=0)
    currency: str = Field(min_length=3, max_length=3)
    items: List[TransactionItem]
    shipping_address: Address
    billing_address: Address
    payment_method: str
    ip_address: Optional[str] = None
    device_fingerprint: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.now)

    @field_validator('currency')
    @classmethod
    def validate_currency(cls, v: str) -> str:
        return v.upper()


class SessionData(BaseModel):
    """User session information"""
    user_agent: Optional[str] = None
    session_duration: Optional[int] = None  # Seconds
    pages_visited: Optional[int] = None


class RiskAssessmentInput(BaseModel):
    """Input for risk assessment"""
    customer: CustomerProfile
    transaction: TransactionData
    session_data: Optional[SessionData] = None

    class Config:
        json_schema_extra = {
            "example": {
                "customer": {
                    "email": "customer@example.com",
                    "is_new_customer": False,
                    "previous_orders": 5,
                    "email_verified": True,
                    "phone_verified": True,
                },
                "transaction": {
                    "amount": 299.99,
                    "currency": "USD",
                    "items": [{"product_id": "prod_123", "quantity": 1, "price": 299.99}],
                    "shipping_address": {
                        "country": "US",
                        "city": "New York",
                        "postal_code": "10001",
                        "address": "123 Main St",
                    },
                    "billing_address": {
                        "country": "US",
                        "city": "New York",
                        "postal_code": "10001",
                        "address": "123 Main St",
                    },
                    "payment_method": "credit_card",
                },
            }
        }


class RiskAssessmentMetadata(BaseModel):
    """Assessment metadata"""
    assessment_id: str
    processing_time: float  # Milliseconds


class RiskAssessmentResult(BaseModel):
    """Result of risk assessment"""
    overall_risk_level: RiskLevel
    overall_score: float
    risk_factors: List[RiskFactor]
    recommendations: List[str]
    should_block: bool
    should_review: bool
    timestamp: datetime
    metadata: RiskAssessmentMetadata


class RiskThresholds(BaseModel):
    """Configurable risk thresholds"""
    low_threshold: float = 0
    medium_threshold: float = 30
    high_threshold: float = 60
    critical_threshold: float = 80
    auto_block_threshold: float = 90
    manual_review_threshold: float = 50


class RiskWeights(BaseModel):
    """Configurable category weights"""
    fraud: float = 1.5
    payment: float = 1.2
    shipping: float = 1.0
    account: float = 1.3
    behavioral: float = 0.8

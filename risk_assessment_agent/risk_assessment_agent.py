"""
Risk Assessment Agent
Core engine for evaluating transaction and customer risks
"""

import time
import random
import string
from typing import List, Optional
from datetime import datetime

from .types import (
    RiskLevel,
    RiskCategory,
    RiskFactor,
    RiskAssessmentInput,
    RiskAssessmentResult,
    RiskAssessmentMetadata,
    RiskThresholds,
    RiskWeights,
    CustomerProfile,
    TransactionData,
    SessionData,
)


class RiskAssessmentAgent:
    """Main risk assessment engine"""

    def __init__(
        self,
        custom_thresholds: Optional[RiskThresholds] = None,
        custom_weights: Optional[RiskWeights] = None,
    ):
        """Initialize the risk assessment agent"""
        self.thresholds = custom_thresholds or RiskThresholds()
        self.weights = custom_weights or RiskWeights()

    async def assess(self, input_data: RiskAssessmentInput) -> RiskAssessmentResult:
        """
        Perform comprehensive risk assessment

        Args:
            input_data: Risk assessment input containing customer and transaction data

        Returns:
            RiskAssessmentResult with overall score, risk factors, and recommendations
        """
        start_time = time.time()
        assessment_id = self._generate_assessment_id()

        risk_factors: List[RiskFactor] = []

        # Run all risk assessments
        risk_factors.extend(self._assess_customer_risk(input_data.customer))
        risk_factors.extend(self._assess_transaction_risk(input_data.transaction))
        risk_factors.extend(self._assess_payment_risk(input_data.transaction))
        risk_factors.extend(self._assess_shipping_risk(input_data.transaction))
        risk_factors.extend(
            self._assess_behavioral_risk(input_data.customer, input_data.session_data)
        )

        # Calculate overall score
        overall_score = self._calculate_overall_score(risk_factors)
        overall_risk_level = self._determine_risk_level(overall_score)

        # Generate recommendations
        recommendations = self._generate_recommendations(risk_factors, overall_score)

        # Determine actions
        should_block = overall_score >= self.thresholds.auto_block_threshold
        should_review = overall_score >= self.thresholds.manual_review_threshold

        processing_time = (time.time() - start_time) * 1000  # Convert to milliseconds

        return RiskAssessmentResult(
            overall_risk_level=overall_risk_level,
            overall_score=round(overall_score, 2),
            risk_factors=risk_factors,
            recommendations=recommendations,
            should_block=should_block,
            should_review=should_review,
            timestamp=datetime.now(),
            metadata=RiskAssessmentMetadata(
                assessment_id=assessment_id,
                processing_time=round(processing_time, 2),
            ),
        )

    def _assess_customer_risk(self, customer: CustomerProfile) -> List[RiskFactor]:
        """Assess customer-related risks"""
        factors: List[RiskFactor] = []

        # New customer risk
        if customer.is_new_customer:
            factors.append(
                RiskFactor(
                    category=RiskCategory.ACCOUNT,
                    description="New customer account",
                    score=15,
                    weight=self.weights.account,
                    severity=RiskLevel.MEDIUM,
                )
            )

        # Account age risk
        if customer.account_age is not None and customer.account_age < 7:
            score = max(0, 20 - customer.account_age * 2)
            factors.append(
                RiskFactor(
                    category=RiskCategory.ACCOUNT,
                    description="Recently created account",
                    score=score,
                    weight=self.weights.account,
                    severity=self._score_to_risk_level(score),
                )
            )

        # Email verification
        if not customer.email_verified:
            factors.append(
                RiskFactor(
                    category=RiskCategory.ACCOUNT,
                    description="Unverified email address",
                    score=20,
                    weight=self.weights.account,
                    severity=RiskLevel.MEDIUM,
                )
            )

        # Phone verification
        if not customer.phone_verified:
            factors.append(
                RiskFactor(
                    category=RiskCategory.ACCOUNT,
                    description="Unverified phone number",
                    score=10,
                    weight=self.weights.account,
                    severity=RiskLevel.LOW,
                )
            )

        # Return rate analysis
        if customer.previous_orders > 0:
            return_rate = customer.previous_returns / customer.previous_orders
            if return_rate > 0.5:
                factors.append(
                    RiskFactor(
                        category=RiskCategory.FRAUD,
                        description="High return rate detected",
                        score=min(40, return_rate * 60),
                        weight=self.weights.fraud,
                        severity=RiskLevel.HIGH,
                    )
                )

        return factors

    def _assess_transaction_risk(self, transaction: TransactionData) -> List[RiskFactor]:
        """Assess transaction-related risks"""
        factors: List[RiskFactor] = []

        # High-value transaction
        if transaction.amount > 1000:
            score = min(30, (transaction.amount / 1000) * 10)
            factors.append(
                RiskFactor(
                    category=RiskCategory.FRAUD,
                    description="High-value transaction",
                    score=score,
                    weight=self.weights.fraud,
                    severity=self._score_to_risk_level(score),
                )
            )

        # Large quantity of items
        total_quantity = sum(item.quantity for item in transaction.items)
        if total_quantity > 10:
            factors.append(
                RiskFactor(
                    category=RiskCategory.FRAUD,
                    description="Unusually large quantity of items",
                    score=min(25, total_quantity * 1.5),
                    weight=self.weights.fraud,
                    severity=RiskLevel.MEDIUM,
                )
            )

        # Multiple high-value items
        high_value_items = [item for item in transaction.items if item.price > 500]
        if len(high_value_items) > 3:
            factors.append(
                RiskFactor(
                    category=RiskCategory.FRAUD,
                    description="Multiple high-value items",
                    score=20,
                    weight=self.weights.fraud,
                    severity=RiskLevel.MEDIUM,
                )
            )

        return factors

    def _assess_payment_risk(self, transaction: TransactionData) -> List[RiskFactor]:
        """Assess payment-related risks"""
        factors: List[RiskFactor] = []

        # Payment method risk
        risky_payment_methods = ["wire_transfer", "crypto", "prepaid_card"]
        if transaction.payment_method.lower() in risky_payment_methods:
            factors.append(
                RiskFactor(
                    category=RiskCategory.PAYMENT,
                    description="High-risk payment method",
                    score=25,
                    weight=self.weights.payment,
                    severity=RiskLevel.MEDIUM,
                )
            )

        # Currency risk
        low_risk_currencies = ["USD", "EUR", "GBP", "CAD", "AUD"]
        if transaction.currency.upper() not in low_risk_currencies:
            factors.append(
                RiskFactor(
                    category=RiskCategory.PAYMENT,
                    description="Uncommon currency for transaction",
                    score=10,
                    weight=self.weights.payment,
                    severity=RiskLevel.LOW,
                )
            )

        return factors

    def _assess_shipping_risk(self, transaction: TransactionData) -> List[RiskFactor]:
        """Assess shipping-related risks"""
        factors: List[RiskFactor] = []

        # Billing and shipping address mismatch
        address_mismatch = (
            transaction.billing_address.country != transaction.shipping_address.country
            or transaction.billing_address.city != transaction.shipping_address.city
        )

        if address_mismatch:
            score = (
                30
                if transaction.billing_address.country
                != transaction.shipping_address.country
                else 15
            )
            factors.append(
                RiskFactor(
                    category=RiskCategory.SHIPPING,
                    description="Billing and shipping address mismatch",
                    score=score,
                    weight=self.weights.shipping,
                    severity=self._score_to_risk_level(score),
                )
            )

        # High-risk countries
        high_risk_countries = ["XX", "YY"]  # Replace with actual codes
        if transaction.shipping_address.country in high_risk_countries:
            factors.append(
                RiskFactor(
                    category=RiskCategory.SHIPPING,
                    description="Shipping to high-risk country",
                    score=35,
                    weight=self.weights.shipping,
                    severity=RiskLevel.HIGH,
                )
            )

        # P.O. Box detection
        import re

        po_box_pattern = re.compile(r"P\.?O\.?\s*BOX", re.IGNORECASE)
        if po_box_pattern.search(transaction.shipping_address.address):
            factors.append(
                RiskFactor(
                    category=RiskCategory.SHIPPING,
                    description="Shipping to P.O. Box",
                    score=15,
                    weight=self.weights.shipping,
                    severity=RiskLevel.MEDIUM,
                )
            )

        return factors

    def _assess_behavioral_risk(
        self, customer: CustomerProfile, session_data: Optional[SessionData]
    ) -> List[RiskFactor]:
        """Assess behavioral risks"""
        factors: List[RiskFactor] = []

        if not session_data:
            return factors

        # Short session duration
        if (
            session_data.session_duration is not None
            and session_data.session_duration < 60
        ):
            factors.append(
                RiskFactor(
                    category=RiskCategory.BEHAVIORAL,
                    description="Unusually short session before purchase",
                    score=20,
                    weight=self.weights.behavioral,
                    severity=RiskLevel.MEDIUM,
                )
            )

        # Very few pages visited
        if session_data.pages_visited is not None and session_data.pages_visited < 3:
            factors.append(
                RiskFactor(
                    category=RiskCategory.BEHAVIORAL,
                    description="Minimal browsing before purchase",
                    score=15,
                    weight=self.weights.behavioral,
                    severity=RiskLevel.LOW,
                )
            )

        return factors

    def _calculate_overall_score(self, risk_factors: List[RiskFactor]) -> float:
        """Calculate overall weighted risk score"""
        if not risk_factors:
            return 0.0

        weighted_sum = sum(factor.score * factor.weight for factor in risk_factors)
        total_weight = sum(factor.weight for factor in risk_factors)

        return weighted_sum / total_weight if total_weight > 0 else 0.0

    def _determine_risk_level(self, score: float) -> RiskLevel:
        """Determine risk level from score"""
        if score >= self.thresholds.critical_threshold:
            return RiskLevel.CRITICAL
        if score >= self.thresholds.high_threshold:
            return RiskLevel.HIGH
        if score >= self.thresholds.medium_threshold:
            return RiskLevel.MEDIUM
        return RiskLevel.LOW

    def _score_to_risk_level(self, score: float) -> RiskLevel:
        """Convert score to risk level"""
        if score >= 30:
            return RiskLevel.HIGH
        if score >= 15:
            return RiskLevel.MEDIUM
        return RiskLevel.LOW

    def _generate_recommendations(
        self, risk_factors: List[RiskFactor], overall_score: float
    ) -> List[str]:
        """Generate actionable recommendations"""
        recommendations: List[str] = []

        # Critical action recommendations
        if overall_score >= self.thresholds.auto_block_threshold:
            recommendations.append(
                "BLOCK: Transaction should be blocked due to critical risk level"
            )
        elif overall_score >= self.thresholds.manual_review_threshold:
            recommendations.append("REVIEW: Manual review required before processing")

        # Category-specific recommendations
        fraud_factors = [f for f in risk_factors if f.category == RiskCategory.FRAUD]
        if fraud_factors:
            recommendations.append(
                "Verify customer identity using additional authentication methods"
            )

        account_factors = [f for f in risk_factors if f.category == RiskCategory.ACCOUNT]
        if account_factors:
            recommendations.append(
                "Request email or phone verification before processing"
            )

        shipping_factors = [
            f for f in risk_factors if f.category == RiskCategory.SHIPPING
        ]
        if shipping_factors:
            recommendations.append("Verify shipping and billing address match")

        payment_factors = [
            f for f in risk_factors if f.category == RiskCategory.PAYMENT
        ]
        if payment_factors:
            recommendations.append("Consider requiring alternative payment method")

        # Low risk recommendations
        if overall_score < self.thresholds.medium_threshold:
            recommendations.append("Transaction appears safe to process")

        return recommendations

    def _generate_assessment_id(self) -> str:
        """Generate unique assessment ID"""
        timestamp = int(time.time() * 1000)
        random_str = "".join(random.choices(string.ascii_lowercase + string.digits, k=9))
        return f"RISK-{timestamp}-{random_str}"

    def update_thresholds(self, new_thresholds: RiskThresholds) -> None:
        """Update risk thresholds dynamically"""
        self.thresholds = new_thresholds

    def update_weights(self, new_weights: RiskWeights) -> None:
        """Update category weights dynamically"""
        self.weights = new_weights


# Export singleton instance with default configuration
risk_assessment_agent = RiskAssessmentAgent()

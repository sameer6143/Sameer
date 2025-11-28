"""
Fraud Detection Algorithms
Advanced fraud detection and pattern matching
"""

import re
import time
from typing import List, Dict, Optional
from datetime import datetime, timedelta
from collections import defaultdict
from pydantic import BaseModel

from .types import RiskLevel, CustomerProfile, TransactionData


class FraudPattern(BaseModel):
    """Detected fraud pattern"""

    name: str
    detected: bool
    confidence: float
    description: str
    severity: RiskLevel


class VelocityCheckType(str):
    """Velocity check types"""

    TRANSACTION_COUNT = "transaction_count"
    TRANSACTION_AMOUNT = "transaction_amount"
    FAILED_ATTEMPTS = "failed_attempts"


class VelocityCheck(BaseModel):
    """Velocity check result"""

    type: str
    count: float
    threshold: float
    time_window: int  # Hours
    exceeded: bool


class IPReputation(BaseModel):
    """IP reputation check result"""

    is_suspicious: bool
    reason: str
    confidence: float


class DeviceAnalysis(BaseModel):
    """Device fingerprint analysis result"""

    is_unique: bool
    risk_score: float
    reason: str


class FraudDetector:
    """Advanced fraud detection system"""

    def __init__(self):
        """Initialize fraud detector"""
        # In-memory storage for demo (use database in production)
        self.transaction_history: Dict[str, List[TransactionData]] = defaultdict(list)
        self.failed_attempts: Dict[str, int] = defaultdict(int)
        self.failed_attempt_timestamps: Dict[str, float] = {}

    def detect_fraud_patterns(
        self, customer: CustomerProfile, transaction: TransactionData
    ) -> List[FraudPattern]:
        """
        Detect various fraud patterns

        Args:
            customer: Customer profile
            transaction: Transaction data

        Returns:
            List of detected fraud patterns
        """
        patterns: List[FraudPattern] = []

        patterns.append(self._detect_card_testing(customer, transaction))
        patterns.append(self._detect_velocity_abuse(customer, transaction))
        patterns.append(self._detect_address_manipulation(transaction))
        patterns.append(self._detect_suspicious_email_pattern(customer.email))
        patterns.append(self._detect_bulk_purchase_pattern(transaction))

        return [p for p in patterns if p.detected]

    def _detect_card_testing(
        self, customer: CustomerProfile, transaction: TransactionData
    ) -> FraudPattern:
        """Detect card testing (multiple small transactions)"""
        is_small_amount = transaction.amount < 10
        is_new_customer = customer.is_new_customer
        has_multiple_items = len(transaction.items) > 1

        detected = is_small_amount and is_new_customer and has_multiple_items
        confidence = 0.75 if detected else 0.0

        return FraudPattern(
            name="card_testing",
            detected=detected,
            confidence=confidence,
            description="Potential card testing detected: small transaction from new account with multiple items",
            severity=RiskLevel.HIGH,
        )

    def _detect_velocity_abuse(
        self, customer: CustomerProfile, transaction: TransactionData
    ) -> FraudPattern:
        """Detect velocity abuse (too many transactions in short time)"""
        customer_id = customer.customer_id or customer.email
        history = self.transaction_history[customer_id]

        # Check transactions in last hour
        one_hour_ago = datetime.now() - timedelta(hours=1)
        recent_transactions = [
            t for t in history if t.timestamp > one_hour_ago
        ]

        velocity_threshold = 5
        detected = len(recent_transactions) >= velocity_threshold
        confidence = (
            min(0.95, len(recent_transactions) / velocity_threshold)
            if detected
            else 0.0
        )

        # Store current transaction
        history.append(transaction)
        self.transaction_history[customer_id] = history

        return FraudPattern(
            name="velocity_abuse",
            detected=detected,
            confidence=confidence,
            description=f"Detected {len(recent_transactions)} transactions in the last hour (threshold: {velocity_threshold})",
            severity=RiskLevel.CRITICAL,
        )

    def _detect_address_manipulation(self, transaction: TransactionData) -> FraudPattern:
        """Detect address manipulation"""
        shipping = transaction.shipping_address.address.lower()
        billing = transaction.billing_address.address.lower()

        # Check for address variations
        suspicious_patterns = [
            re.compile(r"apt\.?\s*#?\s*\d+", re.IGNORECASE),
            re.compile(r"unit\s*#?\s*\d+", re.IGNORECASE),
            re.compile(r"suite\s*#?\s*\d+", re.IGNORECASE),
        ]

        shipping_has_pattern = any(pattern.search(shipping) for pattern in suspicious_patterns)
        billing_has_pattern = any(pattern.search(billing) for pattern in suspicious_patterns)

        # If shipping has suite/apt but billing doesn't (or vice versa), it's suspicious
        detected = (
            shipping_has_pattern != billing_has_pattern
            and transaction.shipping_address.country != transaction.billing_address.country
        )

        return FraudPattern(
            name="address_manipulation",
            detected=detected,
            confidence=0.6 if detected else 0.0,
            description="Address patterns suggest potential manipulation or package interception",
            severity=RiskLevel.MEDIUM,
        )

    def _detect_suspicious_email_pattern(self, email: str) -> FraudPattern:
        """Detect suspicious email patterns"""
        suspicious_patterns = [
            re.compile(r"\d{6,}"),  # Many numbers
            re.compile(r"^[a-z]{1,3}\d+@"),  # Short letters + numbers
            re.compile(r"@(tempmail|throwaway|guerrillamail|mailinator)", re.IGNORECASE),
            re.compile(r"(.)\1{3,}"),  # Repeated characters
            re.compile(r"[+]"),  # Plus addressing
        ]

        detected = any(pattern.search(email) for pattern in suspicious_patterns)
        confidence = 0.7 if detected else 0.0

        return FraudPattern(
            name="suspicious_email",
            detected=detected,
            confidence=confidence,
            description="Email address matches patterns commonly associated with fraud",
            severity=RiskLevel.MEDIUM,
        )

    def _detect_bulk_purchase_pattern(self, transaction: TransactionData) -> FraudPattern:
        """Detect bulk purchase patterns"""
        items = transaction.items

        # Check if all items are the same
        unique_product_ids = {item.product_id for item in items}
        all_same_product = len(unique_product_ids) == 1

        # Check for large quantities
        total_quantity = sum(item.quantity for item in items)
        large_quantity = total_quantity > 20

        detected = all_same_product and large_quantity
        confidence = 0.65 if detected else 0.0

        return FraudPattern(
            name="bulk_purchase",
            detected=detected,
            confidence=confidence,
            description="Large quantity of identical items may indicate reselling fraud",
            severity=RiskLevel.MEDIUM,
        )

    def perform_velocity_checks(
        self, customer: CustomerProfile, transaction: TransactionData
    ) -> List[VelocityCheck]:
        """
        Perform velocity checks

        Args:
            customer: Customer profile
            transaction: Transaction data

        Returns:
            List of velocity check results
        """
        customer_id = customer.customer_id or customer.email
        history = self.transaction_history[customer_id]
        checks: List[VelocityCheck] = []

        # Check transaction count in last 24 hours
        one_day_ago = datetime.now() - timedelta(hours=24)
        last_24_hours = [t for t in history if t.timestamp > one_day_ago]

        checks.append(
            VelocityCheck(
                type=VelocityCheckType.TRANSACTION_COUNT,
                count=len(last_24_hours),
                threshold=10,
                time_window=24,
                exceeded=len(last_24_hours) > 10,
            )
        )

        # Check total transaction amount in last 24 hours
        total_amount_24h = sum(t.amount for t in last_24_hours) + transaction.amount

        checks.append(
            VelocityCheck(
                type=VelocityCheckType.TRANSACTION_AMOUNT,
                count=total_amount_24h,
                threshold=5000,
                time_window=24,
                exceeded=total_amount_24h > 5000,
            )
        )

        # Check failed attempts
        failed_count = self.failed_attempts[customer_id]
        checks.append(
            VelocityCheck(
                type=VelocityCheckType.FAILED_ATTEMPTS,
                count=failed_count,
                threshold=3,
                time_window=1,
                exceeded=failed_count > 3,
            )
        )

        return checks

    def check_ip_reputation(self, ip_address: str) -> IPReputation:
        """
        Check if IP address is suspicious

        Args:
            ip_address: IP address to check

        Returns:
            IP reputation result
        """
        # Placeholder for IP reputation check
        # In production, integrate with services like MaxMind, IPQualityScore, etc.

        # Check if IP is from known proxy/VPN ranges (example)
        suspicious_ranges = ["10.0.0.", "192.168."]
        is_suspicious = any(ip_address.startswith(range) for range in suspicious_ranges)

        return IPReputation(
            is_suspicious=is_suspicious,
            reason="IP from suspicious range" if is_suspicious else "IP appears clean",
            confidence=0.5 if is_suspicious else 0.1,
        )

    def calculate_fraud_score(self, patterns: List[FraudPattern]) -> float:
        """
        Calculate fraud score based on patterns

        Args:
            patterns: List of detected fraud patterns

        Returns:
            Fraud score (0-100)
        """
        if not patterns:
            return 0.0

        severity_weights = {
            RiskLevel.LOW: 1.0,
            RiskLevel.MEDIUM: 1.5,
            RiskLevel.HIGH: 2.0,
            RiskLevel.CRITICAL: 3.0,
        }

        weighted_score = sum(
            pattern.confidence * 100 * severity_weights[pattern.severity]
            for pattern in patterns
        )

        return min(100.0, round(weighted_score / len(patterns), 2))

    def record_failed_attempt(self, customer_id: str) -> None:
        """
        Record failed transaction attempt

        Args:
            customer_id: Customer identifier
        """
        self.failed_attempts[customer_id] += 1
        self.failed_attempt_timestamps[customer_id] = time.time()

        # Clear after 1 hour
        def clear_after_delay():
            time.sleep(3600)  # 1 hour
            if customer_id in self.failed_attempts:
                del self.failed_attempts[customer_id]
            if customer_id in self.failed_attempt_timestamps:
                del self.failed_attempt_timestamps[customer_id]

        # In production, use proper background task handling
        import threading

        threading.Thread(target=clear_after_delay, daemon=True).start()

    def clear_history(self, customer_id: Optional[str] = None) -> None:
        """
        Clear transaction history

        Args:
            customer_id: Optional customer ID. If None, clears all history
        """
        if customer_id:
            if customer_id in self.transaction_history:
                del self.transaction_history[customer_id]
            if customer_id in self.failed_attempts:
                del self.failed_attempts[customer_id]
            if customer_id in self.failed_attempt_timestamps:
                del self.failed_attempt_timestamps[customer_id]
        else:
            self.transaction_history.clear()
            self.failed_attempts.clear()
            self.failed_attempt_timestamps.clear()

    def analyze_device_fingerprint(
        self, fingerprint: Optional[str] = None
    ) -> DeviceAnalysis:
        """
        Analyze device fingerprint

        Args:
            fingerprint: Device fingerprint string

        Returns:
            Device analysis result
        """
        if not fingerprint:
            return DeviceAnalysis(
                is_unique=False,
                risk_score=20.0,
                reason="No device fingerprint provided",
            )

        # In production, check fingerprint against database of known devices
        # and detect patterns like too many accounts from same fingerprint

        return DeviceAnalysis(
            is_unique=True,
            risk_score=0.0,
            reason="Device fingerprint appears unique",
        )


# Export singleton instance
fraud_detector = FraudDetector()

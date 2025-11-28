#!/usr/bin/env python3
"""
Simple test script for Risk Assessment Agent
Run with: python test_risk_assessment.py
"""

import asyncio
from datetime import datetime
from risk_assessment_agent import (
    risk_assessment_agent,
    fraud_detector,
    RiskAssessmentInput,
    CustomerProfile,
    TransactionData,
    TransactionItem,
    Address,
)


async def test_risk_assessment():
    """Test risk assessment functionality"""
    print("\n" + "=" * 60)
    print("Risk Assessment Agent Test")
    print("=" * 60 + "\n")

    # Test Case 1: Low Risk
    print("Test 1: Low Risk Transaction")
    low_risk_input = RiskAssessmentInput(
        customer=CustomerProfile(
            email="customer@example.com",
            is_new_customer=False,
            previous_orders=10,
            previous_returns=0,
            average_order_value=100.0,
            email_verified=True,
            phone_verified=True,
        ),
        transaction=TransactionData(
            amount=99.99,
            currency="USD",
            items=[TransactionItem(product_id="prod_001", quantity=1, price=99.99)],
            shipping_address=Address(
                country="US",
                city="Seattle",
                postal_code="98101",
                address="123 Main St",
            ),
            billing_address=Address(
                country="US",
                city="Seattle",
                postal_code="98101",
                address="123 Main St",
            ),
            payment_method="credit_card",
            timestamp=datetime.now(),
        ),
    )

    try:
        result1 = await risk_assessment_agent.assess(low_risk_input)
        print(f"✓ Risk Level: {result1.overall_risk_level.value}")
        print(f"✓ Score: {result1.overall_score}")
        print(f"✓ Should Block: {result1.should_block}")
        print(f"✓ Should Review: {result1.should_review}")
    except Exception as e:
        print(f"✗ Test failed: {e}")

    # Test Case 2: High Risk
    print("\n\nTest 2: High Risk Transaction")
    high_risk_input = RiskAssessmentInput(
        customer=CustomerProfile(
            email="test123456@tempmail.com",
            is_new_customer=True,
            previous_orders=0,
            previous_returns=0,
            average_order_value=0.0,
            email_verified=False,
            phone_verified=False,
        ),
        transaction=TransactionData(
            amount=2999.99,
            currency="USD",
            items=[
                TransactionItem(product_id="prod_laptop", quantity=3, price=999.99)
            ],
            shipping_address=Address(
                country="US",
                city="Miami",
                postal_code="33101",
                address="P.O. Box 999",
            ),
            billing_address=Address(
                country="CA",
                city="Toronto",
                postal_code="M5H 2N2",
                address="456 Bay St",
            ),
            payment_method="prepaid_card",
            timestamp=datetime.now(),
        ),
    )

    try:
        result2 = await risk_assessment_agent.assess(high_risk_input)
        print(f"✓ Risk Level: {result2.overall_risk_level.value}")
        print(f"✓ Score: {result2.overall_score}")
        print(f"✓ Should Block: {result2.should_block}")
        print(f"✓ Should Review: {result2.should_review}")
        print(f"✓ Risk Factors Found: {len(result2.risk_factors)}")
    except Exception as e:
        print(f"✗ Test failed: {e}")

    # Test Case 3: Fraud Detection
    print("\n\nTest 3: Fraud Detection Patterns")
    fraud_patterns = fraud_detector.detect_fraud_patterns(
        high_risk_input.customer, high_risk_input.transaction
    )

    print(f"✓ Fraud Patterns Detected: {len(fraud_patterns)}")
    for pattern in fraud_patterns:
        print(
            f"  - {pattern.name}: {pattern.confidence * 100:.0f}% confidence"
        )

    print("\n" + "=" * 60)
    print("All Tests Completed!")
    print("=" * 60 + "\n")


if __name__ == "__main__":
    asyncio.run(test_risk_assessment())

"""
Risk Assessment Agent Examples
Demonstrates various use cases and scenarios
"""

import asyncio
from datetime import datetime

from .risk_assessment_agent import RiskAssessmentAgent, risk_assessment_agent
from .fraud_detection import fraud_detector
from .types import (
    RiskAssessmentInput,
    CustomerProfile,
    TransactionData,
    TransactionItem,
    Address,
    SessionData,
    RiskThresholds,
    RiskWeights,
)


async def example_low_risk():
    """Example 1: Low Risk Transaction"""
    print("=" * 60)
    print("Example 1: Low Risk Transaction")
    print("=" * 60)

    input_data = RiskAssessmentInput(
        customer=CustomerProfile(
            email="loyal.customer@example.com",
            is_new_customer=False,
            account_age=365,
            previous_orders=25,
            previous_returns=1,
            average_order_value=150.0,
            email_verified=True,
            phone_verified=True,
        ),
        transaction=TransactionData(
            amount=149.99,
            currency="USD",
            items=[
                TransactionItem(product_id="prod_shirt_001", quantity=2, price=49.99),
                TransactionItem(product_id="prod_pants_002", quantity=1, price=50.01),
            ],
            shipping_address=Address(
                country="US",
                city="Seattle",
                postal_code="98101",
                address="123 Pine Street",
            ),
            billing_address=Address(
                country="US",
                city="Seattle",
                postal_code="98101",
                address="123 Pine Street",
            ),
            payment_method="credit_card",
            timestamp=datetime.now(),
        ),
        session_data=SessionData(
            user_agent="Mozilla/5.0...",
            session_duration=300,
            pages_visited=8,
        ),
    )

    result = await risk_assessment_agent.assess(input_data)

    print(f"\nRisk Level: {result.overall_risk_level.value}")
    print(f"Score: {result.overall_score}")
    print(f"Should Block: {result.should_block}")
    print(f"Should Review: {result.should_review}")
    print(f"\nRecommendations:")
    for rec in result.recommendations:
        print(f"  - {rec}")
    print("\n")

    return result


async def example_high_risk():
    """Example 2: High Risk Transaction"""
    print("=" * 60)
    print("Example 2: High Risk Transaction")
    print("=" * 60)

    input_data = RiskAssessmentInput(
        customer=CustomerProfile(
            email="user12345678@tempmail.com",
            is_new_customer=True,
            previous_orders=0,
            previous_returns=0,
            average_order_value=0.0,
            email_verified=False,
            phone_verified=False,
        ),
        transaction=TransactionData(
            amount=3499.99,
            currency="USD",
            items=[
                TransactionItem(product_id="prod_laptop_001", quantity=1, price=1499.99),
                TransactionItem(product_id="prod_phone_002", quantity=2, price=999.99),
            ],
            shipping_address=Address(
                country="US",
                city="Miami",
                postal_code="33101",
                address="P.O. Box 1234",
            ),
            billing_address=Address(
                country="CA",
                city="Toronto",
                postal_code="M5H 2N2",
                address="456 Bay Street",
            ),
            payment_method="prepaid_card",
            ip_address="192.168.1.1",
            device_fingerprint="unknown",
            timestamp=datetime.now(),
        ),
        session_data=SessionData(
            session_duration=45,
            pages_visited=2,
        ),
    )

    result = await risk_assessment_agent.assess(input_data)

    print(f"\nRisk Level: {result.overall_risk_level.value}")
    print(f"Score: {result.overall_score}")
    print(f"Should Block: {result.should_block}")
    print(f"Should Review: {result.should_review}")
    print(f"\nRisk Factors:")
    for factor in result.risk_factors:
        print(
            f"  - [{factor.category.value}] {factor.description} (Score: {factor.score})"
        )
    print(f"\nRecommendations:")
    for rec in result.recommendations:
        print(f"  - {rec}")
    print("\n")

    return result


async def example_fraud_detection():
    """Example 3: Fraud Detection Patterns"""
    print("=" * 60)
    print("Example 3: Fraud Detection Patterns")
    print("=" * 60)

    customer = CustomerProfile(
        customer_id="cust_fraud_001",
        email="abc123@mailinator.com",
        is_new_customer=True,
        previous_orders=0,
        previous_returns=0,
        average_order_value=0.0,
        email_verified=False,
        phone_verified=False,
    )

    transaction = TransactionData(
        amount=9.99,
        currency="USD",
        items=[
            TransactionItem(product_id="prod_test_001", quantity=1, price=9.99),
            TransactionItem(product_id="prod_test_002", quantity=1, price=0.0),
        ],
        shipping_address=Address(
            country="US",
            city="New York",
            postal_code="10001",
            address="123 Test St Apt 1",
        ),
        billing_address=Address(
            country="US",
            city="New York",
            postal_code="10002",
            address="123 Test St",
        ),
        payment_method="credit_card",
        timestamp=datetime.now(),
    )

    patterns = fraud_detector.detect_fraud_patterns(customer, transaction)

    print("\nDetected Fraud Patterns:")
    for pattern in patterns:
        print(f"\n  - {pattern.name} (Confidence: {pattern.confidence * 100:.0f}%)")
        print(f"    {pattern.description}")
        print(f"    Severity: {pattern.severity.value}")

    fraud_score = fraud_detector.calculate_fraud_score(patterns)
    print(f"\nOverall Fraud Score: {fraud_score}/100")
    print("\n")

    return {"patterns": patterns, "fraud_score": fraud_score}


async def example_velocity_checks():
    """Example 4: Velocity Checks"""
    print("=" * 60)
    print("Example 4: Velocity Checks")
    print("=" * 60)

    customer = CustomerProfile(
        customer_id="cust_velocity_001",
        email="customer@example.com",
        is_new_customer=False,
        previous_orders=5,
        previous_returns=0,
        average_order_value=100.0,
        email_verified=True,
        phone_verified=True,
    )

    # Simulate multiple transactions
    for i in range(12):
        transaction = TransactionData(
            amount=50 + i * 10,
            currency="USD",
            items=[
                TransactionItem(product_id=f"prod_{i}", quantity=1, price=50 + i * 10)
            ],
            shipping_address=Address(
                country="US",
                city="Boston",
                postal_code="02101",
                address="123 Main St",
            ),
            billing_address=Address(
                country="US",
                city="Boston",
                postal_code="02101",
                address="123 Main St",
            ),
            payment_method="credit_card",
            timestamp=datetime.now(),
        )

        fraud_detector.detect_fraud_patterns(customer, transaction)

    # Check velocity
    transaction = TransactionData(
        amount=200,
        currency="USD",
        items=[TransactionItem(product_id="prod_final", quantity=1, price=200)],
        shipping_address=Address(
            country="US",
            city="Boston",
            postal_code="02101",
            address="123 Main St",
        ),
        billing_address=Address(
            country="US",
            city="Boston",
            postal_code="02101",
            address="123 Main St",
        ),
        payment_method="credit_card",
        timestamp=datetime.now(),
    )

    velocity_checks = fraud_detector.perform_velocity_checks(customer, transaction)

    print("\nVelocity Checks:")
    for check in velocity_checks:
        print(f"\n  - {check.type}")
        print(f"    Count: {check.count}")
        print(f"    Threshold: {check.threshold}")
        print(f"    Time Window: {check.time_window} hours")
        print(f"    Exceeded: {'YES ⚠️' if check.exceeded else 'NO ✓'}")

    print("\n")

    # Cleanup
    fraud_detector.clear_history(customer.customer_id)

    return velocity_checks


async def example_custom_configuration():
    """Example 5: Custom Configuration"""
    print("=" * 60)
    print("Example 5: Custom Configuration")
    print("=" * 60)

    # Create agent with stricter thresholds
    strict_agent = RiskAssessmentAgent(
        custom_thresholds=RiskThresholds(
            low_threshold=0,
            medium_threshold=20,
            high_threshold=40,
            critical_threshold=60,
            auto_block_threshold=70,
            manual_review_threshold=30,
        ),
        custom_weights=RiskWeights(
            fraud=2.0,
            payment=1.5,
            shipping=1.2,
            account=1.8,
            behavioral=0.5,
        ),
    )

    input_data = RiskAssessmentInput(
        customer=CustomerProfile(
            email="customer@example.com",
            is_new_customer=True,
            previous_orders=0,
            previous_returns=0,
            average_order_value=0.0,
            email_verified=False,
            phone_verified=False,
        ),
        transaction=TransactionData(
            amount=500,
            currency="USD",
            items=[TransactionItem(product_id="prod_001", quantity=1, price=500)],
            shipping_address=Address(
                country="US",
                city="Chicago",
                postal_code="60601",
                address="123 Main St",
            ),
            billing_address=Address(
                country="US",
                city="Chicago",
                postal_code="60601",
                address="123 Main St",
            ),
            payment_method="credit_card",
            timestamp=datetime.now(),
        ),
    )

    default_result = await risk_assessment_agent.assess(input_data)
    strict_result = await strict_agent.assess(input_data)

    print("\nDefault Configuration:")
    print(f"  Risk Level: {default_result.overall_risk_level.value}")
    print(f"  Score: {default_result.overall_score}")
    print(f"  Should Review: {default_result.should_review}")

    print("\nStrict Configuration:")
    print(f"  Risk Level: {strict_result.overall_risk_level.value}")
    print(f"  Score: {strict_result.overall_score}")
    print(f"  Should Review: {strict_result.should_review}")

    print("\n")

    return {"default_result": default_result, "strict_result": strict_result}


async def run_all_examples():
    """Run all examples"""
    print("\n")
    print("╔" + "═" * 58 + "╗")
    print("║" + " " * 10 + "RISK ASSESSMENT AGENT - EXAMPLES" + " " * 16 + "║")
    print("╚" + "═" * 58 + "╝")
    print("\n")

    await example_low_risk()
    await example_high_risk()
    await example_fraud_detection()
    await example_velocity_checks()
    await example_custom_configuration()

    print("All examples completed!\n")


if __name__ == "__main__":
    asyncio.run(run_all_examples())

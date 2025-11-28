"""
Risk Assessment Helpers
Utility functions for integrating risk assessment into applications
"""

import re
from typing import Dict, List, Any, Tuple
from datetime import datetime

from .types import (
    RiskLevel,
    RiskAssessmentResult,
    CustomerProfile,
    TransactionData,
    TransactionItem,
    Address,
)


def create_customer_profile(shopify_customer: Dict[str, Any]) -> CustomerProfile:
    """
    Create customer profile from Shopify customer data

    Args:
        shopify_customer: Shopify customer data dictionary

    Returns:
        CustomerProfile instance
    """
    created_at = shopify_customer.get("created_at")
    if created_at:
        created_date = (
            datetime.fromisoformat(created_at.replace("Z", "+00:00"))
            if isinstance(created_at, str)
            else created_at
        )
    else:
        created_date = datetime.now()

    account_age = (datetime.now() - created_date).days

    return CustomerProfile(
        customer_id=shopify_customer.get("id"),
        email=shopify_customer.get("email", "unknown@example.com"),
        is_new_customer=not shopify_customer.get("id") or account_age < 7,
        account_age=account_age,
        previous_orders=shopify_customer.get("number_of_orders", 0),
        previous_returns=0,
        average_order_value=float(shopify_customer.get("average_order_value", 0)),
        email_verified=shopify_customer.get("email_verified", False),
        phone_verified=shopify_customer.get("phone_verified", False),
    )


def create_transaction_data(
    cart: Dict[str, Any], order_details: Dict[str, Any] = None
) -> TransactionData:
    """
    Create transaction data from Shopify cart/order

    Args:
        cart: Shopify cart data
        order_details: Optional order details

    Returns:
        TransactionData instance
    """
    order_details = order_details or {}
    lines = cart.get("lines", {}).get("nodes", []) or cart.get("lines", [])

    items = [
        TransactionItem(
            product_id=line.get("merchandise", {}).get("product", {}).get("id")
            or line.get("id", ""),
            quantity=line.get("quantity", 1),
            price=float(
                line.get("cost", {}).get("totalAmount", {}).get("amount", 0)
            ),
        )
        for line in lines
    ]

    shipping_addr = order_details.get("shipping_address") or cart.get(
        "delivery_address", {}
    )
    billing_addr = order_details.get("billing_address") or cart.get(
        "billing_address", {}
    )

    return TransactionData(
        order_id=order_details.get("id"),
        amount=float(cart.get("cost", {}).get("totalAmount", {}).get("amount", 0)),
        currency=cart.get("cost", {}).get("totalAmount", {}).get("currencyCode", "USD"),
        items=items,
        shipping_address=Address(
            country=shipping_addr.get("country", ""),
            city=shipping_addr.get("city", ""),
            postal_code=shipping_addr.get("zip", ""),
            address=shipping_addr.get("address1", ""),
        ),
        billing_address=Address(
            country=billing_addr.get("country", ""),
            city=billing_addr.get("city", ""),
            postal_code=billing_addr.get("zip", ""),
            address=billing_addr.get("address1", ""),
        ),
        payment_method=order_details.get("payment_method", "unknown"),
    )


def format_risk_assessment_for_display(
    result: RiskAssessmentResult,
) -> Dict[str, Any]:
    """
    Format risk assessment result for display

    Args:
        result: Risk assessment result

    Returns:
        Formatted display dictionary
    """
    color_map = {
        RiskLevel.LOW: "green",
        RiskLevel.MEDIUM: "yellow",
        RiskLevel.HIGH: "orange",
        RiskLevel.CRITICAL: "red",
    }

    action_map = {
        RiskLevel.LOW: "No action required - proceed with order",
        RiskLevel.MEDIUM: "Review recommended - verify customer details",
        RiskLevel.HIGH: "Manual review required before processing",
        RiskLevel.CRITICAL: "Block transaction - high fraud risk detected",
    }

    return {
        "summary": f"Risk Level: {result.overall_risk_level.value} (Score: {result.overall_score})",
        "details": [
            f"[{f.category.value}] {f.description} (Score: {f.score})"
            for f in result.risk_factors
        ],
        "action_required": action_map[result.overall_risk_level],
        "color": color_map[result.overall_risk_level],
    }


def should_allow_transaction(result: RiskAssessmentResult) -> Tuple[bool, str]:
    """
    Check if transaction should be allowed based on risk assessment

    Args:
        result: Risk assessment result

    Returns:
        Tuple of (allowed, reason)
    """
    if result.should_block:
        return False, "Transaction blocked due to critical risk factors"

    if result.should_review:
        return False, "Transaction requires manual review before processing"

    return True, "Transaction approved"


def get_risk_badge(risk_level: RiskLevel) -> Dict[str, str]:
    """
    Get risk badge information for UI

    Args:
        risk_level: Risk level

    Returns:
        Badge information dictionary
    """
    badges = {
        RiskLevel.LOW: {"text": "Low Risk", "variant": "success"},
        RiskLevel.MEDIUM: {"text": "Medium Risk", "variant": "warning"},
        RiskLevel.HIGH: {"text": "High Risk", "variant": "danger"},
        RiskLevel.CRITICAL: {"text": "Critical Risk", "variant": "error"},
    }

    return badges[risk_level]


def calculate_risk_trend(
    assessments: List[RiskAssessmentResult],
) -> Dict[str, Any]:
    """
    Calculate risk trend from historical assessments

    Args:
        assessments: List of risk assessment results

    Returns:
        Trend analysis dictionary
    """
    if len(assessments) < 2:
        return {
            "trend": "stable",
            "average_score": assessments[0].overall_score if assessments else 0,
            "change": 0,
        }

    scores = [a.overall_score for a in assessments]
    average_score = sum(scores) / len(scores)

    first_half = scores[: len(scores) // 2]
    second_half = scores[len(scores) // 2 :]

    first_avg = sum(first_half) / len(first_half) if first_half else 0
    second_avg = sum(second_half) / len(second_half) if second_half else 0

    change = second_avg - first_avg
    trend = "increasing" if change > 5 else "decreasing" if change < -5 else "stable"

    return {
        "trend": trend,
        "average_score": round(average_score, 2),
        "change": round(change, 2),
    }


def get_high_risk_factors(result: RiskAssessmentResult) -> List:
    """
    Filter high-risk factors for reporting

    Args:
        result: Risk assessment result

    Returns:
        List of high-risk factors
    """
    return [
        f
        for f in result.risk_factors
        if f.severity in [RiskLevel.HIGH, RiskLevel.CRITICAL]
    ]


def generate_risk_report(result: RiskAssessmentResult) -> str:
    """
    Generate risk report summary

    Args:
        result: Risk assessment result

    Returns:
        Formatted report string
    """
    high_risk_factors = get_high_risk_factors(result)

    report = "Risk Assessment Report\n"
    report += "=" * 50 + "\n\n"
    report += f"Overall Risk Level: {result.overall_risk_level.value}\n"
    report += f"Overall Score: {result.overall_score}\n"
    report += f"Timestamp: {result.timestamp.isoformat()}\n"
    report += f"Assessment ID: {result.metadata.assessment_id}\n\n"

    if high_risk_factors:
        report += "High-Risk Factors:\n"
        for factor in high_risk_factors:
            report += f"- [{factor.category.value}] {factor.description} (Score: {factor.score})\n"
        report += "\n"

    report += "Recommendations:\n"
    for rec in result.recommendations:
        report += f"- {rec}\n"

    return report


def validate_email_security(email: str) -> Dict[str, Any]:
    """
    Validate email for fraud patterns

    Args:
        email: Email address to validate

    Returns:
        Validation result dictionary
    """
    issues = []

    # Check for disposable email providers
    disposable_providers = [
        "tempmail",
        "throwaway",
        "guerrillamail",
        "mailinator",
        "10minutemail",
    ]

    domain = email.split("@")[1].lower() if "@" in email else ""
    if any(provider in domain for provider in disposable_providers):
        issues.append("Disposable email provider detected")

    # Check for suspicious patterns
    if re.search(r"\d{6,}", email):
        issues.append("Email contains excessive numbers")

    if re.search(r"(.)\1{3,}", email):
        issues.append("Email contains repeated characters")

    return {"is_valid": len(issues) == 0, "issues": issues}


async def assess_risk_api(input_data: Dict[str, Any], api_url: str = None) -> Dict[str, Any]:
    """
    Call risk assessment API

    Args:
        input_data: Risk assessment input data
        api_url: Optional API URL (defaults to local)

    Returns:
        Risk assessment result dictionary
    """
    import httpx

    api_url = api_url or "http://localhost:8000/api/risk-assessment"

    async with httpx.AsyncClient() as client:
        response = await client.post(
            api_url,
            json=input_data,
            headers={"Content-Type": "application/json"},
        )

        if response.status_code not in [200, 403]:
            raise Exception(f"Risk assessment failed: {response.text}")

        return response.json()

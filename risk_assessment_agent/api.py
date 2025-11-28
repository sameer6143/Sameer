"""
Risk Assessment API
FastAPI endpoint for performing risk assessments
"""

from typing import Dict, Any
from fastapi import FastAPI, HTTPException, Request, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

from .risk_assessment_agent import risk_assessment_agent
from .fraud_detection import fraud_detector
from .types import RiskAssessmentInput, RiskAssessmentResult

# Create FastAPI app
app = FastAPI(
    title="Risk Assessment API",
    description="Comprehensive risk assessment system for e-commerce transactions",
    version="1.0.0",
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root() -> Dict[str, Any]:
    """Root endpoint - service information"""
    return {
        "service": "Risk Assessment API",
        "version": "1.0.0",
        "status": "operational",
        "endpoints": {
            "assess": {
                "method": "POST",
                "path": "/api/risk-assessment",
                "description": "Perform risk assessment on a transaction",
            },
            "health": {
                "method": "GET",
                "path": "/health",
                "description": "Health check endpoint",
            },
        },
    }


@app.get("/health")
async def health_check() -> Dict[str, str]:
    """Health check endpoint"""
    return {"status": "healthy", "service": "risk-assessment-api"}


@app.post(
    "/api/risk-assessment",
    response_model=RiskAssessmentResult,
    status_code=status.HTTP_200_OK,
)
async def assess_risk(
    input_data: RiskAssessmentInput, request: Request
) -> RiskAssessmentResult:
    """
    Perform comprehensive risk assessment on a transaction

    Args:
        input_data: Risk assessment input containing customer and transaction data
        request: FastAPI request object

    Returns:
        Risk assessment result with score, risk factors, and recommendations

    Raises:
        HTTPException: If assessment fails
    """
    try:
        # Extract IP address from request
        ip_address = (
            request.headers.get("x-forwarded-for")
            or request.headers.get("x-real-ip")
            or request.client.host
            if request.client
            else "unknown"
        )

        # Set IP address in transaction data
        if input_data.transaction:
            input_data.transaction.ip_address = ip_address

        # Perform risk assessment
        assessment = await risk_assessment_agent.assess(input_data)

        # Perform fraud detection
        fraud_patterns = fraud_detector.detect_fraud_patterns(
            input_data.customer, input_data.transaction
        )

        velocity_checks = fraud_detector.perform_velocity_checks(
            input_data.customer, input_data.transaction
        )

        # IP reputation check
        ip_reputation = None
        if input_data.transaction.ip_address:
            ip_reputation = fraud_detector.check_ip_reputation(
                input_data.transaction.ip_address
            )

        # Device fingerprint analysis
        device_analysis = fraud_detector.analyze_device_fingerprint(
            input_data.transaction.device_fingerprint
        )

        # Calculate fraud score
        fraud_score = fraud_detector.calculate_fraud_score(fraud_patterns)

        # Add fraud detection data to response
        # Note: We're returning the base RiskAssessmentResult, but you can extend it
        # For now, we'll add recommendations based on fraud detection
        if fraud_score > 70:
            assessment.recommendations.insert(
                0, f"HIGH FRAUD SCORE: {fraud_score}/100 detected"
            )

        # Return appropriate status code based on risk level
        if assessment.should_block:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={
                    "error": "Transaction blocked",
                    "assessment": assessment.model_dump(),
                    "fraud_detection": {
                        "patterns": [p.model_dump() for p in fraud_patterns],
                        "fraud_score": fraud_score,
                        "velocity_checks": [v.model_dump() for v in velocity_checks],
                        "ip_reputation": ip_reputation.model_dump()
                        if ip_reputation
                        else None,
                        "device_analysis": device_analysis.model_dump(),
                    },
                },
            )

        return assessment

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "Internal server error", "message": str(e)},
        )


@app.get("/api/risk-assessment")
async def get_assessment_info() -> Dict[str, Any]:
    """Get information about the risk assessment service"""
    return {
        "service": "Risk Assessment API",
        "version": "1.0.0",
        "status": "operational",
        "description": "Comprehensive risk assessment system for e-commerce transactions",
        "features": [
            "Multi-factor risk analysis",
            "Fraud detection with pattern matching",
            "Velocity checks",
            "IP reputation analysis",
            "Device fingerprinting",
            "Real-time scoring",
            "Actionable recommendations",
        ],
        "risk_levels": ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
        "risk_categories": ["FRAUD", "PAYMENT", "SHIPPING", "ACCOUNT", "BEHAVIORAL"],
    }


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """Custom HTTP exception handler"""
    return JSONResponse(
        status_code=exc.status_code,
        content=exc.detail,
    )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)

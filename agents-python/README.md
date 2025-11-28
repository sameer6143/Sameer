# Risk Scoring Agent - Python Implementation

## Overview

Python implementation of the AI-powered Risk Scoring Agent that evaluates contracts across three critical dimensions:

- **Legal Risk**: Indemnities, liabilities, dispute clauses
- **Financial Risk**: Penalties, payment terms, financial obligations
- **Compliance Risk**: GDPR, HIPAA, regulatory adherence

## Features

✅ Multi-dimensional risk scoring (Legal, Financial, Compliance)
✅ Configurable weights and thresholds
✅ AWS Lambda integration
✅ DynamoDB storage with audit trail
✅ S3 report generation (JSON + HTML)
✅ Amazon Bedrock (Claude) for AI narratives
✅ Amazon A2I for human-in-the-loop review
✅ Automated escalation for high-risk contracts
✅ Type-safe with Pydantic models
✅ Async/await support
✅ Comprehensive test suite

## Quick Start

### Installation

```bash
# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set up environment variables
cp .env.example .env
# Edit .env with your AWS credentials and configuration
```

### Run Sample Scenarios

```bash
python examples/sample_scenarios.py
```

### Run Tests

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=core --cov=services

# Run specific test
pytest tests/test_risk_scoring_agent.py
```

## Project Structure

```
agents-python/
├── core/
│   └── risk_scoring_agent.py       # Main agent logic
├── services/
│   ├── dynamodb_service.py         # DynamoDB operations
│   ├── s3_service.py               # S3 operations
│   ├── a2i_service.py              # A2I escalation
│   └── bedrock_service.py          # AI narratives
├── lambda_handler/
│   └── risk_scoring_handler.py     # AWS Lambda handler
├── types/
│   └── risk_scoring_types.py       # Pydantic models
├── examples/
│   └── sample_scenarios.py         # Sample scenarios
├── tests/
│   └── test_risk_scoring_agent.py  # Test suite
├── requirements.txt                # Dependencies
└── README.md                       # This file
```

## Configuration

### Environment Variables

Create a `.env` file:

```bash
# AWS Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key

# DynamoDB
DYNAMODB_TABLE_NAME=RiskScoringResults

# S3
S3_BUCKET_NAME=contract-risk-reports

# Amazon Bedrock
BEDROCK_MODEL_ID=anthropic.claude-v2
BEDROCK_MAX_TOKENS=4096
BEDROCK_TEMPERATURE=0.3

# Amazon A2I
A2I_FLOW_DEFINITION_ARN=arn:aws:sagemaker:us-east-1:123456789012:flow-definition/risk-review

# Risk Scoring Weights
LEGAL_WEIGHT=0.33
FINANCIAL_WEIGHT=0.33
COMPLIANCE_WEIGHT=0.34

# Risk Thresholds
LOW_RISK_THRESHOLD=0.4
MEDIUM_RISK_THRESHOLD=0.7

# Escalation Settings
ENABLE_AUTO_ESCALATION=true
ENABLE_REVIEWER_SAMPLING=true
SAMPLING_RATE=0.1
```

## Usage Examples

### Basic Usage

```python
from core.risk_scoring_agent import RiskScoringAgent
from types.risk_scoring_types import RiskScoringInput

# Initialize agent
agent = RiskScoringAgent()

# Prepare input (from upstream agents)
input_data = RiskScoringInput(
    contract_id="CONTRACT-2024-001",
    clause_extraction=clause_data,
    compliance_check=compliance_data,
    risk_assessment=risk_data
)

# Calculate risk score
risk_score = await agent.calculate_risk_score(input_data)

print(f"Overall Risk: {risk_score.composite_score * 100:.1f}%")
print(f"Status: {risk_score.status.value}")
print(f"Requires Review: {risk_score.requires_human_review}")
```

### Custom Weights and Thresholds

```python
from types.risk_scoring_types import RiskWeights, RiskThresholds

# Custom weights
weights = RiskWeights(
    legal=0.4,       # 40%
    financial=0.3,   # 30%
    compliance=0.3   # 30%
)

# Custom thresholds
thresholds = RiskThresholds(
    low_risk=0.3,
    medium_risk=0.6,
    high_risk=1.0
)

agent = RiskScoringAgent(weights=weights, thresholds=thresholds)
```

### With AWS Services

```python
from services.dynamodb_service import DynamoDBService
from services.s3_service import S3Service

# Initialize services
dynamo = DynamoDBService('RiskScoringResults')
s3 = S3Service('contract-risk-reports')

# Calculate risk score
risk_score = await agent.calculate_risk_score(input_data)

# Save to DynamoDB
dynamo.save_risk_score(risk_score)

# Save report to S3
s3_key = s3.save_risk_report(risk_score)
html_key = s3.save_risk_report_html(risk_score)
```

## Sample Scenarios

### Scenario 1: Low Risk (17%) → Auto-Approved

```python
from examples.sample_scenarios import scenario_1_low_risk

result = await agent.calculate_risk_score(scenario_1_low_risk)
# Expected: composite_score ~0.17, status: auto_approved
```

### Scenario 2: Medium Risk (50%) → Review Recommended

```python
from examples.sample_scenarios import scenario_2_medium_risk

result = await agent.calculate_risk_score(scenario_2_medium_risk)
# Expected: composite_score ~0.5, status: review_recommended
```

### Scenario 3: High Risk (80%) → Mandatory HITL

```python
from examples.sample_scenarios import scenario_3_high_risk

result = await agent.calculate_risk_score(scenario_3_high_risk)
# Expected: composite_score ~0.8, status: mandatory_review
```

## AWS Lambda Deployment

### Package Lambda Function

```bash
# Install dependencies in a directory
pip install -r requirements.txt -t lambda_package/

# Copy source code
cp -r core services types lambda_handler lambda_package/

# Create deployment package
cd lambda_package
zip -r ../risk-scoring-lambda.zip .
```

### Deploy with AWS CLI

```bash
aws lambda create-function \
  --function-name RiskScoringAgent \
  --runtime python3.11 \
  --handler lambda_handler.risk_scoring_handler.lambda_handler \
  --zip-file fileb://risk-scoring-lambda.zip \
  --role arn:aws:iam::123456789012:role/RiskScoringLambdaRole \
  --timeout 300 \
  --memory-size 1024 \
  --environment Variables="{DYNAMODB_TABLE_NAME=RiskScoringResults,S3_BUCKET_NAME=contract-risk-reports}"
```

### Deploy with SAM/CloudFormation

See `template.yaml` for complete SAM template.

## Testing

```bash
# Run all tests
pytest

# Run with verbose output
pytest -v

# Run specific test class
pytest tests/test_risk_scoring_agent.py::TestRiskScoringAgent

# Run with coverage report
pytest --cov=core --cov=services --cov-report=html

# View coverage report
open htmlcov/index.html
```

## Development

### Code Formatting

```bash
# Format code with black
black .

# Sort imports
isort .

# Lint with flake8
flake8 .

# Type checking with mypy
mypy core/ services/
```

### Pre-commit Hooks

```bash
# Install pre-commit
pip install pre-commit

# Install hooks
pre-commit install

# Run manually
pre-commit run --all-files
```

## API Reference

### RiskScoringAgent

```python
class RiskScoringAgent:
    def __init__(
        self,
        weights: Optional[RiskWeights] = None,
        thresholds: Optional[RiskThresholds] = None
    )

    async def calculate_risk_score(
        self,
        input_data: RiskScoringInput
    ) -> RiskScoreOutput
```

### Output Structure

```python
RiskScoreOutput(
    contract_id: str,
    timestamp: str,

    # Individual scores
    legal_risk: RiskDimensionScore,
    financial_risk: RiskDimensionScore,
    compliance_risk: RiskDimensionScore,

    # Composite
    composite_score: float,  # 0.0 - 1.0
    composite_severity: RiskSeverity,  # low, medium, high, critical

    # Narrative
    executive_summary: str,
    detailed_narrative: str,
    recommendations: List[str],

    # Status
    status: ContractStatus,
    requires_human_review: bool,
    escalation_reason: Optional[str],

    # Metadata
    confidence_score: float,
    processing_metadata: ProcessingMetadata
)
```

## Performance

- **Processing Time**: < 2 seconds per contract
- **AWS Lambda**: Cold start ~3s, warm ~500ms
- **DynamoDB**: < 50ms read/write latency
- **S3**: < 100ms report generation
- **Bedrock**: ~2-5s for narrative enhancement

## Security

- All data encrypted at rest (AES-256)
- TLS 1.2+ for data in transit
- IAM role-based access control
- No hardcoded credentials
- Complete audit trail in CloudWatch
- GDPR, HIPAA, SOC2 compliant infrastructure

## Support

**Email**: support@tcs-riskai.com
**Phone**: +1-800-RISK-AI
**Hours**: 9:00 AM - 6:00 PM EST, Monday - Friday

## License

Copyright © 2024 TCS. All rights reserved.

## Version History

- **v1.0.0** (2024-01-15) - Initial Python release
  - Multi-dimensional risk scoring
  - AWS Lambda deployment
  - DynamoDB, S3, A2I, Bedrock integration
  - Sample scenarios
  - Comprehensive test suite
  - Type-safe with Pydantic models

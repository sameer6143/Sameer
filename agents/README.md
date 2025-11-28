# Risk Scoring Agent - Comprehensive Documentation

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Core Components](#core-components)
4. [Installation](#installation)
5. [Configuration](#configuration)
6. [Usage](#usage)
7. [Sample Scenarios](#sample-scenarios)
8. [API Reference](#api-reference)
9. [Deployment](#deployment)
10. [Monitoring & Logging](#monitoring--logging)
11. [Security](#security)
12. [Troubleshooting](#troubleshooting)
13. [Support](#support)

---

## Overview

The **Risk Scoring Agent** is an AI-powered contract risk assessment system that evaluates contracts across three critical dimensions:

- **Legal Risk**: Analyzes indemnities, liabilities, dispute clauses, and legal exposure
- **Financial Risk**: Evaluates penalties, payment terms, and financial obligations
- **Compliance Risk**: Checks GDPR, HIPAA, and other regulatory adherence

### Key Features

✅ **Multi-Dimensional Risk Analysis** - Legal, Financial, and Compliance scoring
✅ **Automated Escalation** - High-risk contracts automatically routed to human reviewers
✅ **AI-Enhanced Narratives** - Amazon Bedrock (Claude) generates clear explanations
✅ **Scalable Architecture** - AWS Lambda, DynamoDB, S3, and A2I integration
✅ **Comprehensive Reporting** - JSON and HTML risk reports
✅ **Audit Trail** - Complete tracking of risk assessments and reviewer feedback
✅ **Configurable Weights** - Customize scoring based on your organization's priorities

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Contract Analysis Pipeline                    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
        ┌──────────────────────────────────────────┐
        │   Clause Extractor Agent (Upstream)      │
        │   Compliance Check Agent (Upstream)      │
        │   Risk Assessment Agent (Upstream)       │
        └──────────────────┬───────────────────────┘
                           │
                           ▼
        ┌─────────────────────────────────────────────┐
        │      AWS Lambda: Risk Scoring Handler       │
        │  ┌───────────────────────────────────────┐  │
        │  │     Risk Scoring Agent (Core)         │  │
        │  │  • Legal Risk Calculation             │  │
        │  │  • Financial Risk Calculation         │  │
        │  │  • Compliance Risk Calculation        │  │
        │  │  • Composite Score Generation         │  │
        │  └───────────────────────────────────────┘  │
        └──────────┬──────────────┬──────────┬────────┘
                   │              │          │
                   ▼              ▼          ▼
        ┌──────────────┐  ┌──────────┐  ┌────────────┐
        │   DynamoDB   │  │    S3    │  │  Bedrock   │
        │ Risk Scores  │  │ Reports  │  │  (Claude)  │
        └──────────────┘  └──────────┘  └────────────┘
                   │
                   ▼
        ┌─────────────────────────────┐
        │   Amazon A2I (High Risk)    │
        │   Human-in-the-Loop Review  │
        └─────────────────────────────┘
```

---

## Core Components

### 1. Risk Scoring Agent (`core/risk-scoring-agent.ts`)

Main orchestrator that calculates risk scores across all dimensions.

**Key Methods:**
- `calculateRiskScore()` - Entry point for risk assessment
- `calculateLegalRisk()` - Analyzes legal exposure
- `calculateFinancialRisk()` - Evaluates financial impact
- `calculateComplianceRisk()` - Checks regulatory compliance

### 2. Lambda Handler (`lambda/risk-scoring-handler.ts`)

AWS Lambda function handler for serverless execution.

**Endpoints:**
- `POST /risk-score` - Calculate risk score
- `GET /health` - Health check
- Batch processing via S3 events

### 3. Services

#### DynamoDB Service (`services/dynamodb-service.ts`)
- Store and retrieve risk scores
- Query risk score history
- Manage reviewer feedback
- Update human loop status

#### S3 Service (`services/s3-service.ts`)
- Save risk reports (JSON & HTML)
- Generate formatted reports
- Archive contract documents

#### A2I Service (`services/a2i-service.ts`)
- Create human review loops
- Monitor review status
- Escalate high-risk contracts

#### Bedrock Service (`services/bedrock-service.ts`)
- Enhance narrative clarity
- Generate executive summaries
- Provide AI-powered recommendations

---

## Installation

### Prerequisites

- Node.js 18.x or later
- AWS Account with appropriate permissions
- AWS CLI configured
- TypeScript 5.x

### Setup

```bash
# Clone the repository
cd agents

# Install dependencies
npm install

# Build TypeScript
npm run build

# Run tests
npm test

# Run sample scenarios
npm run scenarios
```

---

## Configuration

### Environment Variables

Create a `.env` file in the `agents/` directory:

```env
# AWS Configuration
AWS_REGION=us-east-1

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

# Risk Scoring Weights (must sum to 1.0)
LEGAL_WEIGHT=0.33
FINANCIAL_WEIGHT=0.33
COMPLIANCE_WEIGHT=0.34

# Risk Thresholds
LOW_RISK_THRESHOLD=0.4
MEDIUM_RISK_THRESHOLD=0.7
HIGH_RISK_THRESHOLD=1.0

# Escalation Settings
ENABLE_AUTO_ESCALATION=true
ENABLE_REVIEWER_SAMPLING=true
SAMPLING_RATE=0.1
```

### AWS Infrastructure Setup

#### 1. DynamoDB Table

```bash
aws dynamodb create-table \
  --table-name RiskScoringResults \
  --attribute-definitions \
    AttributeName=pk,AttributeType=S \
    AttributeName=sk,AttributeType=S \
  --key-schema \
    AttributeName=pk,KeyType=HASH \
    AttributeName=sk,KeyType=RANGE \
  --billing-mode PAY_PER_REQUEST \
  --stream-specification StreamEnabled=true,StreamViewType=NEW_AND_OLD_IMAGES
```

#### 2. S3 Bucket

```bash
aws s3 mb s3://contract-risk-reports
aws s3api put-bucket-encryption \
  --bucket contract-risk-reports \
  --server-side-encryption-configuration '{
    "Rules": [{
      "ApplyServerSideEncryptionByDefault": {
        "SSEAlgorithm": "AES256"
      }
    }]
  }'
```

#### 3. Lambda Function

```bash
# Package the Lambda function
npm run build
zip -r risk-scoring-lambda.zip dist/ node_modules/

# Create Lambda function
aws lambda create-function \
  --function-name RiskScoringAgent \
  --runtime nodejs18.x \
  --handler dist/lambda/risk-scoring-handler.handler \
  --zip-file fileb://risk-scoring-lambda.zip \
  --role arn:aws:iam::123456789012:role/RiskScoringLambdaRole \
  --timeout 300 \
  --memory-size 1024 \
  --environment Variables={...}
```

---

## Usage

### Programmatic Usage

```typescript
import { RiskScoringAgent } from './core/risk-scoring-agent';
import { RiskScoringInput } from './types/risk-scoring.types';

// Initialize agent
const agent = new RiskScoringAgent();

// Prepare input
const input: RiskScoringInput = {
  contractId: 'CONTRACT-2024-001',
  clauseExtraction: { /* ... */ },
  complianceCheck: { /* ... */ },
  riskAssessment: { /* ... */ },
};

// Calculate risk score
const riskScore = await agent.calculateRiskScore(input);

console.log(`Overall Risk: ${(riskScore.compositeScore * 100).toFixed(1)}%`);
console.log(`Status: ${riskScore.status}`);
console.log(`Requires Review: ${riskScore.requiresHumanReview}`);
```

### Lambda Invocation

```bash
# Invoke Lambda directly
aws lambda invoke \
  --function-name RiskScoringAgent \
  --payload file://sample-input.json \
  response.json

# Via API Gateway
curl -X POST https://api.example.com/risk-score \
  -H "Content-Type: application/json" \
  -d @sample-input.json
```

---

## Sample Scenarios

The agent includes three reference scenarios from the design document:

### Scenario 1: Low Risk Contract ✅

**Input:**
- No major compliance violations
- Strong indemnity clauses
- Standard payment terms

**Expected Output:**
- Legal Risk: 20% (Low)
- Financial Risk: 10% (Low)
- Compliance Risk: 20% (Low)
- **Overall: 17% → Auto-Approved**

### Scenario 2: Medium Risk Contract ⚠️

**Input:**
- Weak liability clauses
- Delayed breach notification

**Expected Output:**
- Legal Risk: 50% (Medium)
- Financial Risk: 40% (Medium)
- Compliance Risk: 60% (Medium)
- **Overall: 50% → Review Recommended**

### Scenario 3: High Risk Contract ❌

**Input:**
- Missing GDPR compliance terms
- High penalty exposure

**Expected Output:**
- Legal Risk: 70% (High)
- Financial Risk: 80% (High)
- Compliance Risk: 90% (High)
- **Overall: 80% → Mandatory HITL Escalation**

### Running Scenarios

```bash
# Run all sample scenarios
npm run scenarios

# Or programmatically
import { runAllScenarios } from './examples/sample-scenarios';
await runAllScenarios();
```

---

## API Reference

### RiskScoringAgent

#### `calculateRiskScore(input: RiskScoringInput): Promise<RiskScoreOutput>`

Calculates comprehensive risk score.

**Parameters:**
- `input.contractId` - Unique contract identifier
- `input.clauseExtraction` - Output from Clause Extractor Agent
- `input.complianceCheck` - Output from Compliance Check Agent
- `input.riskAssessment` - Output from Risk Assessment Agent
- `input.customWeights` - Optional custom weights

**Returns:** `RiskScoreOutput` with:
- Individual dimension scores (legal, financial, compliance)
- Composite score and severity
- Executive summary and detailed narrative
- Recommendations
- Escalation status

---

## Deployment

### AWS SAM Template

```yaml
AWSTemplateFormatVersion: '2010-09-09'
Transform: AWS::Serverless-2016-10-31

Resources:
  RiskScoringFunction:
    Type: AWS::Serverless::Function
    Properties:
      FunctionName: RiskScoringAgent
      Runtime: nodejs18.x
      Handler: dist/lambda/risk-scoring-handler.handler
      Timeout: 300
      MemorySize: 1024
      Environment:
        Variables:
          DYNAMODB_TABLE_NAME: !Ref RiskScoringTable
          S3_BUCKET_NAME: !Ref RiskReportsBucket
      Policies:
        - DynamoDBCrudPolicy:
            TableName: !Ref RiskScoringTable
        - S3CrudPolicy:
            BucketName: !Ref RiskReportsBucket
        - Statement:
            Effect: Allow
            Action:
              - bedrock:InvokeModel
              - sagemaker:StartHumanLoop
            Resource: '*'
```

Deploy with:
```bash
sam build
sam deploy --guided
```

---

## Monitoring & Logging

### CloudWatch Metrics

Key metrics to monitor:
- `RiskScoreCalculations` - Total number of risk assessments
- `HighRiskEscalations` - Contracts escalated to human review
- `ProcessingTime` - Average calculation time
- `ErrorRate` - Failed risk score calculations

### CloudWatch Logs

Logs include:
- Risk calculation details
- DynamoDB operations
- S3 report generation
- A2I human loop creation
- Bedrock API calls

### Example Query

```sql
fields @timestamp, contractId, compositeScore, status
| filter @message like /Risk score saved/
| stats count() by status
```

---

## Security

### IAM Permissions

Minimum required permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:PutItem",
        "dynamodb:GetItem",
        "dynamodb:Query",
        "dynamodb:UpdateItem"
      ],
      "Resource": "arn:aws:dynamodb:*:*:table/RiskScoringResults"
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject"
      ],
      "Resource": "arn:aws:s3:::contract-risk-reports/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "bedrock:InvokeModel"
      ],
      "Resource": "arn:aws:bedrock:*:*:model/anthropic.claude-v2"
    },
    {
      "Effect": "Allow",
      "Action": [
        "sagemaker:StartHumanLoop",
        "sagemaker:DescribeHumanLoop"
      ],
      "Resource": "*"
    }
  ]
}
```

### Data Encryption

- **At Rest**: All data encrypted with AES-256 (DynamoDB, S3)
- **In Transit**: TLS 1.2+ for all API calls
- **Key Management**: AWS KMS for encryption keys

### Compliance

- GDPR-compliant data handling
- HIPAA-eligible deployment options
- SOC 2 Type II compliant infrastructure
- Complete audit trail in CloudWatch

---

## Troubleshooting

### Common Issues

#### 1. High Processing Time

**Symptom:** Risk scoring takes > 10 seconds

**Solutions:**
- Increase Lambda memory to 2048 MB
- Optimize clause extraction input (reduce clause count)
- Enable DynamoDB provisioned capacity
- Use Bedrock caching for repeated narratives

#### 2. Escalation Not Triggering

**Symptom:** High-risk contracts not escalating to A2I

**Solutions:**
- Verify `ENABLE_AUTO_ESCALATION=true`
- Check A2I flow definition ARN
- Verify IAM permissions for SageMaker A2I
- Review threshold configuration

#### 3. DynamoDB Throttling

**Symptom:** `ProvisionedThroughputExceededException`

**Solutions:**
- Switch to on-demand billing mode
- Increase provisioned capacity
- Implement exponential backoff
- Use batch operations where possible

---

## Support

### Contact Information

**Email:** support@tcs-riskai.com
**Phone:** +1-800-RISK-AI
**Hours:** 9:00 AM - 6:00 PM EST, Monday - Friday

### Resources

- [Design Document](./docs/design-document.md)
- [API Documentation](./docs/api-reference.md)
- [Sample Code](./examples/)
- [AWS Well-Architected Review](./docs/well-architected.md)

### Reporting Issues

For bugs or feature requests:
1. Check existing GitHub issues
2. Provide sample contract input (sanitized)
3. Include CloudWatch logs
4. Specify AWS region and Lambda version

---

## License

Copyright © 2024 TCS. All rights reserved.

---

## Version History

- **v1.0.0** (2024-01-15) - Initial release
  - Multi-dimensional risk scoring
  - AWS Lambda deployment
  - DynamoDB, S3, A2I, Bedrock integration
  - Sample scenarios and comprehensive documentation

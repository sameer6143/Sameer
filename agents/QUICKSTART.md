# Risk Scoring Agent - Quick Start Guide

This guide will help you get started with the Risk Scoring Agent in 5 minutes.

## Prerequisites

- Node.js 18+ installed
- AWS account (optional for local testing)
- Basic understanding of TypeScript

## Installation

```bash
cd agents
npm install
npm run build
```

## Run Sample Scenarios

```bash
npm run scenarios
```

This will execute all three sample scenarios from the design document:

1. **Low Risk Contract** → Auto-approved
2. **Medium Risk Contract** → Review recommended
3. **High Risk Contract** → Mandatory escalation

## Basic Usage

### 1. Import the Agent

```typescript
import { RiskScoringAgent } from './core/risk-scoring-agent';
import { RiskScoringInput } from './types/risk-scoring.types';
```

### 2. Prepare Input

```typescript
const input: RiskScoringInput = {
  contractId: 'YOUR-CONTRACT-ID',
  clauseExtraction: {
    // Output from Clause Extractor Agent
  },
  complianceCheck: {
    // Output from Compliance Check Agent
  },
  riskAssessment: {
    // Output from Risk Assessment Agent
  },
};
```

### 3. Calculate Risk Score

```typescript
const agent = new RiskScoringAgent();
const result = await agent.calculateRiskScore(input);

console.log(`Overall Risk: ${(result.compositeScore * 100).toFixed(1)}%`);
console.log(`Status: ${result.status}`);
```

## Understanding the Output

### Risk Scores

- **0-40%**: Low Risk → Auto-approved
- **40-70%**: Medium Risk → Review recommended
- **70-100%**: High Risk → Mandatory escalation

### Key Output Fields

```typescript
{
  compositeScore: 0.5,           // Overall risk (0-1)
  compositeSeverity: "medium",   // low | medium | high | critical
  status: "review_recommended",  // Contract status
  requiresHumanReview: false,    // Escalation flag

  legalRisk: { ... },            // Legal dimension score
  financialRisk: { ... },        // Financial dimension score
  complianceRisk: { ... },       // Compliance dimension score

  executiveSummary: "...",       // Brief summary
  detailedNarrative: "...",      // Full analysis
  recommendations: [...]         // Action items
}
```

## Sample Scenarios

### Scenario 1: Low Risk

```typescript
import { scenario1LowRisk } from './examples/sample-scenarios';

const result = await agent.calculateRiskScore(scenario1LowRisk);
// Expected: compositeScore ~0.17, status: auto_approved
```

### Scenario 2: Medium Risk

```typescript
import { scenario2MediumRisk } from './examples/sample-scenarios';

const result = await agent.calculateRiskScore(scenario2MediumRisk);
// Expected: compositeScore ~0.5, status: review_recommended
```

### Scenario 3: High Risk

```typescript
import { scenario3HighRisk } from './examples/sample-scenarios';

const result = await agent.calculateRiskScore(scenario3HighRisk);
// Expected: compositeScore ~0.8, status: mandatory_review
```

## Configuration

### Custom Weights

```typescript
const agent = new RiskScoringAgent(
  {
    legal: 0.4,      // 40% weight
    financial: 0.3,  // 30% weight
    compliance: 0.3  // 30% weight
  },
  {
    lowRisk: 0.4,
    mediumRisk: 0.7,
    highRisk: 1.0
  }
);
```

### Custom Thresholds

```typescript
const agent = new RiskScoringAgent(
  { legal: 0.33, financial: 0.33, compliance: 0.34 },
  {
    lowRisk: 0.3,    // Stricter threshold
    mediumRisk: 0.6, // Stricter threshold
    highRisk: 1.0
  }
);
```

## Testing

```bash
# Run all tests
npm test

# Run with coverage
npm test:coverage

# Watch mode
npm test:watch
```

## Next Steps

1. **Read the [README](./README.md)** for comprehensive documentation
2. **Review [Sample Scenarios](./examples/sample-scenarios.ts)** for implementation examples
3. **Explore the [API Reference](./README.md#api-reference)** for detailed method documentation
4. **Set up AWS infrastructure** for production deployment

## Common Use Cases

### 1. Integrate with Existing Pipeline

```typescript
async function processContract(contractId: string) {
  // Step 1: Extract clauses
  const clauses = await clauseExtractorAgent.extract(contractId);

  // Step 2: Check compliance
  const compliance = await complianceCheckAgent.check(contractId);

  // Step 3: Assess risks
  const risks = await riskAssessmentAgent.assess(contractId);

  // Step 4: Calculate risk score
  const riskScore = await riskScoringAgent.calculateRiskScore({
    contractId,
    clauseExtraction: clauses,
    complianceCheck: compliance,
    riskAssessment: risks,
  });

  return riskScore;
}
```

### 2. Batch Processing

```typescript
async function processMultipleContracts(contractIds: string[]) {
  const results = await Promise.all(
    contractIds.map(id => processContract(id))
  );

  // Filter high-risk contracts
  const highRisk = results.filter(r => r.requiresHumanReview);

  return { results, highRisk };
}
```

### 3. Custom Reporting

```typescript
async function generateRiskReport(contractId: string) {
  const riskScore = await agent.calculateRiskScore(input);

  // Generate HTML report
  const htmlReport = generateHtmlReport(riskScore);

  // Save to file
  fs.writeFileSync(`${contractId}-report.html`, htmlReport);

  return riskScore;
}
```

## Troubleshooting

### Issue: "Module not found"

**Solution:** Run `npm install` and `npm run build`

### Issue: "TypeError: agent.calculateRiskScore is not a function"

**Solution:** Ensure you're importing from the correct path:
```typescript
import { RiskScoringAgent } from './core/risk-scoring-agent';
```

### Issue: Test failures

**Solution:** Ensure all dependencies are installed and TypeScript is compiled:
```bash
npm install
npm run build
npm test
```

## Support

- **Email:** support@tcs-riskai.com
- **Phone:** +1-800-RISK-AI
- **Hours:** 9:00 AM - 6:00 PM EST, Monday - Friday

## Additional Resources

- [Full Documentation](./README.md)
- [Design Document](./docs/design-document.md)
- [API Reference](./README.md#api-reference)
- [AWS Deployment Guide](./README.md#deployment)

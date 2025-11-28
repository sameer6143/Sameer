# Risk Assessment Agent

A comprehensive risk assessment system for e-commerce transactions, designed to detect fraud, evaluate transaction risks, and provide actionable recommendations.

## Features

- **Multi-Factor Risk Analysis**: Evaluates customer, transaction, payment, shipping, and behavioral risks
- **Fraud Detection**: Advanced pattern matching for common fraud scenarios
- **Velocity Checks**: Monitors transaction frequency and volume
- **IP Reputation**: Analyzes IP addresses for suspicious activity
- **Device Fingerprinting**: Tracks and analyzes device patterns
- **Real-time Scoring**: Provides immediate risk scores and recommendations
- **Configurable Thresholds**: Customize risk levels and automated actions

## Architecture

### Core Components

1. **RiskAssessmentAgent** (`riskAssessmentAgent.ts`): Main assessment engine
2. **FraudDetector** (`fraudDetection.ts`): Specialized fraud detection algorithms
3. **API Route** (`api.risk-assessment.tsx`): REST API endpoint
4. **Helpers** (`riskAssessment.helpers.ts`): Integration utilities
5. **Types** (`riskAssessment.types.ts`): TypeScript type definitions

## Usage

### Basic Usage

```typescript
import { riskAssessmentAgent } from '~/services/riskAssessmentAgent';
import type { RiskAssessmentInput } from '~/services/riskAssessment.types';

const input: RiskAssessmentInput = {
  customer: {
    email: 'customer@example.com',
    isNewCustomer: false,
    previousOrders: 5,
    previousReturns: 0,
    averageOrderValue: 150,
    emailVerified: true,
    phoneVerified: true,
  },
  transaction: {
    amount: 299.99,
    currency: 'USD',
    items: [
      { productId: 'prod_123', quantity: 1, price: 299.99 }
    ],
    shippingAddress: {
      country: 'US',
      city: 'New York',
      postalCode: '10001',
      address: '123 Main St',
    },
    billingAddress: {
      country: 'US',
      city: 'New York',
      postalCode: '10001',
      address: '123 Main St',
    },
    paymentMethod: 'credit_card',
    timestamp: new Date(),
  },
};

const result = await riskAssessmentAgent.assess(input);

console.log(`Risk Level: ${result.overallRiskLevel}`);
console.log(`Score: ${result.overallScore}`);
console.log(`Should Block: ${result.shouldBlock}`);
console.log(`Recommendations:`, result.recommendations);
```

### API Usage

```bash
curl -X POST http://localhost:3000/api/risk-assessment \
  -H "Content-Type: application/json" \
  -d '{
    "customer": {
      "email": "customer@example.com",
      "isNewCustomer": false,
      "previousOrders": 5,
      "previousReturns": 0,
      "averageOrderValue": 150,
      "emailVerified": true,
      "phoneVerified": true
    },
    "transaction": {
      "amount": 299.99,
      "currency": "USD",
      "items": [{"productId": "prod_123", "quantity": 1, "price": 299.99}],
      "shippingAddress": {"country": "US", "city": "New York", "postalCode": "10001", "address": "123 Main St"},
      "billingAddress": {"country": "US", "city": "New York", "postalCode": "10001", "address": "123 Main St"},
      "paymentMethod": "credit_card",
      "timestamp": "2024-01-01T12:00:00Z"
    }
  }'
```

### Integration with Shopify Cart

```typescript
import { createCustomerProfile, createTransactionData, assessRisk } from '~/services/riskAssessment.helpers';

// In your checkout handler
const customerProfile = createCustomerProfile(shopifyCustomer);
const transactionData = createTransactionData(cart, orderDetails);

const assessment = await assessRisk({
  customer: customerProfile,
  transaction: transactionData,
  sessionData: {
    userAgent: request.headers.get('user-agent'),
    sessionDuration: 120,
    pagesVisited: 5,
  },
});

if (assessment.shouldBlock) {
  // Block the transaction
  return redirect('/checkout/blocked');
}

if (assessment.shouldReview) {
  // Hold for manual review
  return redirect('/checkout/review-pending');
}

// Proceed with order
```

## Risk Categories

### 1. Fraud Risk
- Card testing detection
- Velocity abuse monitoring
- Bulk purchase patterns
- Suspicious email patterns

### 2. Account Risk
- New customer assessment
- Account age verification
- Email/phone verification status
- Historical behavior analysis

### 3. Payment Risk
- Payment method evaluation
- Currency risk assessment
- Transaction amount analysis

### 4. Shipping Risk
- Address mismatch detection
- High-risk country identification
- P.O. Box detection
- Address manipulation patterns

### 5. Behavioral Risk
- Session duration analysis
- Browsing pattern evaluation
- Purchase velocity monitoring

## Risk Levels

- **LOW** (0-29): Minimal risk, safe to process
- **MEDIUM** (30-59): Moderate risk, consider verification
- **HIGH** (60-79): Significant risk, manual review recommended
- **CRITICAL** (80-100): Extreme risk, block transaction

## Configuration

### Custom Thresholds

```typescript
import { RiskAssessmentAgent } from '~/services/riskAssessmentAgent';

const agent = new RiskAssessmentAgent({
  lowThreshold: 0,
  mediumThreshold: 25,
  highThreshold: 55,
  criticalThreshold: 75,
  autoBlockThreshold: 85,
  manualReviewThreshold: 45,
});
```

### Custom Weights

```typescript
const agent = new RiskAssessmentAgent(
  undefined, // use default thresholds
  {
    fraud: 2.0,      // Increase fraud weight
    payment: 1.5,
    shipping: 1.0,
    account: 1.3,
    behavioral: 0.5, // Decrease behavioral weight
  }
);
```

## Fraud Detection Patterns

### Card Testing
Detects attempts to validate stolen cards through small transactions

### Velocity Abuse
Identifies abnormal transaction frequency from a single customer

### Address Manipulation
Catches inconsistencies in shipping and billing addresses

### Bulk Purchase
Flags large quantities of identical items (potential reselling)

### Email Patterns
Identifies disposable emails and suspicious patterns

## Best Practices

1. **Always verify high-risk transactions**: Don't automatically block without review
2. **Monitor false positives**: Track legitimate transactions flagged as risky
3. **Adjust thresholds**: Tune based on your business risk tolerance
4. **Combine with other systems**: Use alongside fraud protection services
5. **Log all assessments**: Keep audit trail for compliance
6. **Regular updates**: Adjust rules based on new fraud patterns

## API Response Structure

```typescript
{
  "overallRiskLevel": "MEDIUM",
  "overallScore": 45.5,
  "riskFactors": [
    {
      "category": "ACCOUNT",
      "description": "New customer account",
      "score": 15,
      "weight": 1.3,
      "severity": "MEDIUM"
    }
  ],
  "recommendations": [
    "REVIEW: Manual review required before processing",
    "Request email or phone verification before processing"
  ],
  "shouldBlock": false,
  "shouldReview": true,
  "timestamp": "2024-01-01T12:00:00Z",
  "metadata": {
    "assessmentId": "RISK-1234567890-abc123",
    "processingTime": 45
  },
  "fraudDetection": {
    "patterns": [],
    "fraudScore": 0,
    "velocityChecks": [],
    "ipReputation": null,
    "deviceAnalysis": {
      "isUnique": true,
      "riskScore": 0,
      "reason": "Device fingerprint appears unique"
    }
  }
}
```

## Testing

```typescript
// Test with various scenarios
const testCases = [
  {
    name: 'High-value new customer',
    customer: { isNewCustomer: true, emailVerified: false },
    transaction: { amount: 5000 },
  },
  {
    name: 'Repeat customer small purchase',
    customer: { isNewCustomer: false, previousOrders: 20 },
    transaction: { amount: 50 },
  },
];

for (const test of testCases) {
  const result = await riskAssessmentAgent.assess({
    customer: { email: 'test@example.com', ...test.customer },
    transaction: {
      currency: 'USD',
      items: [],
      shippingAddress: {},
      billingAddress: {},
      paymentMethod: 'credit_card',
      timestamp: new Date(),
      ...test.transaction
    },
  });

  console.log(`${test.name}: ${result.overallRiskLevel} (${result.overallScore})`);
}
```

## Monitoring and Analytics

Track these metrics for optimal performance:

- **Assessment Volume**: Number of assessments per day
- **Risk Distribution**: Percentage in each risk level
- **Block Rate**: Percentage of transactions blocked
- **False Positive Rate**: Legitimate transactions flagged
- **Processing Time**: Average time per assessment
- **Pattern Detection**: Most common fraud patterns detected

## Integration Examples

### Example 1: Checkout Flow

```typescript
export const action: ActionFunction = async ({ request }) => {
  const formData = await request.formData();
  const cart = await getCart(request);
  const customer = await getCustomer(request);

  const assessment = await assessRisk({
    customer: createCustomerProfile(customer),
    transaction: createTransactionData(cart),
  });

  if (assessment.shouldBlock) {
    return json({
      error: 'Transaction blocked',
      reason: assessment.recommendations[0]
    }, { status: 403 });
  }

  // Proceed with checkout
  return processOrder(cart);
};
```

### Example 2: Admin Review Dashboard

```typescript
export const loader: LoaderFunction = async () => {
  const pendingReviews = await db.orders.findMany({
    where: { status: 'PENDING_REVIEW' },
    include: { riskAssessment: true },
  });

  return json({ pendingReviews });
};
```

## Security Considerations

- Store sensitive data securely (PCI compliance)
- Use HTTPS for all API calls
- Implement rate limiting on API endpoints
- Log access to assessment data
- Regular security audits
- Comply with data protection regulations (GDPR, CCPA)

## Future Enhancements

- Machine learning model integration
- Real-time IP reputation services
- Advanced device fingerprinting
- Behavioral biometrics
- Integration with external fraud databases
- A/B testing framework for thresholds
- Automated rule optimization

## Support

For issues or questions:
- Check the code documentation
- Review test examples
- Adjust configuration based on your needs

## License

Internal use only - Part of Hydrogen Storefront

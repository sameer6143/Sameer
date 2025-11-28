/**
 * Risk Assessment Agent Examples
 * Demonstrates various use cases and scenarios
 */

import { riskAssessmentAgent } from './riskAssessmentAgent';
import { fraudDetector } from './fraudDetection';
import type { RiskAssessmentInput } from './riskAssessment.types';

/**
 * Example 1: Low Risk Transaction
 * Established customer making a typical purchase
 */
export async function exampleLowRisk() {
  console.log('=== Example 1: Low Risk Transaction ===\n');

  const input: RiskAssessmentInput = {
    customer: {
      email: 'loyal.customer@example.com',
      isNewCustomer: false,
      accountAge: 365, // 1 year old account
      previousOrders: 25,
      previousReturns: 1,
      averageOrderValue: 150,
      emailVerified: true,
      phoneVerified: true,
    },
    transaction: {
      amount: 149.99,
      currency: 'USD',
      items: [
        { productId: 'prod_shirt_001', quantity: 2, price: 49.99 },
        { productId: 'prod_pants_002', quantity: 1, price: 50.01 },
      ],
      shippingAddress: {
        country: 'US',
        city: 'Seattle',
        postalCode: '98101',
        address: '123 Pine Street',
      },
      billingAddress: {
        country: 'US',
        city: 'Seattle',
        postalCode: '98101',
        address: '123 Pine Street',
      },
      paymentMethod: 'credit_card',
      timestamp: new Date(),
    },
    sessionData: {
      userAgent: 'Mozilla/5.0...',
      sessionDuration: 300, // 5 minutes
      pagesVisited: 8,
    },
  };

  const result = await riskAssessmentAgent.assess(input);

  console.log(`Risk Level: ${result.overallRiskLevel}`);
  console.log(`Score: ${result.overallScore}`);
  console.log(`Should Block: ${result.shouldBlock}`);
  console.log(`Should Review: ${result.shouldReview}`);
  console.log(`\nRecommendations:`);
  result.recommendations.forEach((rec) => console.log(`- ${rec}`));
  console.log(`\n${'-'.repeat(60)}\n`);

  return result;
}

/**
 * Example 2: High Risk Transaction
 * New customer with suspicious patterns
 */
export async function exampleHighRisk() {
  console.log('=== Example 2: High Risk Transaction ===\n');

  const input: RiskAssessmentInput = {
    customer: {
      email: 'user12345678@tempmail.com', // Suspicious email
      isNewCustomer: true,
      previousOrders: 0,
      previousReturns: 0,
      averageOrderValue: 0,
      emailVerified: false,
      phoneVerified: false,
    },
    transaction: {
      amount: 3499.99, // High value
      currency: 'USD',
      items: [
        { productId: 'prod_laptop_001', quantity: 1, price: 1499.99 },
        { productId: 'prod_phone_002', quantity: 2, price: 999.99 },
      ],
      shippingAddress: {
        country: 'US',
        city: 'Miami',
        postalCode: '33101',
        address: 'P.O. Box 1234', // P.O. Box
      },
      billingAddress: {
        country: 'CA', // Different country
        city: 'Toronto',
        postalCode: 'M5H 2N2',
        address: '456 Bay Street',
      },
      paymentMethod: 'prepaid_card', // Risky payment method
      ipAddress: '192.168.1.1',
      deviceFingerprint: 'unknown',
      timestamp: new Date(),
    },
    sessionData: {
      sessionDuration: 45, // Very short
      pagesVisited: 2, // Minimal browsing
    },
  };

  const result = await riskAssessmentAgent.assess(input);

  console.log(`Risk Level: ${result.overallRiskLevel}`);
  console.log(`Score: ${result.overallScore}`);
  console.log(`Should Block: ${result.shouldBlock}`);
  console.log(`Should Review: ${result.shouldReview}`);
  console.log(`\nRisk Factors:`);
  result.riskFactors.forEach((factor) => {
    console.log(
      `- [${factor.category}] ${factor.description} (Score: ${factor.score})`
    );
  });
  console.log(`\nRecommendations:`);
  result.recommendations.forEach((rec) => console.log(`- ${rec}`));
  console.log(`\n${'-'.repeat(60)}\n`);

  return result;
}

/**
 * Example 3: Fraud Detection Patterns
 */
export async function exampleFraudDetection() {
  console.log('=== Example 3: Fraud Detection Patterns ===\n');

  const customer = {
    customerId: 'cust_fraud_001',
    email: 'abc123@mailinator.com',
    isNewCustomer: true,
    previousOrders: 0,
    previousReturns: 0,
    averageOrderValue: 0,
    emailVerified: false,
    phoneVerified: false,
  };

  const transaction = {
    amount: 9.99,
    currency: 'USD',
    items: [
      { productId: 'prod_test_001', quantity: 1, price: 9.99 },
      { productId: 'prod_test_002', quantity: 1, price: 0 },
    ],
    shippingAddress: {
      country: 'US',
      city: 'New York',
      postalCode: '10001',
      address: '123 Test St Apt 1',
    },
    billingAddress: {
      country: 'US',
      city: 'New York',
      postalCode: '10002',
      address: '123 Test St',
    },
    paymentMethod: 'credit_card',
    timestamp: new Date(),
  };

  const patterns = fraudDetector.detectFraudPatterns(customer, transaction);

  console.log('Detected Fraud Patterns:');
  patterns.forEach((pattern) => {
    console.log(
      `\n- ${pattern.name} (Confidence: ${pattern.confidence * 100}%)`
    );
    console.log(`  ${pattern.description}`);
    console.log(`  Severity: ${pattern.severity}`);
  });

  const fraudScore = fraudDetector.calculateFraudScore(patterns);
  console.log(`\nOverall Fraud Score: ${fraudScore}/100`);

  console.log(`\n${'-'.repeat(60)}\n`);

  return { patterns, fraudScore };
}

/**
 * Example 4: Velocity Checks
 */
export async function exampleVelocityChecks() {
  console.log('=== Example 4: Velocity Checks ===\n');

  const customer = {
    customerId: 'cust_velocity_001',
    email: 'customer@example.com',
    isNewCustomer: false,
    previousOrders: 5,
    previousReturns: 0,
    averageOrderValue: 100,
    emailVerified: true,
    phoneVerified: true,
  };

  // Simulate multiple transactions
  for (let i = 0; i < 12; i++) {
    const transaction = {
      amount: 50 + i * 10,
      currency: 'USD',
      items: [{ productId: `prod_${i}`, quantity: 1, price: 50 + i * 10 }],
      shippingAddress: {
        country: 'US',
        city: 'Boston',
        postalCode: '02101',
        address: '123 Main St',
      },
      billingAddress: {
        country: 'US',
        city: 'Boston',
        postalCode: '02101',
        address: '123 Main St',
      },
      paymentMethod: 'credit_card',
      timestamp: new Date(),
    };

    fraudDetector.detectFraudPatterns(customer, transaction);
  }

  // Check velocity
  const transaction = {
    amount: 200,
    currency: 'USD',
    items: [{ productId: 'prod_final', quantity: 1, price: 200 }],
    shippingAddress: {
      country: 'US',
      city: 'Boston',
      postalCode: '02101',
      address: '123 Main St',
    },
    billingAddress: {
      country: 'US',
      city: 'Boston',
      postalCode: '02101',
      address: '123 Main St',
    },
    paymentMethod: 'credit_card',
    timestamp: new Date(),
  };

  const velocityChecks = fraudDetector.performVelocityChecks(
    customer,
    transaction
  );

  console.log('Velocity Checks:');
  velocityChecks.forEach((check) => {
    console.log(`\n- ${check.type}`);
    console.log(`  Count: ${check.count}`);
    console.log(`  Threshold: ${check.threshold}`);
    console.log(`  Time Window: ${check.timeWindow} hours`);
    console.log(`  Exceeded: ${check.exceeded ? 'YES ⚠️' : 'NO ✓'}`);
  });

  console.log(`\n${'-'.repeat(60)}\n`);

  // Cleanup
  fraudDetector.clearHistory(customer.customerId);

  return velocityChecks;
}

/**
 * Example 5: Custom Configuration
 */
export async function exampleCustomConfiguration() {
  console.log('=== Example 5: Custom Configuration ===\n');

  // Create agent with stricter thresholds
  const strictAgent = new (await import('./riskAssessmentAgent')).RiskAssessmentAgent(
    {
      lowThreshold: 0,
      mediumThreshold: 20,
      highThreshold: 40,
      criticalThreshold: 60,
      autoBlockThreshold: 70,
      manualReviewThreshold: 30,
    },
    {
      fraud: 2.0, // Double fraud weight
      payment: 1.5,
      shipping: 1.2,
      account: 1.8,
      behavioral: 0.5,
    }
  );

  const input: RiskAssessmentInput = {
    customer: {
      email: 'customer@example.com',
      isNewCustomer: true,
      previousOrders: 0,
      previousReturns: 0,
      averageOrderValue: 0,
      emailVerified: false,
      phoneVerified: false,
    },
    transaction: {
      amount: 500,
      currency: 'USD',
      items: [{ productId: 'prod_001', quantity: 1, price: 500 }],
      shippingAddress: {
        country: 'US',
        city: 'Chicago',
        postalCode: '60601',
        address: '123 Main St',
      },
      billingAddress: {
        country: 'US',
        city: 'Chicago',
        postalCode: '60601',
        address: '123 Main St',
      },
      paymentMethod: 'credit_card',
      timestamp: new Date(),
    },
  };

  const defaultResult = await riskAssessmentAgent.assess(input);
  const strictResult = await strictAgent.assess(input);

  console.log('Default Configuration:');
  console.log(`  Risk Level: ${defaultResult.overallRiskLevel}`);
  console.log(`  Score: ${defaultResult.overallScore}`);
  console.log(`  Should Review: ${defaultResult.shouldReview}`);

  console.log('\nStrict Configuration:');
  console.log(`  Risk Level: ${strictResult.overallRiskLevel}`);
  console.log(`  Score: ${strictResult.overallScore}`);
  console.log(`  Should Review: ${strictResult.shouldReview}`);

  console.log(`\n${'-'.repeat(60)}\n`);

  return { defaultResult, strictResult };
}

/**
 * Run all examples
 */
export async function runAllExamples() {
  console.log('\n');
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║        RISK ASSESSMENT AGENT - USAGE EXAMPLES            ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');
  console.log('\n');

  await exampleLowRisk();
  await exampleHighRisk();
  await exampleFraudDetection();
  await exampleVelocityChecks();
  await exampleCustomConfiguration();

  console.log('All examples completed!');
}

// Uncomment to run examples
// runAllExamples().catch(console.error);

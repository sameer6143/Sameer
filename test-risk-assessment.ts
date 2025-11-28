#!/usr/bin/env node
/**
 * Simple test script for Risk Assessment Agent
 * Run with: npx tsx test-risk-assessment.ts
 */

import { riskAssessmentAgent } from './app/services/riskAssessmentAgent';
import { fraudDetector } from './app/services/fraudDetection';
import type { RiskAssessmentInput } from './app/services/riskAssessment.types';

async function testRiskAssessment() {
  console.log('\n=== Risk Assessment Agent Test ===\n');

  // Test Case 1: Low Risk
  console.log('Test 1: Low Risk Transaction');
  const lowRiskInput: RiskAssessmentInput = {
    customer: {
      email: 'customer@example.com',
      isNewCustomer: false,
      previousOrders: 10,
      previousReturns: 0,
      averageOrderValue: 100,
      emailVerified: true,
      phoneVerified: true,
    },
    transaction: {
      amount: 99.99,
      currency: 'USD',
      items: [{ productId: 'prod_001', quantity: 1, price: 99.99 }],
      shippingAddress: {
        country: 'US',
        city: 'Seattle',
        postalCode: '98101',
        address: '123 Main St',
      },
      billingAddress: {
        country: 'US',
        city: 'Seattle',
        postalCode: '98101',
        address: '123 Main St',
      },
      paymentMethod: 'credit_card',
      timestamp: new Date(),
    },
  };

  try {
    const result1 = await riskAssessmentAgent.assess(lowRiskInput);
    console.log(`✓ Risk Level: ${result1.overallRiskLevel}`);
    console.log(`✓ Score: ${result1.overallScore}`);
    console.log(`✓ Should Block: ${result1.shouldBlock}`);
    console.log(`✓ Should Review: ${result1.shouldReview}`);
  } catch (error) {
    console.error('✗ Test failed:', error);
  }

  // Test Case 2: High Risk
  console.log('\n\nTest 2: High Risk Transaction');
  const highRiskInput: RiskAssessmentInput = {
    customer: {
      email: 'test123456@tempmail.com',
      isNewCustomer: true,
      previousOrders: 0,
      previousReturns: 0,
      averageOrderValue: 0,
      emailVerified: false,
      phoneVerified: false,
    },
    transaction: {
      amount: 2999.99,
      currency: 'USD',
      items: [{ productId: 'prod_laptop', quantity: 3, price: 999.99 }],
      shippingAddress: {
        country: 'US',
        city: 'Miami',
        postalCode: '33101',
        address: 'P.O. Box 999',
      },
      billingAddress: {
        country: 'CA',
        city: 'Toronto',
        postalCode: 'M5H 2N2',
        address: '456 Bay St',
      },
      paymentMethod: 'prepaid_card',
      timestamp: new Date(),
    },
  };

  try {
    const result2 = await riskAssessmentAgent.assess(highRiskInput);
    console.log(`✓ Risk Level: ${result2.overallRiskLevel}`);
    console.log(`✓ Score: ${result2.overallScore}`);
    console.log(`✓ Should Block: ${result2.shouldBlock}`);
    console.log(`✓ Should Review: ${result2.shouldReview}`);
    console.log(`✓ Risk Factors Found: ${result2.riskFactors.length}`);
  } catch (error) {
    console.error('✗ Test failed:', error);
  }

  // Test Case 3: Fraud Detection
  console.log('\n\nTest 3: Fraud Detection Patterns');
  const fraudPatterns = fraudDetector.detectFraudPatterns(
    highRiskInput.customer,
    highRiskInput.transaction
  );

  console.log(`✓ Fraud Patterns Detected: ${fraudPatterns.length}`);
  fraudPatterns.forEach((pattern) => {
    console.log(`  - ${pattern.name}: ${(pattern.confidence * 100).toFixed(0)}% confidence`);
  });

  console.log('\n=== All Tests Completed ===\n');
}

testRiskAssessment().catch(console.error);

/**
 * Risk Assessment Agent
 * Core engine for evaluating transaction and customer risks
 */

import {
  RiskLevel,
  RiskCategory,
  RiskFactor,
  RiskAssessmentInput,
  RiskAssessmentResult,
  RiskThresholds,
  RiskWeights,
  CustomerProfile,
  TransactionData,
} from './riskAssessment.types';

export class RiskAssessmentAgent {
  private thresholds: RiskThresholds;
  private weights: RiskWeights;

  constructor(
    customThresholds?: Partial<RiskThresholds>,
    customWeights?: Partial<RiskWeights>
  ) {
    this.thresholds = {
      lowThreshold: 0,
      mediumThreshold: 30,
      highThreshold: 60,
      criticalThreshold: 80,
      autoBlockThreshold: 90,
      manualReviewThreshold: 50,
      ...customThresholds,
    };

    this.weights = {
      fraud: 1.5,
      payment: 1.2,
      shipping: 1.0,
      account: 1.3,
      behavioral: 0.8,
      ...customWeights,
    };
  }

  /**
   * Main assessment method
   */
  async assess(input: RiskAssessmentInput): Promise<RiskAssessmentResult> {
    const startTime = Date.now();
    const assessmentId = this.generateAssessmentId();

    const riskFactors: RiskFactor[] = [];

    // Run all risk assessments
    riskFactors.push(...this.assessCustomerRisk(input.customer));
    riskFactors.push(...this.assessTransactionRisk(input.transaction));
    riskFactors.push(...this.assessPaymentRisk(input.transaction));
    riskFactors.push(...this.assessShippingRisk(input.transaction));
    riskFactors.push(
      ...this.assessBehavioralRisk(input.customer, input.sessionData)
    );

    // Calculate overall score
    const overallScore = this.calculateOverallScore(riskFactors);
    const overallRiskLevel = this.determineRiskLevel(overallScore);

    // Generate recommendations
    const recommendations = this.generateRecommendations(
      riskFactors,
      overallScore
    );

    // Determine actions
    const shouldBlock = overallScore >= this.thresholds.autoBlockThreshold;
    const shouldReview = overallScore >= this.thresholds.manualReviewThreshold;

    const processingTime = Date.now() - startTime;

    return {
      overallRiskLevel,
      overallScore,
      riskFactors,
      recommendations,
      shouldBlock,
      shouldReview,
      timestamp: new Date(),
      metadata: {
        assessmentId,
        processingTime,
      },
    };
  }

  /**
   * Assess customer-related risks
   */
  private assessCustomerRisk(customer: CustomerProfile): RiskFactor[] {
    const factors: RiskFactor[] = [];

    // New customer risk
    if (customer.isNewCustomer) {
      factors.push({
        category: RiskCategory.ACCOUNT,
        description: 'New customer account',
        score: 15,
        weight: this.weights.account,
        severity: RiskLevel.MEDIUM,
      });
    }

    // Account age risk
    if (customer.accountAge !== undefined && customer.accountAge < 7) {
      const score = Math.max(0, 20 - customer.accountAge * 2);
      factors.push({
        category: RiskCategory.ACCOUNT,
        description: 'Recently created account',
        score,
        weight: this.weights.account,
        severity: this.scoreToRiskLevel(score),
      });
    }

    // Email verification
    if (!customer.emailVerified) {
      factors.push({
        category: RiskCategory.ACCOUNT,
        description: 'Unverified email address',
        score: 20,
        weight: this.weights.account,
        severity: RiskLevel.MEDIUM,
      });
    }

    // Phone verification
    if (!customer.phoneVerified) {
      factors.push({
        category: RiskCategory.ACCOUNT,
        description: 'Unverified phone number',
        score: 10,
        weight: this.weights.account,
        severity: RiskLevel.LOW,
      });
    }

    // Return rate analysis
    if (customer.previousOrders > 0) {
      const returnRate = customer.previousReturns / customer.previousOrders;
      if (returnRate > 0.5) {
        factors.push({
          category: RiskCategory.FRAUD,
          description: 'High return rate detected',
          score: Math.min(40, returnRate * 60),
          weight: this.weights.fraud,
          severity: RiskLevel.HIGH,
        });
      }
    }

    return factors;
  }

  /**
   * Assess transaction-related risks
   */
  private assessTransactionRisk(transaction: TransactionData): RiskFactor[] {
    const factors: RiskFactor[] = [];

    // High-value transaction
    if (transaction.amount > 1000) {
      const score = Math.min(30, (transaction.amount / 1000) * 10);
      factors.push({
        category: RiskCategory.FRAUD,
        description: 'High-value transaction',
        score,
        weight: this.weights.fraud,
        severity: this.scoreToRiskLevel(score),
      });
    }

    // Large quantity of items
    const totalQuantity = transaction.items.reduce(
      (sum, item) => sum + item.quantity,
      0
    );
    if (totalQuantity > 10) {
      factors.push({
        category: RiskCategory.FRAUD,
        description: 'Unusually large quantity of items',
        score: Math.min(25, totalQuantity * 1.5),
        weight: this.weights.fraud,
        severity: RiskLevel.MEDIUM,
      });
    }

    // Multiple high-value items
    const highValueItems = transaction.items.filter(
      (item) => item.price > 500
    );
    if (highValueItems.length > 3) {
      factors.push({
        category: RiskCategory.FRAUD,
        description: 'Multiple high-value items',
        score: 20,
        weight: this.weights.fraud,
        severity: RiskLevel.MEDIUM,
      });
    }

    return factors;
  }

  /**
   * Assess payment-related risks
   */
  private assessPaymentRisk(transaction: TransactionData): RiskFactor[] {
    const factors: RiskFactor[] = [];

    // Payment method risk
    const riskPaymentMethods = ['wire_transfer', 'crypto', 'prepaid_card'];
    if (riskPaymentMethods.includes(transaction.paymentMethod.toLowerCase())) {
      factors.push({
        category: RiskCategory.PAYMENT,
        description: 'High-risk payment method',
        score: 25,
        weight: this.weights.payment,
        severity: RiskLevel.MEDIUM,
      });
    }

    // Currency mismatch (if not common currencies)
    const lowRiskCurrencies = ['USD', 'EUR', 'GBP', 'CAD', 'AUD'];
    if (!lowRiskCurrencies.includes(transaction.currency.toUpperCase())) {
      factors.push({
        category: RiskCategory.PAYMENT,
        description: 'Uncommon currency for transaction',
        score: 10,
        weight: this.weights.payment,
        severity: RiskLevel.LOW,
      });
    }

    return factors;
  }

  /**
   * Assess shipping-related risks
   */
  private assessShippingRisk(transaction: TransactionData): RiskFactor[] {
    const factors: RiskFactor[] = [];

    // Billing and shipping address mismatch
    const addressMismatch =
      transaction.billingAddress.country !==
        transaction.shippingAddress.country ||
      transaction.billingAddress.city !== transaction.shippingAddress.city;

    if (addressMismatch) {
      const score =
        transaction.billingAddress.country !==
        transaction.shippingAddress.country
          ? 30
          : 15;
      factors.push({
        category: RiskCategory.SHIPPING,
        description: 'Billing and shipping address mismatch',
        score,
        weight: this.weights.shipping,
        severity: this.scoreToRiskLevel(score),
      });
    }

    // High-risk countries (example list)
    const highRiskCountries = ['XX', 'YY']; // Replace with actual high-risk country codes
    if (highRiskCountries.includes(transaction.shippingAddress.country)) {
      factors.push({
        category: RiskCategory.SHIPPING,
        description: 'Shipping to high-risk country',
        score: 35,
        weight: this.weights.shipping,
        severity: RiskLevel.HIGH,
      });
    }

    // P.O. Box detection (simple check)
    const poBoxPattern = /P\.?O\.?\s*BOX/i;
    if (poBoxPattern.test(transaction.shippingAddress.address)) {
      factors.push({
        category: RiskCategory.SHIPPING,
        description: 'Shipping to P.O. Box',
        score: 15,
        weight: this.weights.shipping,
        severity: RiskLevel.MEDIUM,
      });
    }

    return factors;
  }

  /**
   * Assess behavioral risks
   */
  private assessBehavioralRisk(
    customer: CustomerProfile,
    sessionData?: RiskAssessmentInput['sessionData']
  ): RiskFactor[] {
    const factors: RiskFactor[] = [];

    if (!sessionData) return factors;

    // Short session duration
    if (
      sessionData.sessionDuration !== undefined &&
      sessionData.sessionDuration < 60
    ) {
      factors.push({
        category: RiskCategory.BEHAVIORAL,
        description: 'Unusually short session before purchase',
        score: 20,
        weight: this.weights.behavioral,
        severity: RiskLevel.MEDIUM,
      });
    }

    // Very few pages visited
    if (
      sessionData.pagesVisited !== undefined &&
      sessionData.pagesVisited < 3
    ) {
      factors.push({
        category: RiskCategory.BEHAVIORAL,
        description: 'Minimal browsing before purchase',
        score: 15,
        weight: this.weights.behavioral,
        severity: RiskLevel.LOW,
      });
    }

    return factors;
  }

  /**
   * Calculate overall weighted risk score
   */
  private calculateOverallScore(riskFactors: RiskFactor[]): number {
    if (riskFactors.length === 0) return 0;

    const weightedSum = riskFactors.reduce(
      (sum, factor) => sum + factor.score * factor.weight,
      0
    );

    const totalWeight = riskFactors.reduce(
      (sum, factor) => sum + factor.weight,
      0
    );

    return Math.round((weightedSum / totalWeight) * 100) / 100;
  }

  /**
   * Determine risk level from score
   */
  private determineRiskLevel(score: number): RiskLevel {
    if (score >= this.thresholds.criticalThreshold) return RiskLevel.CRITICAL;
    if (score >= this.thresholds.highThreshold) return RiskLevel.HIGH;
    if (score >= this.thresholds.mediumThreshold) return RiskLevel.MEDIUM;
    return RiskLevel.LOW;
  }

  /**
   * Convert score to risk level
   */
  private scoreToRiskLevel(score: number): RiskLevel {
    if (score >= 30) return RiskLevel.HIGH;
    if (score >= 15) return RiskLevel.MEDIUM;
    return RiskLevel.LOW;
  }

  /**
   * Generate actionable recommendations
   */
  private generateRecommendations(
    riskFactors: RiskFactor[],
    overallScore: number
  ): string[] {
    const recommendations: string[] = [];

    // Critical action recommendations
    if (overallScore >= this.thresholds.autoBlockThreshold) {
      recommendations.push(
        'BLOCK: Transaction should be blocked due to critical risk level'
      );
    } else if (overallScore >= this.thresholds.manualReviewThreshold) {
      recommendations.push(
        'REVIEW: Manual review required before processing'
      );
    }

    // Category-specific recommendations
    const fraudFactors = riskFactors.filter(
      (f) => f.category === RiskCategory.FRAUD
    );
    if (fraudFactors.length > 0) {
      recommendations.push(
        'Verify customer identity using additional authentication methods'
      );
    }

    const accountFactors = riskFactors.filter(
      (f) => f.category === RiskCategory.ACCOUNT
    );
    if (accountFactors.length > 0) {
      recommendations.push(
        'Request email or phone verification before processing'
      );
    }

    const shippingFactors = riskFactors.filter(
      (f) => f.category === RiskCategory.SHIPPING
    );
    if (shippingFactors.length > 0) {
      recommendations.push('Verify shipping and billing address match');
    }

    const paymentFactors = riskFactors.filter(
      (f) => f.category === RiskCategory.PAYMENT
    );
    if (paymentFactors.length > 0) {
      recommendations.push('Consider requiring alternative payment method');
    }

    // Low risk recommendations
    if (overallScore < this.thresholds.mediumThreshold) {
      recommendations.push('Transaction appears safe to process');
    }

    return recommendations;
  }

  /**
   * Generate unique assessment ID
   */
  private generateAssessmentId(): string {
    return `RISK-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Update thresholds dynamically
   */
  updateThresholds(newThresholds: Partial<RiskThresholds>): void {
    this.thresholds = { ...this.thresholds, ...newThresholds };
  }

  /**
   * Update weights dynamically
   */
  updateWeights(newWeights: Partial<RiskWeights>): void {
    this.weights = { ...this.weights, ...newWeights };
  }
}

// Export singleton instance with default configuration
export const riskAssessmentAgent = new RiskAssessmentAgent();

/**
 * Fraud Detection Algorithms
 * Advanced fraud detection and pattern matching
 */

import {
  CustomerProfile,
  TransactionData,
  RiskLevel,
} from './riskAssessment.types';

export interface FraudPattern {
  name: string;
  detected: boolean;
  confidence: number;
  description: string;
  severity: RiskLevel;
}

export interface VelocityCheck {
  type: 'transaction_count' | 'transaction_amount' | 'failed_attempts';
  count: number;
  threshold: number;
  timeWindow: number;
  exceeded: boolean;
}

export class FraudDetector {
  // In-memory storage for demo (use database in production)
  private transactionHistory: Map<string, TransactionData[]> = new Map();
  private failedAttempts: Map<string, number> = new Map();

  /**
   * Detect various fraud patterns
   */
  detectFraudPatterns(
    customer: CustomerProfile,
    transaction: TransactionData
  ): FraudPattern[] {
    const patterns: FraudPattern[] = [];

    patterns.push(this.detectCardTesting(customer, transaction));
    patterns.push(this.detectVelocityAbuse(customer, transaction));
    patterns.push(this.detectAddressManipulation(transaction));
    patterns.push(this.detectSuspiciousEmailPattern(customer.email));
    patterns.push(this.detectBulkPurchasePattern(transaction));

    return patterns.filter((p) => p.detected);
  }

  /**
   * Detect card testing (multiple small transactions)
   */
  private detectCardTesting(
    customer: CustomerProfile,
    transaction: TransactionData
  ): FraudPattern {
    const isSmallAmount = transaction.amount < 10;
    const isNewCustomer = customer.isNewCustomer;
    const hasMultipleItems = transaction.items.length > 1;

    const detected = isSmallAmount && isNewCustomer && hasMultipleItems;
    const confidence = detected ? 0.75 : 0;

    return {
      name: 'card_testing',
      detected,
      confidence,
      description:
        'Potential card testing detected: small transaction from new account with multiple items',
      severity: RiskLevel.HIGH,
    };
  }

  /**
   * Detect velocity abuse (too many transactions in short time)
   */
  private detectVelocityAbuse(
    customer: CustomerProfile,
    transaction: TransactionData
  ): FraudPattern {
    const customerId = customer.customerId || customer.email;
    const history = this.transactionHistory.get(customerId) || [];

    // Check transactions in last hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentTransactions = history.filter(
      (t) => new Date(t.timestamp) > oneHourAgo
    );

    const velocityThreshold = 5;
    const detected = recentTransactions.length >= velocityThreshold;
    const confidence = detected
      ? Math.min(0.95, recentTransactions.length / velocityThreshold)
      : 0;

    // Store current transaction
    history.push(transaction);
    this.transactionHistory.set(customerId, history);

    return {
      name: 'velocity_abuse',
      detected,
      confidence,
      description: `Detected ${recentTransactions.length} transactions in the last hour (threshold: ${velocityThreshold})`,
      severity: RiskLevel.CRITICAL,
    };
  }

  /**
   * Detect address manipulation
   */
  private detectAddressManipulation(
    transaction: TransactionData
  ): FraudPattern {
    const shipping = transaction.shippingAddress.address.toLowerCase();
    const billing = transaction.billingAddress.address.toLowerCase();

    // Check for address variations that might indicate manipulation
    const suspiciousPatterns = [
      /apt\.?\s*#?\s*\d+/i,
      /unit\s*#?\s*\d+/i,
      /suite\s*#?\s*\d+/i,
    ];

    const shippingHasPattern = suspiciousPatterns.some((pattern) =>
      pattern.test(shipping)
    );
    const billingHasPattern = suspiciousPatterns.some((pattern) =>
      pattern.test(billing)
    );

    // If shipping has suite/apt but billing doesn't (or vice versa), it's suspicious
    const detected =
      shippingHasPattern !== billingHasPattern &&
      transaction.shippingAddress.country !==
        transaction.billingAddress.country;

    return {
      name: 'address_manipulation',
      detected,
      confidence: detected ? 0.6 : 0,
      description:
        'Address patterns suggest potential manipulation or package interception',
      severity: RiskLevel.MEDIUM,
    };
  }

  /**
   * Detect suspicious email patterns
   */
  private detectSuspiciousEmailPattern(email: string): FraudPattern {
    const suspiciousPatterns = [
      /\d{6,}/,
      /^[a-z]{1,3}\d+@/,
      /@(tempmail|throwaway|guerrillamail|mailinator)/i,
      /(.)\1{3,}/,
      /[+]/,
    ];

    const detected = suspiciousPatterns.some((pattern) => pattern.test(email));
    const confidence = detected ? 0.7 : 0;

    return {
      name: 'suspicious_email',
      detected,
      confidence,
      description:
        'Email address matches patterns commonly associated with fraud',
      severity: RiskLevel.MEDIUM,
    };
  }

  /**
   * Detect bulk purchase patterns
   */
  private detectBulkPurchasePattern(transaction: TransactionData): FraudPattern {
    const items = transaction.items;

    // Check if all items are the same
    const uniqueProductIds = new Set(items.map((item) => item.productId));
    const allSameProduct = uniqueProductIds.size === 1;

    // Check for large quantities
    const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
    const largeQuantity = totalQuantity > 20;

    const detected = allSameProduct && largeQuantity;
    const confidence = detected ? 0.65 : 0;

    return {
      name: 'bulk_purchase',
      detected,
      confidence,
      description: 'Large quantity of identical items may indicate reselling fraud',
      severity: RiskLevel.MEDIUM,
    };
  }

  /**
   * Perform velocity checks
   */
  performVelocityChecks(
    customer: CustomerProfile,
    transaction: TransactionData
  ): VelocityCheck[] {
    const customerId = customer.customerId || customer.email;
    const history = this.transactionHistory.get(customerId) || [];
    const checks: VelocityCheck[] = [];

    // Check transaction count in last 24 hours
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const last24Hours = history.filter(
      (t) => new Date(t.timestamp) > oneDayAgo
    );

    checks.push({
      type: 'transaction_count',
      count: last24Hours.length,
      threshold: 10,
      timeWindow: 24,
      exceeded: last24Hours.length > 10,
    });

    // Check total transaction amount in last 24 hours
    const totalAmount24h = last24Hours.reduce(
      (sum, t) => sum + t.amount,
      transaction.amount
    );

    checks.push({
      type: 'transaction_amount',
      count: totalAmount24h,
      threshold: 5000,
      timeWindow: 24,
      exceeded: totalAmount24h > 5000,
    });

    // Check failed attempts
    const failedCount = this.failedAttempts.get(customerId) || 0;
    checks.push({
      type: 'failed_attempts',
      count: failedCount,
      threshold: 3,
      timeWindow: 1,
      exceeded: failedCount > 3,
    });

    return checks;
  }

  /**
   * Check if IP address is suspicious
   */
  checkIpReputation(ipAddress: string): {
    isSuspicious: boolean;
    reason: string;
    confidence: number;
  } {
    // Placeholder for IP reputation check
    // In production, integrate with services like MaxMind, IPQualityScore, etc.

    // Check if IP is from known proxy/VPN ranges (example)
    const suspiciousRanges = ['10.0.0.', '192.168.'];
    const isSuspicious = suspiciousRanges.some((range) =>
      ipAddress.startsWith(range)
    );

    return {
      isSuspicious,
      reason: isSuspicious ? 'IP from suspicious range' : 'IP appears clean',
      confidence: isSuspicious ? 0.5 : 0.1,
    };
  }

  /**
   * Calculate fraud score based on patterns
   */
  calculateFraudScore(patterns: FraudPattern[]): number {
    if (patterns.length === 0) return 0;

    const weightedScore = patterns.reduce((score, pattern) => {
      const severityWeight = {
        [RiskLevel.LOW]: 1,
        [RiskLevel.MEDIUM]: 1.5,
        [RiskLevel.HIGH]: 2,
        [RiskLevel.CRITICAL]: 3,
      };

      return score + pattern.confidence * 100 * severityWeight[pattern.severity];
    }, 0);

    return Math.min(100, Math.round(weightedScore / patterns.length));
  }

  /**
   * Record failed attempt
   */
  recordFailedAttempt(customerId: string): void {
    const current = this.failedAttempts.get(customerId) || 0;
    this.failedAttempts.set(customerId, current + 1);

    // Clear after 1 hour
    setTimeout(() => {
      this.failedAttempts.delete(customerId);
    }, 60 * 60 * 1000);
  }

  /**
   * Clear transaction history (for testing or periodic cleanup)
   */
  clearHistory(customerId?: string): void {
    if (customerId) {
      this.transactionHistory.delete(customerId);
      this.failedAttempts.delete(customerId);
    } else {
      this.transactionHistory.clear();
      this.failedAttempts.clear();
    }
  }

  /**
   * Get device fingerprint analysis
   */
  analyzeDeviceFingerprint(fingerprint?: string): {
    isUnique: boolean;
    riskScore: number;
    reason: string;
  } {
    if (!fingerprint) {
      return {
        isUnique: false,
        riskScore: 20,
        reason: 'No device fingerprint provided',
      };
    }

    // In production, check fingerprint against database of known devices
    // and detect patterns like too many accounts from same fingerprint

    return {
      isUnique: true,
      riskScore: 0,
      reason: 'Device fingerprint appears unique',
    };
  }
}

// Export singleton instance
export const fraudDetector = new FraudDetector();

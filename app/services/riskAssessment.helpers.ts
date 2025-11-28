/**
 * Risk Assessment Helpers
 * Utility functions for integrating risk assessment into the application
 */

import type {
  CustomerProfile,
  TransactionData,
  RiskAssessmentInput,
  RiskAssessmentResult,
} from './riskAssessment.types';
import { RiskLevel } from './riskAssessment.types';

/**
 * Create customer profile from Shopify customer data
 */
export function createCustomerProfile(shopifyCustomer: any): CustomerProfile {
  const createdAt = shopifyCustomer?.createdAt
    ? new Date(shopifyCustomer.createdAt)
    : new Date();
  const accountAge = Math.floor(
    (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24)
  );

  return {
    customerId: shopifyCustomer?.id || undefined,
    email: shopifyCustomer?.email || '',
    isNewCustomer: !shopifyCustomer?.id || accountAge < 7,
    accountAge,
    previousOrders: shopifyCustomer?.numberOfOrders || 0,
    previousReturns: 0,
    averageOrderValue: shopifyCustomer?.averageOrderValue || 0,
    emailVerified: shopifyCustomer?.emailVerified || false,
    phoneVerified: shopifyCustomer?.phoneVerified || false,
  };
}

/**
 * Create transaction data from Shopify cart/order
 */
export function createTransactionData(
  cart: any,
  orderDetails?: any
): TransactionData {
  const lines = cart?.lines?.nodes || cart?.lines || [];

  return {
    orderId: orderDetails?.id,
    amount: parseFloat(cart?.cost?.totalAmount?.amount || '0'),
    currency: cart?.cost?.totalAmount?.currencyCode || 'USD',
    items: lines.map((line: any) => ({
      productId: line.merchandise?.product?.id || line.id || '',
      quantity: line.quantity || 1,
      price: parseFloat(line.cost?.totalAmount?.amount || '0'),
    })),
    shippingAddress: {
      country:
        orderDetails?.shippingAddress?.country ||
        cart?.deliveryAddress?.country ||
        '',
      city:
        orderDetails?.shippingAddress?.city ||
        cart?.deliveryAddress?.city ||
        '',
      postalCode:
        orderDetails?.shippingAddress?.zip ||
        cart?.deliveryAddress?.zip ||
        '',
      address:
        orderDetails?.shippingAddress?.address1 ||
        cart?.deliveryAddress?.address1 ||
        '',
    },
    billingAddress: {
      country:
        orderDetails?.billingAddress?.country ||
        cart?.billingAddress?.country ||
        '',
      city: orderDetails?.billingAddress?.city || cart?.billingAddress?.city || '',
      postalCode:
        orderDetails?.billingAddress?.zip || cart?.billingAddress?.zip || '',
      address:
        orderDetails?.billingAddress?.address1 ||
        cart?.billingAddress?.address1 ||
        '',
    },
    paymentMethod: orderDetails?.paymentMethod || 'unknown',
    timestamp: new Date(),
  };
}

/**
 * Format risk assessment result for display
 */
export function formatRiskAssessmentForDisplay(
  result: RiskAssessmentResult
): {
  summary: string;
  details: string[];
  actionRequired: string;
  color: string;
} {
  const colorMap: Record<RiskLevel, string> = {
    LOW: 'green',
    MEDIUM: 'yellow',
    HIGH: 'orange',
    CRITICAL: 'red',
  };

  const actionMap: Record<RiskLevel, string> = {
    LOW: 'No action required - proceed with order',
    MEDIUM: 'Review recommended - verify customer details',
    HIGH: 'Manual review required before processing',
    CRITICAL: 'Block transaction - high fraud risk detected',
  };

  return {
    summary: `Risk Level: ${result.overallRiskLevel} (Score: ${result.overallScore})`,
    details: result.riskFactors.map(
      (f) => `[${f.category}] ${f.description} (Score: ${f.score})`
    ),
    actionRequired: actionMap[result.overallRiskLevel],
    color: colorMap[result.overallRiskLevel],
  };
}

/**
 * Check if transaction should be allowed based on risk assessment
 */
export function shouldAllowTransaction(result: RiskAssessmentResult): {
  allowed: boolean;
  reason: string;
} {
  if (result.shouldBlock) {
    return {
      allowed: false,
      reason: 'Transaction blocked due to critical risk factors',
    };
  }

  if (result.shouldReview) {
    return {
      allowed: false,
      reason: 'Transaction requires manual review before processing',
    };
  }

  return {
    allowed: true,
    reason: 'Transaction approved',
  };
}

/**
 * Get risk badge information for UI
 */
export function getRiskBadge(
  riskLevel: RiskLevel
): { text: string; variant: string } {
  const badges = {
    LOW: { text: 'Low Risk', variant: 'success' },
    MEDIUM: { text: 'Medium Risk', variant: 'warning' },
    HIGH: { text: 'High Risk', variant: 'danger' },
    CRITICAL: { text: 'Critical Risk', variant: 'error' },
  };

  return badges[riskLevel];
}

/**
 * Calculate risk trend (for displaying historical data)
 */
export function calculateRiskTrend(
  assessments: RiskAssessmentResult[]
): {
  trend: 'increasing' | 'decreasing' | 'stable';
  averageScore: number;
  change: number;
} {
  if (assessments.length < 2) {
    return {
      trend: 'stable',
      averageScore: assessments[0]?.overallScore || 0,
      change: 0,
    };
  }

  const scores = assessments.map((a) => a.overallScore);
  const averageScore =
    scores.reduce((sum, score) => sum + score, 0) / scores.length;

  const firstHalf = scores.slice(0, Math.floor(scores.length / 2));
  const secondHalf = scores.slice(Math.floor(scores.length / 2));

  const firstAvg = firstHalf.reduce((sum, s) => sum + s, 0) / firstHalf.length;
  const secondAvg =
    secondHalf.reduce((sum, s) => sum + s, 0) / secondHalf.length;

  const change = secondAvg - firstAvg;
  const trend = change > 5 ? 'increasing' : change < -5 ? 'decreasing' : 'stable';

  return {
    trend,
    averageScore: Math.round(averageScore * 100) / 100,
    change: Math.round(change * 100) / 100,
  };
}

/**
 * Filter high-risk factors for reporting
 */
export function getHighRiskFactors(result: RiskAssessmentResult) {
  return result.riskFactors.filter(
    (f) => f.severity === RiskLevel.HIGH || f.severity === RiskLevel.CRITICAL
  );
}

/**
 * Generate risk report summary
 */
export function generateRiskReport(result: RiskAssessmentResult): string {
  const highRiskFactors = getHighRiskFactors(result);

  let report = `Risk Assessment Report\n`;
  report += `======================\n\n`;
  report += `Overall Risk Level: ${result.overallRiskLevel}\n`;
  report += `Overall Score: ${result.overallScore}\n`;
  report += `Timestamp: ${result.timestamp.toISOString()}\n`;
  report += `Assessment ID: ${result.metadata.assessmentId}\n\n`;

  if (highRiskFactors.length > 0) {
    report += `High-Risk Factors:\n`;
    highRiskFactors.forEach((factor) => {
      report += `- [${factor.category}] ${factor.description} (Score: ${factor.score})\n`;
    });
    report += `\n`;
  }

  report += `Recommendations:\n`;
  result.recommendations.forEach((rec) => {
    report += `- ${rec}\n`;
  });

  return report;
}

/**
 * Validate email for fraud patterns
 */
export function validateEmailSecurity(email: string): {
  isValid: boolean;
  issues: string[];
} {
  const issues: string[] = [];

  // Check for disposable email providers
  const disposableProviders = [
    'tempmail',
    'throwaway',
    'guerrillamail',
    'mailinator',
    '10minutemail',
  ];

  const domain = email.split('@')[1]?.toLowerCase();
  if (disposableProviders.some((provider) => domain?.includes(provider))) {
    issues.push('Disposable email provider detected');
  }

  // Check for suspicious patterns
  if (/\d{6,}/.test(email)) {
    issues.push('Email contains excessive numbers');
  }

  if (/(.)\1{3,}/.test(email)) {
    issues.push('Email contains repeated characters');
  }

  return {
    isValid: issues.length === 0,
    issues,
  };
}

/**
 * Call risk assessment API
 */
export async function assessRisk(
  input: RiskAssessmentInput
): Promise<RiskAssessmentResult> {
  const response = await fetch('/api/risk-assessment', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Risk assessment failed');
  }

  return response.json();
}

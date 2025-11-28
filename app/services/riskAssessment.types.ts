/**
 * Risk Assessment Types and Interfaces
 * For evaluating transaction and customer risks in e-commerce
 */

export enum RiskLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum RiskCategory {
  FRAUD = 'FRAUD',
  PAYMENT = 'PAYMENT',
  SHIPPING = 'SHIPPING',
  ACCOUNT = 'ACCOUNT',
  BEHAVIORAL = 'BEHAVIORAL',
}

export interface RiskFactor {
  category: RiskCategory;
  description: string;
  score: number;
  weight: number;
  severity: RiskLevel;
}

export interface CustomerProfile {
  customerId?: string;
  email: string;
  isNewCustomer: boolean;
  accountAge?: number;
  previousOrders: number;
  previousReturns: number;
  averageOrderValue: number;
  emailVerified: boolean;
  phoneVerified: boolean;
}

export interface TransactionData {
  orderId?: string;
  amount: number;
  currency: string;
  items: {
    productId: string;
    quantity: number;
    price: number;
  }[];
  shippingAddress: {
    country: string;
    city: string;
    postalCode: string;
    address: string;
  };
  billingAddress: {
    country: string;
    city: string;
    postalCode: string;
    address: string;
  };
  paymentMethod: string;
  ipAddress?: string;
  deviceFingerprint?: string;
  timestamp: Date;
}

export interface RiskAssessmentInput {
  customer: CustomerProfile;
  transaction: TransactionData;
  sessionData?: {
    userAgent?: string;
    sessionDuration?: number;
    pagesVisited?: number;
  };
}

export interface RiskAssessmentResult {
  overallRiskLevel: RiskLevel;
  overallScore: number;
  riskFactors: RiskFactor[];
  recommendations: string[];
  shouldBlock: boolean;
  shouldReview: boolean;
  timestamp: Date;
  metadata: {
    assessmentId: string;
    processingTime: number;
  };
}

export interface RiskThresholds {
  lowThreshold: number;
  mediumThreshold: number;
  highThreshold: number;
  criticalThreshold: number;
  autoBlockThreshold: number;
  manualReviewThreshold: number;
}

export interface RiskWeights {
  fraud: number;
  payment: number;
  shipping: number;
  account: number;
  behavioral: number;
}

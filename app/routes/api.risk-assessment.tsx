/**
 * Risk Assessment API Route
 * Endpoint for performing risk assessments on transactions
 */

import { json, type ActionFunction } from '@remix-run/node';
import { riskAssessmentAgent } from '~/services/riskAssessmentAgent';
import { fraudDetector } from '~/services/fraudDetection';
import type {
  RiskAssessmentInput,
  RiskAssessmentResult,
} from '~/services/riskAssessment.types';

export const action: ActionFunction = async ({ request }) => {
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const body = await request.json();

    // Validate input
    const validationError = validateInput(body);
    if (validationError) {
      return json({ error: validationError }, { status: 400 });
    }

    const input: RiskAssessmentInput = body;

    // Extract IP address from request
    const ipAddress =
      request.headers.get('x-forwarded-for') ||
      request.headers.get('x-real-ip') ||
      'unknown';

    if (input.transaction) {
      input.transaction.ipAddress = ipAddress;
    }

    // Perform risk assessment
    const assessment = await riskAssessmentAgent.assess(input);

    // Perform fraud detection
    const fraudPatterns = fraudDetector.detectFraudPatterns(
      input.customer,
      input.transaction
    );

    const velocityChecks = fraudDetector.performVelocityChecks(
      input.customer,
      input.transaction
    );

    // IP reputation check
    let ipReputation = null;
    if (input.transaction.ipAddress) {
      ipReputation = fraudDetector.checkIpReputation(
        input.transaction.ipAddress
      );
    }

    // Device fingerprint analysis
    const deviceAnalysis = fraudDetector.analyzeDeviceFingerprint(
      input.transaction.deviceFingerprint
    );

    // Calculate fraud score
    const fraudScore = fraudDetector.calculateFraudScore(fraudPatterns);

    // Combine results
    const result = {
      ...assessment,
      fraudDetection: {
        patterns: fraudPatterns,
        fraudScore,
        velocityChecks,
        ipReputation,
        deviceAnalysis,
      },
    };

    // Return appropriate status code based on risk level
    const statusCode = assessment.shouldBlock ? 403 : 200;

    return json(result, { status: statusCode });
  } catch (error) {
    console.error('Risk assessment error:', error);
    return json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
};

/**
 * Validate input data
 */
function validateInput(body: any): string | null {
  if (!body) {
    return 'Request body is required';
  }

  if (!body.customer) {
    return 'Customer data is required';
  }

  if (!body.customer.email) {
    return 'Customer email is required';
  }

  if (!body.transaction) {
    return 'Transaction data is required';
  }

  if (typeof body.transaction.amount !== 'number') {
    return 'Transaction amount must be a number';
  }

  if (!body.transaction.currency) {
    return 'Transaction currency is required';
  }

  if (!Array.isArray(body.transaction.items)) {
    return 'Transaction items must be an array';
  }

  if (!body.transaction.shippingAddress) {
    return 'Shipping address is required';
  }

  if (!body.transaction.billingAddress) {
    return 'Billing address is required';
  }

  if (!body.transaction.paymentMethod) {
    return 'Payment method is required';
  }

  return null;
}

/**
 * GET method to retrieve configuration or health check
 */
export const loader = async () => {
  return json({
    service: 'Risk Assessment API',
    version: '1.0.0',
    status: 'operational',
    endpoints: {
      assess: {
        method: 'POST',
        path: '/api/risk-assessment',
        description: 'Perform risk assessment on a transaction',
      },
    },
  });
};

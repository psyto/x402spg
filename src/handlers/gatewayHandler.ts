import { Request, Response } from 'express';
import { PaymentVerifier } from '../services/paymentVerifier';
import { ApiProxy } from '../services/apiProxy';
import { config } from '../config';

export class GatewayHandler {
  private paymentVerifier: PaymentVerifier;
  private apiProxy: ApiProxy;

  constructor() {
    this.paymentVerifier = new PaymentVerifier();
    this.apiProxy = new ApiProxy(config.targetApiUrl);
  }

  /**
   * Get the receiver address for logging/display
   */
  getReceiverAddress(): string {
    return this.paymentVerifier.getReceiverAddress();
  }

  /**
   * Main handler for incoming requests
   */
  async handleRequest(req: Request, res: Response): Promise<void> {
    try {
      // Check for payment in request headers
      // x402 protocol typically uses a header like 'X-Payment-Signature' or similar
      const paymentSignature = req.headers['x-payment-signature'] as string;
      const paymentMemo = req.headers['x-payment-memo'] as string;

      // If no payment signature provided, return 402 with payment details
      if (!paymentSignature && !paymentMemo) {
        const paymentDetails = this.paymentVerifier.generatePaymentDetails();
        
        res.status(402).json({
          error: 'Payment Required',
          message: 'This API requires payment via x402 protocol',
          payment: {
            amount: paymentDetails.amount,
            recipient: paymentDetails.recipient,
            memo: paymentDetails.memo,
            facilitator: config.facilitatorAddress,
            network: config.solanaCluster,
          },
          instructions: {
            '1': 'Make a payment to the recipient address with the provided memo',
            '2': 'Include the payment signature in the X-Payment-Signature header',
            '3': 'Retry your request with the payment signature',
          },
        });
        return;
      }

      // Verify payment if signature/memo provided
      if (paymentMemo) {
        const verification = await this.paymentVerifier.verifyPayment(
          paymentMemo,
          config.paymentTimeoutMs
        );

        if (!verification.verified) {
          res.status(402).json({
            error: 'Payment Verification Failed',
            message: verification.error || 'Payment could not be verified',
            payment: this.paymentVerifier.generatePaymentDetails(),
          });
          return;
        }
      }

      // Payment verified - proxy the request to target API
      const proxyRequest = {
        method: req.method,
        url: req.url,
        headers: req.headers,
        body: req.body,
      };

      const proxyResponse = await this.apiProxy.proxyRequest(proxyRequest);

      // Forward response from target API
      res.status(proxyResponse.status);
      
      // Set response headers (excluding those that shouldn't be forwarded)
      const headersToSkip = ['content-encoding', 'transfer-encoding'];
      for (const [key, value] of Object.entries(proxyResponse.headers)) {
        if (!headersToSkip.includes(key.toLowerCase())) {
          res.setHeader(key, value);
        }
      }

      res.json(proxyResponse.body);
    } catch (error) {
      console.error('Gateway handler error:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}


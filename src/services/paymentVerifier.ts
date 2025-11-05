import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import { config } from '../config';

export interface PaymentDetails {
  amount: number;
  recipient: string;
  memo?: string;
  timestamp: number;
}

export interface PaymentVerificationResult {
  verified: boolean;
  transactionSignature?: string;
  error?: string;
}

export class PaymentVerifier {
  private connection: Connection;
  private receiverPublicKey: PublicKey;
  private facilitatorAddress: PublicKey;

  constructor() {
    const clusterUrl = this.getClusterUrl(config.solanaCluster);
    this.connection = new Connection(clusterUrl, 'confirmed');
    
    const walletKeypair = Keypair.fromSecretKey(
      new Uint8Array(config.spgWalletKeypair)
    );
    this.receiverPublicKey = walletKeypair.publicKey;
    
    try {
      this.facilitatorAddress = new PublicKey(config.facilitatorAddress);
    } catch (error) {
      throw new Error(`Invalid FACILITATOR_ADDRESS: ${error}`);
    }
  }

  private getClusterUrl(cluster: string): string {
    switch (cluster) {
      case 'devnet':
        return 'https://api.devnet.solana.com';
      case 'mainnet-beta':
        return 'https://api.mainnet-beta.solana.com';
      case 'testnet':
        return 'https://api.testnet.solana.com';
      default:
        return 'https://api.devnet.solana.com';
    }
  }

  /**
   * Generate payment details for x402 protocol
   */
  generatePaymentDetails(memo?: string): PaymentDetails {
    return {
      amount: config.feeAmount,
      recipient: this.receiverPublicKey.toBase58(),
      memo: memo || `x402-spg-${Date.now()}`,
      timestamp: Date.now(),
    };
  }

  /**
   * Verify if a payment transaction exists on-chain
   * This is a simplified implementation - in production, you'd want to:
   * 1. Check for recent transactions to the receiver address
   * 2. Verify the transaction includes the expected memo
   * 3. Verify the amount matches
   * 4. Check transaction confirmation status
   */
  async verifyPayment(
    memo: string,
    timeoutMs: number = config.paymentTimeoutMs
  ): Promise<PaymentVerificationResult> {
    const startTime = Date.now();
    const expectedAmount = config.feeAmount;

    while (Date.now() - startTime < timeoutMs) {
      try {
        // Get recent signatures for the receiver address
        const signatures = await this.connection.getSignaturesForAddress(
          this.receiverPublicKey,
          { limit: 10 }
        );

        for (const sigInfo of signatures) {
          // Get transaction details
          const tx = await this.connection.getTransaction(sigInfo.signature, {
            maxSupportedTransactionVersion: 0,
          });

          if (!tx || !tx.meta) continue;

          // Check if transaction was successful
          if (tx.meta.err) continue;

          // Check if transaction is recent (within last 5 minutes)
          const txTime = sigInfo.blockTime ? sigInfo.blockTime * 1000 : 0;
          if (Date.now() - txTime > 5 * 60 * 1000) continue;

          // Check if transaction involves our receiver
          const accountKeys = tx.transaction.message.getAccountKeys();
          const receiverIndex = accountKeys.staticAccountKeys.findIndex(
            (key: PublicKey) => key.toBase58() === this.receiverPublicKey.toBase58()
          );

          if (receiverIndex === -1) continue;

          // Check balance change (simplified - in production, parse instruction data)
          const preBalance = tx.meta.preBalances[receiverIndex] || 0;
          const postBalance = tx.meta.postBalances[receiverIndex] || 0;
          const balanceChange = (postBalance - preBalance) / 1e9; // Convert lamports to SOL

          // Note: This is a simplified check. In production with x402 protocol,
          // you'd need to parse the transaction instructions to verify:
          // 1. The exact amount matches
          // 2. The memo matches
          // 3. The facilitator was involved
          // 4. The token type (USDC, SOL, etc.)

          if (balanceChange > 0) {
            // In a production implementation, you would:
            // 1. Parse instructions to find memo instructions
            // 2. Verify the memo matches the expected memo
            // 3. Verify the exact payment amount
            // 4. Verify the facilitator was involved
            // For now, we'll accept any positive balance change as a valid payment
            
            return {
              verified: true,
              transactionSignature: sigInfo.signature,
            };
          }
        }

        // Wait a bit before checking again
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch (error) {
        console.error('Error verifying payment:', error);
        return {
          verified: false,
          error: `Verification error: ${error}`,
        };
      }
    }

    return {
      verified: false,
      error: 'Payment timeout - no matching transaction found',
    };
  }

  /**
   * Get receiver public key for payment details
   */
  getReceiverAddress(): string {
    return this.receiverPublicKey.toBase58();
  }
}


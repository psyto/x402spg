import { Connection, PublicKey, Keypair, TransactionResponse, VersionedTransactionResponse } from '@solana/web3.js';
import { config } from '../config';

// SPL Memo Program IDs (v1 and v2)
const MEMO_PROGRAM_IDS = [
  'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr', // Memo v2
  'Memo1UhkJBfCR6MNB',                               // Memo v1
];

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

          // Validate memo: parse transaction instructions to find and match the memo
          const txMemo = this.extractMemo(tx);
          if (txMemo !== memo) continue;

          // Verify exact payment amount (with small tolerance for floating point)
          const preBalance = tx.meta.preBalances[receiverIndex] || 0;
          const postBalance = tx.meta.postBalances[receiverIndex] || 0;
          const balanceChange = (postBalance - preBalance) / 1e9; // Convert lamports to SOL

          const AMOUNT_TOLERANCE = 0.000001; // 1 lamport tolerance in SOL
          if (Math.abs(balanceChange - expectedAmount) > AMOUNT_TOLERANCE) continue;

          if (balanceChange > 0) {
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
   * Extract the memo string from a transaction by looking for Memo program instructions.
   * Supports both legacy and versioned transactions, and both Memo v1 and v2 program IDs.
   */
  private extractMemo(
    tx: TransactionResponse | VersionedTransactionResponse
  ): string | null {
    try {
      const message = tx.transaction.message;
      const accountKeys = message.getAccountKeys();
      const allKeys = accountKeys.staticAccountKeys.map((k: PublicKey) => k.toBase58());

      // Include lookup-table keys if present (versioned transactions)
      if (accountKeys.accountKeysFromLookups) {
        const { writable, readonly } = accountKeys.accountKeysFromLookups;
        allKeys.push(...writable.map((k: PublicKey) => k.toBase58()));
        allKeys.push(...readonly.map((k: PublicKey) => k.toBase58()));
      }

      const compiledInstructions = message.compiledInstructions;

      for (const ix of compiledInstructions) {
        const programId = allKeys[ix.programIdIndex];
        if (MEMO_PROGRAM_IDS.includes(programId)) {
          // Memo instruction data is the UTF-8 encoded memo string
          return Buffer.from(ix.data).toString('utf-8');
        }
      }

      // Fallback: check inner instructions (e.g. when memo is in a CPI call)
      if (tx.meta?.innerInstructions) {
        for (const inner of tx.meta.innerInstructions) {
          for (const ix of inner.instructions) {
            const programId = allKeys[ix.programIdIndex];
            if (MEMO_PROGRAM_IDS.includes(programId)) {
              return Buffer.from(ix.data, 'base64').toString('utf-8');
            }
          }
        }
      }

      return null;
    } catch (error) {
      console.error('Error extracting memo from transaction:', error);
      return null;
    }
  }

  /**
   * Get receiver public key for payment details
   */
  getReceiverAddress(): string {
    return this.receiverPublicKey.toBase58();
  }
}


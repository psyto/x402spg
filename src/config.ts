import dotenv from 'dotenv';

dotenv.config();

export interface Config {
  targetApiUrl: string;
  spgWalletKeypair: number[];
  facilitatorAddress: string;
  feeAmount: number;
  solanaCluster: 'devnet' | 'mainnet-beta' | 'testnet';
  port: number;
  paymentTimeoutMs: number;
}

function validateConfig(): Config {
  const required = [
    'TARGET_API_URL',
    'SPG_WALLET_KEYPAIR',
    'FACILITATOR_ADDRESS',
    'FEE_AMOUNT',
    'SOLANA_CLUSTER'
  ];

  for (const key of required) {
    if (!process.env[key]) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
  }

  // Parse wallet keypair
  let walletKeypair: number[];
  try {
    walletKeypair = JSON.parse(process.env.SPG_WALLET_KEYPAIR!);
    if (!Array.isArray(walletKeypair)) {
      throw new Error('SPG_WALLET_KEYPAIR must be a JSON array');
    }
  } catch (error) {
    throw new Error(`Invalid SPG_WALLET_KEYPAIR format: ${error}`);
  }

  // Parse fee amount
  const feeAmount = parseFloat(process.env.FEE_AMOUNT!);
  if (isNaN(feeAmount) || feeAmount <= 0) {
    throw new Error('FEE_AMOUNT must be a positive number');
  }

  // Validate cluster
  const cluster = process.env.SOLANA_CLUSTER!;
  if (!['devnet', 'mainnet-beta', 'testnet'].includes(cluster)) {
    throw new Error('SOLANA_CLUSTER must be one of: devnet, mainnet-beta, testnet');
  }

  return {
    targetApiUrl: process.env.TARGET_API_URL!,
    spgWalletKeypair: walletKeypair,
    facilitatorAddress: process.env.FACILITATOR_ADDRESS!,
    feeAmount,
    solanaCluster: cluster as 'devnet' | 'mainnet-beta' | 'testnet',
    port: parseInt(process.env.PORT || '3000', 10),
    paymentTimeoutMs: parseInt(process.env.PAYMENT_TIMEOUT_MS || '30000', 10),
  };
}

export const config = validateConfig();


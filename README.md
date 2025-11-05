# 💳 x402 Serverless Payment Gateway (x402 SPG)

## 🏆 Solana X402 Hackathon Submission: Best x402 API Integration

**Category:** Best x402 API Integration
**Author:** Hiroyuki Saito
**Solana Address:** [Your Devnet/Mainnet Wallet Address]

-----

## 💡 Project Vision

The **x402 Serverless Payment Gateway (x402 SPG)** is a lightweight middleware that instantly enables **pay-per-use** monetization for any existing serverless HTTP API endpoint.

We solve a critical gap in the Agent Economy: connecting existing, high-performance Web2 APIs (like AWS Lambda, Vercel functions, etc.) with the **trustless, instantaneous micro-payments** of the x402 protocol on Solana. This allows API providers to move from bulky subscription models to a true **per-call economic model**, perfect for autonomous AI Agents.

## ✨ Core Features

1.  **Instant x402 Paywall:** Automatically enforces an x402 payment before granting access to the target API endpoint.
2.  **API Proxy:** Successfully validated requests are seamlessly proxied to the original serverless function, preserving headers and request body.
3.  **Zero-Touch Configuration:** Easy setup via environment variables (`TARGET_API_URL`, `FEE_AMOUNT`, `FACILITATOR_ADDRESS`).
4.  **Error Handling:** Returns the appropriate `HTTP 402 Payment Required` status on failed or missing payment, as specified by the x402 protocol.
5.  **Serverless Native:** Implemented in Node.js/TypeScript for maximum compatibility with serverless environments (AWS Lambda, Google Cloud Functions, etc.).

## ⚙️ Technical Implementation (How it Works)

The x402 SPG acts as an **intelligent reverse proxy** deployed in front of the target API.

1.  **Request Initiation:** An Agent/User sends an HTTP request to the x402 SPG endpoint.
2.  **Payment Challenge:** If no valid payment is found, the SPG immediately returns a `402 Payment Required` response, providing the necessary x402 payment details (amount, recipient, memo).
3.  **Payment Verification:** The SPG monitors the Solana chain (via the configured Facilitator) for a matching, successful payment transaction.
4.  **Execution:** Upon receiving and verifying the on-chain payment, the SPG **proxies the original request** to the internal `TARGET_API_URL`.
5.  **Result:** The response from the target serverless function is passed back to the user/agent.

The entire process is automated and trustless, ensuring the API provider is paid *before* the compute resources are expended.

## 🚀 Getting Started (Deployment Guide)

### Prerequisites

  * Node.js (v18+)
  * Basic understanding of the x402 protocol and Solana wallets (Phantom/Solana-CLI).

### 1\. Setup

Clone the repository:

```bash
git clone [Your GitHub Repo URL]
cd x402-serverless-payment-gateway
npm install
```

### 2\. Configuration (`.env`)

Configure the gateway by setting the following environment variables.

| Variable | Description | Example |
| :--- | :--- | :--- |
| `TARGET_API_URL` | The URL of the existing API to be protected. | `https://[your-lambda-id].lambda-url.us-east-1.on.aws/` |
| `SPG_WALLET_KEYPAIR` | Secret key for the wallet receiving x402 payments (Receiver). | `[Private Key Array]` |
| `FACILITATOR_ADDRESS` | Address of the x402 Facilitator on Solana Devnet. | `[Facilitator Public Key]` |
| `FEE_AMOUNT` | Price per API call (in USDC/x402 compatible tokens). | `0.001` (i.e., $0.001) |
| `SOLANA_CLUSTER` | Solana cluster to use. | `devnet` |

### 3\. Run Locally (Testing)

You can test the core logic locally before deploying:

```bash
npm start
```

The gateway will start on `http://localhost:3000`.

### 4\. Deployment (AWS Lambda Example)

The core logic is contained in a single handler file, making it easy to deploy:

1.  Zip the required files (`index.js`, `node_modules`, and your `.env` variables injected).
2.  Upload to AWS Lambda / Vercel / other serverless platform.
3.  Configure the Lambda handler to point to the main function.
4.  Set the environment variables as defined in Step 2.

## 📺 Demo Video

[Link to your 3-Minute Demo Video on YouTube/Vimeo]

*The video showcases a user/agent attempting to query a weather API protected by x402 SPG. The initial request is rejected with a 402, the payment is made via Phantom, and the final request succeeds, retrieving the weather data.*

## 🌟 Future Scope

  * Support for rate-limiting based on payment history.
  * Integration with a DAO for collective API ownership and fee distribution.
  * Official SDK wrappers for Python and Go serverless environments.

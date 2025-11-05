# 💳 x402 Serverless Payment Gateway (x402 SPG)

## 🏆 Solana X402 Hackathon Submission: Best x402 API Integration

**Category:** Best x402 API Integration
**Author:** Hiroyuki Saito
**Solana Address:** [Your Devnet/Mainnet Wallet Address]

---

## 💡 Project Vision

The **x402 Serverless Payment Gateway (x402 SPG)** is a lightweight middleware that instantly enables **pay-per-use** monetization for any existing serverless HTTP API endpoint.

We solve a critical gap in the Agent Economy: connecting existing, high-performance Web2 APIs (like AWS Lambda, Vercel functions, etc.) with the **trustless, instantaneous micro-payments** of the x402 protocol on Solana. This allows API providers to move from bulky subscription models to a true **per-call economic model**, perfect for autonomous AI Agents.

## ✨ Core Features

1.  **Instant x402 Paywall:** Automatically enforces an x402 payment before granting access to the target API endpoint.
2.  **API Proxy:** Successfully validated requests are seamlessly proxied to the original serverless function, preserving headers and request body.
3.  **Zero-Touch Configuration:** Easy setup via environment variables (`TARGET_API_URL`, `FEE_AMOUNT`, `FACILITATOR_ADDRESS`).
4.  **Error Handling:** Returns the appropriate `HTTP 402 Payment Required` status on failed or missing payment, as specified by the x402 protocol.
5.  **Serverless Native:** Implemented in Node.js/TypeScript for maximum compatibility with serverless environments (AWS Lambda, Google Cloud Functions, Vercel, etc.).

## ⚙️ Technical Implementation (How it Works)

The x402 SPG acts as an **intelligent reverse proxy** deployed in front of the target API.

1.  **Request Initiation:** An Agent/User sends an HTTP request to the x402 SPG endpoint.
2.  **Payment Challenge:** If no valid payment is found, the SPG immediately returns a `402 Payment Required` response, providing the necessary x402 payment details (amount, recipient, memo).
3.  **Payment Verification:** The SPG monitors the Solana chain (via the configured Facilitator) for a matching, successful payment transaction.
4.  **Execution:** Upon receiving and verifying the on-chain payment, the SPG **proxies the original request** to the internal `TARGET_API_URL`.
5.  **Result:** The response from the target serverless function is passed back to the user/agent.

The entire process is automated and trustless, ensuring the API provider is paid _before_ the compute resources are expended.

## 🚀 Getting Started (Deployment Guide)

### Prerequisites

-   Node.js (v18+)
-   npm or yarn
-   Basic understanding of the x402 protocol and Solana wallets (Phantom/Solana-CLI).

### 1. Setup

Clone the repository:

```bash
git clone https://github.com/psyto/x402spg.git
cd x402spg
npm install
```

### 2. Build

Compile TypeScript to JavaScript:

```bash
npm run build
```

### 3. Configuration (`.env`)

Copy the example environment file and create a `.env` file:

```bash
cp env.example .env
```

Then edit `.env` with your actual values. The following variables are required:

| Variable              | Description                                                                         | Example                                                 |
| :-------------------- | :---------------------------------------------------------------------------------- | :------------------------------------------------------ |
| `TARGET_API_URL`      | The URL of the existing API to be protected.                                        | `https://[your-lambda-id].lambda-url.us-east-1.on.aws/` |
| `SPG_WALLET_KEYPAIR`  | Secret key for the wallet receiving x402 payments (Receiver). Must be a JSON array. | `[123,45,67,...]`                                       |
| `FACILITATOR_ADDRESS` | Address of the x402 Facilitator on Solana Devnet.                                   | `[Facilitator Public Key]`                              |
| `FEE_AMOUNT`          | Price per API call (in SOL or USDC).                                                | `0.001` (i.e., $0.001)                                  |
| `SOLANA_CLUSTER`      | Solana cluster to use.                                                              | `devnet` or `mainnet-beta`                              |
| `PORT`                | Port for local development (optional, default: 3000)                                | `3000`                                                  |
| `PAYMENT_TIMEOUT_MS`  | Payment verification timeout in milliseconds (optional, default: 30000)             | `30000`                                                 |

**Example `.env` file:**

```env
TARGET_API_URL=https://api.example.com/v1
SPG_WALLET_KEYPAIR=[123,45,67,89,...]
FACILITATOR_ADDRESS=YourFacilitatorAddress123456789
FEE_AMOUNT=0.001
SOLANA_CLUSTER=devnet
PORT=3000
PAYMENT_TIMEOUT_MS=30000
```

### 4. Run Locally (Testing)

You can test the core logic locally:

```bash
npm run dev
```

Or build first and then run:

```bash
npm run build
npm start
```

The gateway will start on `http://localhost:3000`.

### 5. Deployment

#### AWS Lambda (via Serverless Framework)

1. Install Serverless Framework globally:

    ```bash
    npm install -g serverless
    ```

2. Install serverless plugins:

    ```bash
    npm install --save-dev serverless-offline
    ```

3. Build the project:

    ```bash
    npm run build
    ```

4. Deploy:

    ```bash
    serverless deploy
    ```

5. Set environment variables in AWS Lambda console or via serverless.yml

#### Vercel

1. Install Vercel CLI:

    ```bash
    npm install -g vercel
    ```

2. Build the project:

    ```bash
    npm run build
    ```

3. Deploy:

    ```bash
    vercel
    ```

4. Set environment variables via Vercel dashboard or CLI:
    ```bash
    vercel env add TARGET_API_URL
    vercel env add SPG_WALLET_KEYPAIR
    vercel env add FACILITATOR_ADDRESS
    vercel env add FEE_AMOUNT
    vercel env add SOLANA_CLUSTER
    ```

#### Manual Deployment

1. Build the project:

    ```bash
    npm run build
    ```

2. Create a deployment package:

    ```bash
    zip -r deployment.zip dist/ node_modules/ package.json
    ```

3. Upload to your serverless platform
4. Configure environment variables
5. Set the handler to `dist/index.handler` (for Lambda) or `dist/index.js` (for other platforms)

## 📖 API Usage

### Making a Request

1. **First Request (No Payment):**

    ```bash
    curl http://your-gateway-url.com/api/endpoint
    ```

    Response (402 Payment Required):

    ```json
    {
        "error": "Payment Required",
        "message": "This API requires payment via x402 protocol",
        "payment": {
            "amount": 0.001,
            "recipient": "YourWalletAddress123...",
            "memo": "x402-spg-1234567890",
            "facilitator": "FacilitatorAddress123...",
            "network": "devnet"
        },
        "instructions": {
            "1": "Make a payment to the recipient address with the provided memo",
            "2": "Include the payment signature in the X-Payment-Signature header",
            "3": "Retry your request with the payment signature"
        }
    }
    ```

2. **After Payment (With Payment Memo):**
    ```bash
    curl -H "X-Payment-Memo: x402-spg-1234567890" \
         http://your-gateway-url.com/api/endpoint
    ```

### Health Check

```bash
curl http://your-gateway-url.com/health
```

Response:

```json
{
    "status": "ok",
    "service": "x402-serverless-payment-gateway",
    "version": "1.0.0"
}
```

## 🏗️ Project Structure

```
x402spg/
├── src/
│   ├── index.ts              # Main entry point and Express server
│   ├── config.ts             # Configuration validation
│   ├── handlers/
│   │   └── gatewayHandler.ts # Main request handler
│   └── services/
│       ├── paymentVerifier.ts # Solana payment verification
│       └── apiProxy.ts        # API proxy implementation
├── dist/                      # Compiled JavaScript (generated)
├── package.json
├── tsconfig.json
├── serverless.yml             # AWS Lambda deployment config
├── vercel.json                # Vercel deployment config
└── README.md
```

## 🔧 Development

### Scripts

-   `npm run build` - Compile TypeScript to JavaScript
-   `npm start` - Run compiled JavaScript
-   `npm run dev` - Run with ts-node for development
-   `npm run watch` - Watch mode for TypeScript compilation
-   `npm run clean` - Remove dist directory

### Testing Locally

1. Start the gateway:

    ```bash
    npm run dev
    ```

2. Test without payment:

    ```bash
    curl http://localhost:3000/test
    ```

3. Test with payment memo (after making payment):
    ```bash
    curl -H "X-Payment-Memo: your-payment-memo" http://localhost:3000/test
    ```

## 📺 Demo Video

[Link to your 3-Minute Demo Video on YouTube/Vimeo]

_The video showcases a user/agent attempting to query a weather API protected by x402 SPG. The initial request is rejected with a 402, the payment is made via Phantom, and the final request succeeds, retrieving the weather data._

## 🔒 Security Considerations

-   **Wallet Keypair:** Store `SPG_WALLET_KEYPAIR` securely. Never commit it to version control.
-   **Environment Variables:** Use your platform's secure environment variable storage.
-   **Payment Verification:** The current implementation uses simplified verification. In production, implement full x402 protocol compliance with proper transaction parsing.
-   **Rate Limiting:** Consider adding rate limiting to prevent abuse.
-   **HTTPS:** Always use HTTPS in production.

## 🌟 Future Scope

-   Support for rate-limiting based on payment history.
-   Integration with a DAO for collective API ownership and fee distribution.
-   Official SDK wrappers for Python and Go serverless environments.
-   Enhanced payment verification with full x402 protocol compliance.
-   Support for multiple token types (USDC, SOL, etc.).
-   Payment caching to reduce blockchain queries.

## 📝 License

MIT

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

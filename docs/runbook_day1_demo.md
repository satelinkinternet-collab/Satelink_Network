# Day 1 Demo Runbook

## Prerequisites
- **Node.js**: v18+ recommended
- **Docker**: (Optional) For running local instances of a database or Redis, if not using SQLite/in-memory solutions.

## Environment Setup
1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```
2. Generate a secure `JWT_SECRET`:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
3. Add the generated secret to your `.env` file:
   ```env
   JWT_SECRET=your_generated_secret_here
   ```

## How to Run
Follow these steps to initialize and start the application with demo data:

1. **Install dependencies:**
   ```bash
   npm install
   ```
2. **Run database migrations** (if applicable):
   ```bash
   npm run migrate
   ```
3. **Seed the database with demo data:**
   ```bash
   npm run seed:demo
   ```
4. **Start the server:**
   ```bash
   npm run dev
   ```

## Expected Endpoints
Once the server is bound and running, you can access the following primary routes:
- **Health Check:** `GET /health`
  - Verifies the server is operational and responding.
- **Application Mode:** `GET /api/mode`
  - Returns the current system mode and configuration status.
- **Demo UI:** `GET /` (or specific demo routing, e.g., `GET /demo`)
  - The main frontend interface for interaction.

## Important System Notes
- **Claim vs. Withdraw:** A "claim" action securely records the user's right to tokens. It is **not** equivalent to a "withdraw", which is the actual movement of funds.
- **Claim Window:** The system enforces a strict **48-day window** for claims.
- **Withdrawal Requirements:** Any successful withdraw action inherently requires sufficient treasury liquidity to fulfill the request. If liquidity is low, the withdrawal will pend or fail.

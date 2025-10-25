# SupportCarr MVP

Welcome to the SupportCarr monorepo. This project delivers a full-stack proof-of-concept for an on-demand bike rescue platform
covering Echo Park / Silver Lake in Los Angeles with a Joshua Tree pilot.

## Prerequisites

- Node.js 20+
- npm 10+
- Running MongoDB and Redis instances (local Docker is fine)

## Setup

```bash
npm install
cp server/.env.example server/.env
cp client/.env.example client/.env
```

Update the environment files with your credentials.

## Running Locally

In one terminal, start the API:

```bash
npm run dev:server
```

In a second terminal, run the PWA:

```bash
npm run dev:client
```

The API listens on `http://localhost:4000` and the PWA on `http://localhost:5173`.

## Testing & Linting

```bash
npm test            # runs server + client tests
npm run lint        # runs ESLint across packages
npm run build       # builds the PWA
```

The backend uses Jest + Supertest with mongodb-memory-server. The frontend relies on Jest + React Testing Library.

## Seeding Demo Data

```bash
npm --workspace server run seed
```

This script loads demo users, drivers, and sample rides for both the LA coverage zone and the Joshua Tree pilot.

## Demo Workflow Simulation

```bash
node server/src/utils/demoScript.js
```

The CLI script walks through the end-to-end rider/driver lifecycle, including mocked Twilio notifications and Stripe payouts.

## Documentation

- [Architecture](./ARCHITECTURE.md)
- [API Reference](./API.md)

## Deployment

The project ships with a GitHub Actions workflow that installs dependencies, runs linting/tests, and builds the frontend
artifact. On main merges, extend the workflow to publish a Docker image to your cloud provider of choice (Render/Railway recommended).

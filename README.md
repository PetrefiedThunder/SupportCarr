# SupportCarr Monorepo

SupportCarr delivers a full-stack MVP for an on-demand e-bike and bicycle rescue service operating across Echo Park, Silver Lake,
and a Joshua Tree weekend pilot. The project includes an Express + MongoDB backend, a React + Vite PWA frontend, automated tests,
CI/CD, seeding utilities, and a scripted product walkthrough.

## Monorepo Structure

```
client/   # React + Vite PWA, Tailwind UI, Jest + RTL tests
server/   # Express API gateway, services, Mongoose models, Jest tests
_docs_/   # Architecture, API reference, setup guides
```

## Getting Started

```bash
npm install
cp server/.env.example server/.env
cp client/.env.example client/.env
npm run dev:server
npm run dev:client
```

The API listens on `http://localhost:4000`; the PWA runs on `http://localhost:5173`.

## Key Features

- **JWT Authentication** - Refresh token rotation for riders, drivers, and admins
- **Ride Lifecycle Management** - Redis-backed driver matching with automated dispatch
- **Twilio SMS Integration** - Automated rider notifications and WTP surveys (Santa Monica pilot)
- **Willingness To Pay Measurement** - Post-ride SMS surveys with Airtable analytics
- **Stripe Payments** - Payment intent creation and capture on ride completion
- **Airtable Analytics** - Real-time ride data and SMS conversation logging
- **Progressive Web App** - Offline fallback, live ride tracking, driver console, admin dispatch
- **Production-Ready Security** - Twilio signature verification, indexed queries, PII documentation
- **Comprehensive Testing** - Jest test suites for backend services and frontend components
- **CI/CD Pipeline** - GitHub Actions running linting, tests, and PWA builds on every PR

## Scripts

```bash
# Development
npm test                             # run backend + frontend tests
npm run lint                         # lint both workspaces
npm run build                        # build the PWA for production
npm --workspace server run seed      # seed MongoDB and Redis with demo data
node server/src/utils/demoScript.js  # simulate end-to-end breakdown workflow

# Santa Monica Pilot Testing
node server/scripts/test-wtp-flow.js +1YOUR_PHONE        # test WTP SMS with real phone
node server/scripts/test-multi-rider-wtp.js              # test multi-rider scenario
```

## Documentation

- [Setup & Operations](docs/README.md)
- [Architecture](docs/ARCHITECTURE.md)
- [API Reference](docs/API.md)
- **[Santa Monica Pilot Setup](docs/PILOT_SETUP.md)** - Complete guide for Airtable, Twilio, and WTP system

## Health Check

Verify the API is running:

```bash
curl http://localhost:4000/api/health
```

Expect `{ "status": "ok" }`.

## Santa Monica Pilot

The Santa Monica pilot includes a complete **Willingness To Pay (WTP) measurement system** to enable data-driven pricing decisions.

### How It Works

1. **Ride Completion** - When a ride status changes to `completed`
2. **Automatic SMS** - System sends WTP survey via Twilio: *"Would you pay $25 for this service?"*
3. **Rider Response** - Rider replies YES, NO, or a custom price (e.g., "30" or "$25")
4. **Data Capture** - Response stored in MongoDB and synced to Airtable for analysis
5. **Conversation Logs** - All SMS interactions logged in Airtable with ride linkage

### Key Features

- ✅ **Twilio Signature Verification** - Prevents spoofed SMS data
- ✅ **Multi-Rider Safe** - Correct matching even with concurrent rescues
- ✅ **Airtable Integration** - Real-time analytics in `Rides` and `SMS Logs` tables
- ✅ **Indexed Queries** - O(1) lookup via denormalized `riderPhone` field
- ✅ **Complete Documentation** - Security, PII, and compliance considerations

### Quick Start

See **[docs/PILOT_SETUP.md](docs/PILOT_SETUP.md)** for complete setup instructions including:
- Airtable base and table configuration
- Twilio account setup and webhook configuration
- Environment variables
- Testing procedures
- Security and compliance guidelines

### Testing

```bash
# Test with your actual phone number
node server/scripts/test-wtp-flow.js +13105551234

# Verify multi-rider scenario handling
node server/scripts/test-multi-rider-wtp.js
```

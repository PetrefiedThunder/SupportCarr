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

- JWT authentication with refresh rotation for riders, drivers, and admins.
- Ride request lifecycle management with Redis-backed driver matching and Twilio SMS stubs.
- Stripe Connect payout simulation on ride completion.
- Airtable analytics stubs for dispatch logging.
- Progressive Web App with offline fallback, live ride view, driver console, and admin dispatch checklist.
- Jest test suites for backend services/controllers and frontend components.
- GitHub Actions workflow running linting, tests, and PWA builds on every PR.

## Scripts

```bash
npm test         # run backend + frontend tests
npm run lint     # lint both workspaces
npm run build    # build the PWA for production
npm --workspace server run seed     # seed MongoDB and Redis with demo data
node server/src/utils/demoScript.js # simulate end-to-end breakdown workflow
```

## Documentation

- [Setup & Operations](docs/README.md)
- [Architecture](docs/ARCHITECTURE.md)
- [API Reference](docs/API.md)

## Health Check

Verify the API is running:

```bash
curl http://localhost:4000/api/health
```

Expect `{ "status": "ok" }`.

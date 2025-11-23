# SupportCarr Monorepo

SupportCarr is a full-stack MVP for on-demand e-bike and bicycle rescue. The repo hosts an Express + MongoDB API, a React +
Vite progressive web app, and pilot playbooks that cover Los Angeles (Echo Park/Silver Lake) plus a Joshua Tree extension with
Santa Monica-specific WTP instrumentation docs for the current pilot. 【F:docs/README.md†L1-L4】【F:docs/PILOT_SETUP.md†L1-L90】

## Status at a Glance
- **Pilots:** Seed data covers Echo Park/Silver Lake riders with a Joshua Tree outpost, while Santa Monica-focused Airtable/Twilio
  setup instructions drive the live WTP pilot. 【F:server/src/utils/seed.js†L1-L86】【F:docs/PILOT_SETUP.md†L1-L137】
- **Ride lifecycle:** A finite state machine enforces the 10-mile pilot limit, auto-assigns nearby drivers using the Redis
  geostore (with an in-memory fallback), and logs Airtable ride analytics. 【F:server/src/services/rideService.js†L31-L116】【F:server/src/config/redis.js†L1-L71】【F:server/src/services/analyticsService.js†L1-L78】
- **Multi-role PWA:** Landing, rider, driver, and admin consoles share a single Vite app with role switching in
  `client/src/App.jsx` and dedicated pages under `client/src/pages/`.
- **Data exhaust:** Twilio webhooks and SMS logging feed Airtable with retry/backoff, and CLI scripts simulate end-to-end WTP
  messaging flows. 【F:server/src/routes/twilioRoutes.js†L1-L112】【F:server/src/services/analyticsService.js†L78-L151】【F:server/scripts/test-wtp-flow.js†L1-L140】
- **Reviews & audits:** Code review, logic audit, and operational audit docs live alongside the code for fast onboarding
  (`CODE_REVIEW_README.md`, `LOGIC_AUDIT_SUMMARY.md`, `AUDIT_SUMMARY.md`).

## Repository Layout
```
client/   React + Vite PWA (multi-role UI, Tailwind styling, Jest + RTL tests)
server/   Express API, MongoDB models, Redis-powered dispatch, Twilio/Stripe/Airtable services
server/scripts/   Operational tooling (WTP tests, Airtable validator, demo workflow)
docs/     Architecture, pilot setup, API reference, and contributor guides
*.md      Code review, roadmap, audit, and contribution documentation
```

## Core Capabilities
### Ride & Dispatch Platform
- `server/src/services/rideService.js` manages the ride finite state machine, validates pilot geofence/10 mile limits, seeds
  payment intents, auto-assigns the closest active driver through `dispatchService`, and emits ride events for SSE streams
- `server/src/controllers/rideController.js` guards driver/admin permissions, exposes list/stream endpoints, and keeps riders,
  drivers, and admins in sync through `streamRide` and `pollRide`
- Driver and rider auth flows, driver profile management, and manual admin overrides live under `server/src/controllers` and
  the paired client pages so dispatchers can take over when auto-assign fails

### Messaging, Payments, and Analytics
- Twilio inbound webhook (`server/src/routes/twilioRoutes.js`) verifies signatures, matches replies by `riderPhone`, and updates
  MongoDB + Airtable with parsed WTP responses
- `server/src/services/analyticsService.js` centralizes Airtable writes with retries, status mapping, and idempotent SMS logging
- Payment intents and captures are orchestrated via `server/src/services/paymentService.js`, while `smsService` handles outbound
  notifications
- Scripts in `server/scripts/` help operators validate Airtable configs, simulate end-to-end WTP flows, and stress-test
  multi-rider replies before hitting production webhooks

### Progressive Web App
- Routing, role switching, and shared chrome live in `client/src/App.jsx` while the rider, driver, admin, and landing views live
  under `client/src/pages/`
- State is managed with Zustand stores in `client/src/store/`, hooks like `useDemoSession` preload role-based sessions, and UI is
  styled with Tailwind classes defined in `client/src/index.css`
- API helpers in `client/src/api/` wrap Axios with base URLs and interceptors so every view can call the Express gateway with the
  same auth plumbing

### Tooling & Quality
- Root scripts in `package.json` wire up workspaces so you can lint, test, or run both apps (`npm run dev:server`,
  `npm run dev:client`, `npm test`, `npm run lint`, `npm run build`)
- The server workspace exposes targeted commands for unit/integration tests, seeding, OpenAPI generation, and linting, while the
  client workspace bundles Vite preview, Tailwind/PostCSS, and Jest (`server/package.json`, `client/package.json`)
- `server/src/utils/demoScript.js` spins up a full rider→driver workflow via REST calls so you can verify Twilio/Stripe/Airtable
  interactions without touching the UI

## Getting Started
### Prerequisites
- Node.js 20+, npm 10+, MongoDB, and Redis (local Docker works fine) — see [docs/README.md](docs/README.md)

### Install & Configure
```bash
npm install
cp server/.env.example server/.env
cp client/.env.example client/.env
# fill in MongoDB, Redis, Stripe, Twilio, and Airtable credentials
```

### Run Locally
```bash
npm run dev:server   # Express API on http://localhost:4000
npm run dev:client   # Vite dev server on http://localhost:5173
```

### Seed & Simulate
```bash
npm --workspace server run seed          # load demo riders, drivers, and rides
node server/src/utils/demoScript.js      # walk through rider->driver->payout lifecycle
```

The API exposes `/api/health` for quick status checks.

## Santa Monica Pilot & WTP Instrumentation
- Follow [docs/PILOT_SETUP.md](docs/PILOT_SETUP.md) to mirror the Airtable base, Twilio number, and environment variables
- `server/scripts/test-wtp-flow.js` provisions a test rider, completes a ride, and sends the production WTP SMS so you can verify
  replies hit Airtable before inviting real riders
- `server/scripts/test-multi-rider-wtp.js` (see file for instructions) stress-tests concurrent replies to prove the riderPhone
  filter prevents cross-talk
- When you are ready to go live, `server/scripts/validate-airtable-config.js` dumps the expected schema and field options so ops
  teams can reconcile Airtable before deploys

## Documentation & References
- [docs/README.md](docs/README.md) – setup, testing, seeding, and deployment reference
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) – high-level system design
- [docs/API.md](docs/API.md) – endpoint reference (kept in sync with `server/openapi.yaml`)
- [CODE_REVIEW_README.md](CODE_REVIEW_README.md) & [CODE_REVIEW_SUMMARY.md](CODE_REVIEW_SUMMARY.md) – latest audit results
- [LOGIC_AUDIT_SUMMARY.md](LOGIC_AUDIT_SUMMARY.md) & [AUDIT_SUMMARY.md](AUDIT_SUMMARY.md) – WTP loop validation + Airtable ops
- [ROADMAP.md](ROADMAP.md) – sprint-by-sprint plan with backlog context

## Tech Stack
| Layer | Technologies |
|-------|--------------|
| Backend | Node.js, Express 5, MongoDB/Mongoose, Redis, Stripe, Twilio, Airtable (`server/package.json`) |
| Frontend | React 18, Vite 5, Tailwind CSS, React Router, Zustand, Leaflet (`client/package.json`) |
| Tooling | Jest, React Testing Library, Supertest, ESLint + Prettier, npm workspaces, GitHub Actions |

## Contributing & PR Labels
- Start with [CONTRIBUTING.md](CONTRIBUTING.md) for branch, commit, testing, and review expectations
- [PR_LABELS.md](PR_LABELS.md) lists every merged PR (31 to date) plus the label taxonomy we apply in GitHub
- Use the root scripts (`npm test`, `npm run lint`, etc.) before opening a PR, and keep the docs in sync when you touch pilot
  flows or external integrations

## License
This project is released under the [MIT License](LICENSE).

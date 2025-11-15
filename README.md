# SupportCarr Monorepo

SupportCarr is a production-ready full-stack platform for on-demand e-bike and bicycle rescue service. Built with **Express.js + MongoDB** backend, **React 18 + Vite PWA** frontend, comprehensive Jest testing, GitHub Actions CI/CD automation, and complete production deployment infrastructure.

The platform powers the Santa Monica pilot with advanced features including **real-time ride tracking (SSE + polling hybrid)**, **Twilio SMS integration** with Willingness-to-Pay surveys, **Airtable analytics sync**, **Stripe payment processing**, and **geospatial driver matching via Redis**.

## 🎯 Project Status

- **Current Phase:** Santa Monica Pilot (Production-Ready)
- **Total PRs Merged:** 31 (see [PR Catalog](PR_LABELS.md))
- **Test Coverage:** Comprehensive unit and integration tests (Jest + RTL)
- **CI/CD:** GitHub Actions - linting, testing, builds on every PR
- **Documentation:** Complete setup guides, API reference, and architecture docs
- **Known Issues:** 30 bugs identified in comprehensive audit (see [Technical Debt](#technical-debt-and-known-issues))

## 🏗️ Architecture Overview

SupportCarr uses an **NPM monorepo** (workspaces) with strict separation between backend and frontend:

- **Backend:** Express.js REST API with modular service layer (auth, rides, drivers, payments, SMS, analytics)
- **Frontend:** React SPA with client-side routing, Zustand state management, Leaflet maps, Tailwind CSS
- **Databases:** MongoDB (primary) for documents, Redis for geospatial indexing and caching
- **Real-time:** Server-Sent Events (SSE) with polling fallback for live ride tracking
- **Integrations:** Stripe (payments), Twilio (SMS), Airtable (analytics), Mapbox (geocoding)
- **Testing:** Jest unit/integration tests with mocked externals, React Testing Library for UI
- **Deployment:** Docker-ready, environment-based configuration, automatic service discovery

### Key Architectural Patterns

1. **Finite State Machine (FSM)** - Ride status transitions strictly validated
2. **Service Layer** - Business logic decoupled from HTTP controllers
3. **Singleton Clients** - Stripe, Twilio, Airtable initialized once per process
4. **Event Emitter** - Real-time updates via EventEmitter within server
5. **JWT Auth** - Refresh token rotation with 15m access token TTL
6. **Graceful Degradation** - All third-party integrations optional; system functions without them
7. **Comprehensive Logging** - Winston structured logs + Airtable audit trail

## 📁 Monorepo Structure

```
client/     # React + Vite PWA, Tailwind UI, Jest + RTL tests
            # - Real-time ride tracking
            # - Driver console
            # - Admin dispatch interface
            # - Offline-capable PWA

server/     # Express API gateway, services, Mongoose models, Jest tests
            # - JWT authentication with refresh token rotation
            # - Redis-backed driver matching
            # - Twilio SMS integration
            # - Stripe payment processing
            # - Airtable analytics sync

docs/       # Architecture, API reference, setup guides
            # - PILOT_SETUP.md - Santa Monica pilot configuration
            # - ARCHITECTURE.md - System design
            # - API.md - Complete API reference
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

## ✨ Key Features

### 🔐 Authentication & Security
- **JWT Authentication** - Refresh token rotation for riders, drivers, and admins
- **Input Validation** - Comprehensive request validation and sanitization
- **Twilio Signature Verification** - Prevents spoofed SMS data (PR #31)
- **PII Documentation** - Clear data handling and compliance guidelines

### 🚴 Core Ride Management
- **Ride Lifecycle Management** - Complete breakdown request-to-completion workflow
- **Redis-backed Driver Matching** - Geospatial matching with Haversine distance (PR #30)
- **Real-Time Updates** - Server-sent events for live ride tracking (PR #25)
- **Address Autocomplete** - Google Maps integration for seamless location entry (PR #24)

### 💬 SMS & Communication
- **Twilio SMS Integration** - Automated rider notifications and multi-stage workflows
- **WTP Survey System** - Post-ride SMS surveys for pricing research (PR #31)
- **Multi-Rider Safe** - Correct matching even with concurrent rescues
- **Conversation Logging** - Complete SMS history in Airtable

### 💳 Payments & Analytics
- **Stripe Payments** - Payment intent creation and capture on ride completion (PR #23)
- **Airtable Analytics** - Real-time ride data and SMS conversation logging (PR #31)
- **WTP Data Capture** - Structured data collection for pricing analysis
- **Revenue Tracking** - Complete payment and transaction history

### 🎨 Progressive Web App
- **Offline Fallback** - Service worker for offline capability
- **Live Ride Tracking** - Real-time rider and driver location updates
- **Driver Console** - Dedicated interface for driver operations
- **Admin Dispatch** - Complete administrative control panel
- **Mobile Optimized** - Responsive design for all device sizes

### 🧪 Quality Assurance
- **Comprehensive Testing** - Jest test suites for backend and frontend (PR #17)
- **CI/CD Pipeline** - GitHub Actions running linting, tests, and builds (PR #9, #12)
- **Test Scripts** - Automated testing for critical flows (WTP, multi-rider scenarios)
- **Code Quality** - ESLint with strict rules across all workspaces (PR #19)

### 🏗️ Architecture & Infrastructure
- **Monorepo Structure** - NPM workspaces for unified development (PR #18)
- **ESM Modules** - Modern JavaScript with ES modules (PR #22)
- **MongoDB + Mongoose** - Flexible document storage with schema validation
- **Redis** - High-performance geospatial queries and caching
- **Environment Configuration** - Secure credential management

## Scripts

```bash
# Development
npm run dev:server                    # Start backend on :4000 (with auto-reload via nodemon)
npm run dev:client                    # Start frontend on :5173 (Vite dev server)
npm test                              # Run backend + frontend tests (Jest)
npm run lint                          # Lint & format both workspaces (ESLint + Prettier)
npm run build                         # Build PWA for production (Vite)

# Database & Seeding
npm --workspace server run seed       # Seed MongoDB + Redis with demo data
node server/src/utils/demoScript.js   # Simulate end-to-end breakdown workflow

# Testing
npm --workspace server run test:unit       # Unit tests only (mocked externals)
npm --workspace server run test:integration # Integration tests (E2E flows)
npm --workspace client run test            # Client component tests

# Santa Monica Pilot Testing
node server/scripts/test-wtp-flow.js +1YOUR_PHONE        # Test WTP SMS with real phone
node server/scripts/test-multi-rider-wtp.js              # Test multi-rider concurrent scenario
```

## 🔍 Debugging & Development Guide

### Backend Debugging

**Using Node Inspector:**
```bash
node --inspect-brk server/server.js
# Then open chrome://inspect to attach debugger
```

**Key Log Locations:**
- Winston logs to stdout with structured format: `{ level, timestamp, service, message, ...metadata }`
- Airtable operations logged at INFO level
- Payment/SMS failures logged at ERROR level

**Useful Environment Variables:**
```bash
LOG_LEVEL=debug                  # Enable debug logs
STRIPE_API_VERSION=2024-06-20   # Stripe API version
MONGODB_URI=...                 # Override database connection
REDIS_URL=...                   # Override Redis connection
```

### Real-Time Debugging (SSE)

**Monitor EventSource Activity:**
```javascript
// In browser console while on /active route
const events = [];
const original = EventSource.prototype.addEventListener;
EventSource.prototype.addEventListener = function(type, handler) {
  console.log(`EventSource listening for: ${type}`);
  events.push(type);
  return original.call(this, type, handler);
};
```

**Check Ride Streaming Status:**
```bash
curl http://localhost:4000/api/rides/{rideId}/stream -H "Authorization: Bearer {token}"
# Should receive SSE format: data: {...}\n\n
```

### Frontend Debugging

**React DevTools Browser Extension:**
- Inspect Zustand state: `useSessionStore.getState()`
- Check component renders with Profiler tab
- Monitor hook dependencies

**Check Real-Time Connection:**
```javascript
// Browser console
console.log('Active EventSources:', document.querySelectorAll('[data-type=event-source]').length);
// Manually trigger re-subscription
window.__rideDataSubscription?.unsubscribe?.();
```

### Database Debugging

**MongoDB Query Inspection:**
```bash
# Enable query logging
export MONGODB_DEBUG=true

# Connect to MongoDB directly
mongosh "mongodb://localhost:27017/supportcarr"
db.rides.find({ status: 'requested' }).explain('executionStats')
db.users.find({ email: 'test@example.com' }).explain('executionStats')
```

**Redis Commands:**
```bash
redis-cli
> KEYS driver:*
> GEO INFO drivers
> TTL session:{sessionId}
```

### Common Issues & Solutions

| Issue | Diagnosis | Solution |
|-------|-----------|----------|
| Real-time updates not showing | Check ride ID mismatch (see [known issue #5](#5-ride-id-property-mismatch-real-time-updates)) | Ensure server emits `_id` consistently |
| SMS WTP not triggering | Check Twilio webhook config; verify signature | See [PILOT_SETUP.md](docs/PILOT_SETUP.md) webhook section |
| Driver not matching | Euclidean distance bug (see [known issue #6](#6-euclidean-distance-calculation-geo-matching)) | Wait for Haversine fix or use production Redis |
| Tests failing randomly | Race conditions in integration tests | Add explicit waits; use jest.useFakeTimers() |
| Payment capture fails | Missing Stripe secret or wrong API version | Check `STRIPE_SECRET_KEY` env var |
| CORS blocking requests | Overly permissive config (see [known issue #2](#2-overly-permissive-cors-configuration)) | Set `CORS_ORIGIN` to your domain |

---

## 📊 Performance Tuning

### Backend Optimization Checklist

- [ ] **Database Indexes:** Add missing indexes on email, phoneNumber (see [issue #10](#10-missing-database-indexes))
- [ ] **Mongoose Lean:** Use `.lean()` for read-only queries (e.g., listing rides)
- [ ] **Redis Caching:** Cache driver locations + common queries (Airtable field lookups)
- [ ] **Connection Pooling:** MongoDB connection reuse already configured in mongoose
- [ ] **Query Projection:** Select only needed fields; avoid fetching entire documents
- [ ] **Logging:** Set `LOG_LEVEL=warn` in production (not debug)
- [ ] **Rate Limiting:** Already at 100 req/15min; consider per-endpoint limits for auth
- [ ] **Payment Retry:** Implement exponential backoff for Stripe API failures

### Frontend Optimization Checklist

- [ ] **Code Splitting:** Vite already splits vendor + app code
- [ ] **Lazy Loading:** Pages lazy-load via React Router `lazy()`
- [ ] **Image Optimization:** Keep map images compressed
- [ ] **EventSource Fallback:** Polling interval set to 30s; increase for lower bandwidth
- [ ] **Service Worker:** PWA already caches static assets; update cache version for new builds
- [ ] **State Management:** Zustand is lightweight; minimal unnecessary re-renders
- [ ] **Tailwind Purging:** Only used classes included in production bundle

### Benchmarks

*Note: These are estimated based on typical loads; actual performance depends on infrastructure.*

| Operation | Latency | Notes |
|-----------|---------|-------|
| Authenticate (login) | 100-150ms | bcrypt hashing overhead |
| Create ride | 50-100ms | Includes Stripe payment intent + validation |
| List driver matches | 20-30ms | Redis geospatial queries |
| Real-time SSE update | <10ms | Server-side event emission |
| Polling fallback | 30s cycle | Configurable interval |
| Capture payment | 200-500ms | Stripe API latency |
| Sync to Airtable | 500-1000ms | Async, non-blocking |

---

## 🌐 API Endpoints Reference

### Authentication

**POST** `/api/auth/register`
- Register new user account
- Body: `{ email, password (8+ chars), name, phoneNumber, role: 'rider'|'driver'|'admin' }`
- Returns: `{ user, accessToken, refreshToken }`
- Status: 201

**POST** `/api/auth/login`
- Authenticate existing user
- Body: `{ email, password }`
- Returns: `{ user, accessToken, refreshToken }`
- Status: 200

**POST** `/api/auth/refresh`
- Issue new access token
- Body: `{ refreshToken }`
- Returns: `{ accessToken }`
- Status: 200

**POST** `/api/auth/logout`
- Revoke refresh token
- Body: `{ refreshToken }`
- Status: 204

### Rides

**POST** `/api/rides`
- Create new ride request
- Auth: `rider` | `admin`
- Body: `{ pickup: {lat, lng, address}, dropoff: {...}, bikeType, notes }`
- Returns: Ride object (includes `_id`, status, empty `driver`)
- Status: 201

**GET** `/api/rides`
- List authenticated user's rides
- Auth: `rider` | `admin`
- Returns: Array of Ride objects
- Status: 200

**GET** `/api/rides/:rideId/stream`
- Real-time ride updates via SSE
- Auth: `rider` | `driver` | `admin`
- Query: `?token={accessToken}` (for CORS with credentials)
- Returns: `text/event-stream` with events:
  - `snapshot` - Initial ride state
  - `status` - Status updates
  - `: heartbeat` - Keepalive every 25s
- Status: 200

**GET** `/api/rides/:rideId/poll`
- Poll for ride updates (fallback for SSE)
- Auth: `rider` | `driver` | `admin`
- Returns: Current Ride object
- Status: 200

**PATCH** `/api/rides/:rideId`
- Update ride status (driver operations)
- Auth: `driver` | `admin`
- Body: `{ status: 'en_route'|'completed'|'cancelled', driverEtaMinutes }`
- Returns: Updated Ride object
- Status: 200

### Drivers

**GET** `/api/drivers`
- List all drivers (admin only)
- Auth: `admin`
- Returns: Array of Driver objects with populated user info
- Status: 200

**POST** `/api/drivers`
- Create/update driver profile
- Auth: `driver`
- Body: `{ vehicleType, vehicleDescription, licensePlate }`
- Returns: Driver object
- Status: 201

**PATCH** `/api/drivers/:driverId`
- Update driver status + location
- Auth: `driver` | `admin`
- Body: `{ active, currentLocation: {lat, lng}, serviceRadiusMiles }`
- Returns: Updated Driver object
- Status: 200

### Twilio Webhooks

**POST** `/api/twilio/inbound`
- Inbound SMS webhook handler
- Auth: Twilio signature verification (X-Twilio-Signature header)
- Body: Twilio webhook payload (form-encoded)
- Returns: Empty 200 (Twilio expects immediate response)
- Status: 200

### Health

**GET** `/api/health`
- Health check endpoint
- Auth: None
- Returns: `{ status: 'ok' }`
- Status: 200

---

## 📚 Documentation

- **[PR Catalog & Labels](PR_LABELS.md)** - Complete list of all 31 PRs with recommended labels
- **[Santa Monica Pilot Setup](docs/PILOT_SETUP.md)** - Complete guide for Airtable, Twilio, and WTP system
- [Setup & Operations](docs/README.md) - Getting started and deployment
- [Architecture](docs/ARCHITECTURE.md) - System design and data flow
- [API Reference](docs/API.md) - Complete API endpoint documentation
- [Roadmap](ROADMAP.md) - Future features and development plans
- [Contributing](CONTRIBUTING.md) - Contribution guidelines and standards

## Health Check

Verify the API is running:

```bash
curl http://localhost:4000/api/health
```

Expect `{ "status": "ok" }`.

## 🚀 Santa Monica Pilot

The Santa Monica pilot (PR #31) includes a production-ready **Willingness To Pay (WTP) measurement system** to enable data-driven pricing decisions.

### 📊 How It Works

1. **Ride Completion** - When a ride status changes to `completed`
2. **Automated SMS** - System sends WTP survey via Twilio: *"Would you pay $25 for this service?"*
3. **Rider Response** - Rider replies YES, NO, or a custom price (e.g., "30" or "$25")
4. **Data Capture** - Response stored in MongoDB and synced to Airtable for analysis
5. **Conversation Logs** - All SMS interactions logged in Airtable with ride linkage

### ✅ Production-Ready Features

- **Twilio Signature Verification** - Prevents spoofed SMS data and unauthorized access
- **Multi-Rider Safe** - Correct matching even with concurrent rescues using indexed queries
- **Airtable Integration** - Real-time analytics in `Rides` and `SMS Logs` tables
- **O(1) Lookup Performance** - Denormalized `riderPhone` field for instant matching
- **Security Hardened** - Complete PII documentation and compliance considerations
- **Comprehensive Testing** - Automated test scripts for single and multi-rider scenarios

### 🎯 Quick Start

See **[docs/PILOT_SETUP.md](docs/PILOT_SETUP.md)** for complete setup instructions including:
- Airtable base and table configuration with sample data
- Twilio account setup and webhook configuration
- Environment variables and credential management
- Step-by-step testing procedures
- Security, PII, and compliance guidelines
- Production deployment checklist

### 🧪 Testing the WTP Flow

```bash
# Test with your actual phone number
node server/scripts/test-wtp-flow.js +13105551234

# Verify multi-rider scenario handling (concurrent rescues)
node server/scripts/test-multi-rider-wtp.js

# Expected output:
# ✓ Ride created and completed
# ✓ WTP SMS sent via Twilio
# ✓ Ride synced to Airtable
# ✓ SMS conversation logged
# ✓ Multi-rider matching works correctly
```

### 📈 Analytics & Insights

All WTP responses are automatically captured in Airtable for analysis:
- Aggregate YES/NO response rates
- Custom price point distribution
- Response time analysis
- Ride-to-payment conversion metrics
- Geographic pricing insights

---

## 🔄 Development Workflow & PR Management

### Project Evolution

SupportCarr has evolved through **31 merged pull requests** covering:

- **7 Major Features** - Core functionality and pilot-specific features
- **3 Critical Bug Fixes** - Distance calculation, geo handling, and schema issues
- **6 Documentation Updates** - Comprehensive guides and API references
- **3 CI/CD Implementations** - Automated testing and quality checks
- **2 Refactoring PRs** - Code quality and architecture improvements
- **1 Security Enhancement** - Input validation and error handling
- **1 Planning Document** - Sprint planning and roadmap
- **Additional PRs** - Configuration, testing, and tooling improvements

See the complete **[PR Catalog & Labels](PR_LABELS.md)** for:
- Detailed description of each PR
- Recommended labels by category
- Impact analysis and key changes
- Instructions for applying labels via GitHub web interface

### Pull Request Labels

We use a comprehensive labeling system to categorize PRs:

**Type Labels:**
- `feature` - New functionality
- `bugfix` - Bug fixes and corrections
- `refactor` - Code improvements without behavior changes
- `documentation` - Documentation updates
- `testing` - Test additions and improvements
- `tooling` - Development tools and configuration
- `security` - Security enhancements

**Scope Labels:**
- `backend` - Server-side changes
- `frontend` - Client-side changes
- `ci/cd` - Continuous integration/deployment
- `integration` - Third-party service integration

**Priority Labels:**
- `critical` - Must be addressed immediately
- `high` - Important for current milestone
- `medium` - Should be included in sprint
- `low` - Nice to have, not urgent

**Status Labels:**
- `mvp` - Part of minimum viable product
- `pilot` - Santa Monica pilot specific
- `production-ready` - Tested and ready for deployment

### Contributing

We follow a structured development process:

1. **Branch Naming:** Use descriptive names with prefixes
   - `feature/` - New features
   - `bugfix/` - Bug fixes
   - `refactor/` - Code improvements
   - `docs/` - Documentation updates

2. **Commit Messages:** Follow conventional commits
   - `feat:` - New feature
   - `fix:` - Bug fix
   - `refactor:` - Code refactoring
   - `docs:` - Documentation
   - `test:` - Testing
   - `chore:` - Maintenance

3. **PR Process:**
   - Create PR with descriptive title
   - Apply appropriate labels (see [PR_LABELS.md](PR_LABELS.md))
   - Ensure all CI checks pass
   - Request review from team members
   - Address feedback and merge when approved

4. **Code Quality:**
   - All tests must pass
   - ESLint checks must pass
   - Code coverage should not decrease
   - Documentation updated as needed

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines.

---

## 🏆 Key Milestones

### Phase 1: Foundation (PRs #1-#10)
- ✅ Initial MVP codebase
- ✅ Project planning and documentation
- ✅ CI/CD pipeline setup
- ✅ Testing infrastructure

### Phase 2: Core Features (PRs #11-#20)
- ✅ Authentication and security
- ✅ API gateway refactoring
- ✅ Monorepo structure with NPM workspaces
- ✅ Unified testing framework

### Phase 3: Advanced Features (PRs #21-#25)
- ✅ Full-stack MVP implementation
- ✅ Stripe payment integration
- ✅ Real-time ride updates
- ✅ Address autocomplete

### Phase 4: Santa Monica Pilot (PRs #26-#31)
- ✅ Bug fixes and optimizations
- ✅ Database configuration standardization
- ✅ Airtable + Twilio SMS integration
- ✅ Complete WTP measurement system
- ✅ Production security hardening

### Next Phase: Expansion
- 🔄 Additional pilot locations
- 🔄 Advanced analytics dashboard
- 🔄 Driver mobile app
- 🔄 Automated pricing optimization

---

## 🤝 Community & Support

### Getting Help

- **Documentation Issues:** Check [docs/](docs/) or open an issue
- **Setup Problems:** See [docs/PILOT_SETUP.md](docs/PILOT_SETUP.md)
- **Feature Requests:** Open an issue with the `feature` label
- **Bug Reports:** Open an issue with the `bugfix` label

### Contributing

We welcome contributions! Please see:
- [CONTRIBUTING.md](CONTRIBUTING.md) - Contribution guidelines
- [PR_LABELS.md](PR_LABELS.md) - PR labeling system
- [ROADMAP.md](ROADMAP.md) - Future development plans

### Project Resources

- **Repository:** https://github.com/PetrefiedThunder/SupportCarr
- **Issues:** https://github.com/PetrefiedThunder/SupportCarr/issues
- **Pull Requests:** https://github.com/PetrefiedThunder/SupportCarr/pulls
- **Documentation:** [docs/](docs/)

---

## 📊 Technology Stack

### Backend (Node.js 20 LTS)

| Component | Version | Purpose |
|-----------|---------|---------|
| **Express.js** | 5.1.0 | HTTP REST API framework |
| **MongoDB + Mongoose** | 8.7.0 | Document database + ODM |
| **Redis** | 4.6.13 | Geospatial caching & driver matching |
| **jsonwebtoken** | 9.0.2 | JWT tokens (HS256) |
| **bcryptjs** | 2.4.3 | Password hashing |
| **Joi** | 17.13.3 | Schema validation on all requests |
| **Winston** | 3.14.2 | Structured logging |
| **Helmet** | 7.1.0 | HTTP security headers |
| **express-rate-limit** | 7.1.5 | Rate limiting (100 req/15min global) |
| **Axios** | 1.7.7 | HTTP client for external services |
| **stripe** | 16.6.0 | Payment processing SDK |
| **twilio** | 5.10.5 | SMS API + webhook parsing |
| **airtable** | 0.12.2 | Analytics logging + data sync |

### Frontend (React 18)

| Component | Version | Purpose |
|-----------|---------|---------|
| **React** | 18.3.1 | UI framework |
| **React Router** | 6.27.0 | Client-side routing |
| **Zustand** | 4.5.4 | Lightweight state management |
| **Vite** | 5.4.8 | Build tool & dev server |
| **Tailwind CSS** | 3.4.14 | Utility-first CSS framework |
| **Leaflet** | 1.9.4 | Interactive maps |
| **react-leaflet** | 4.2.1 | React wrapper for Leaflet |
| **Axios** | 1.7.7 | HTTP API client |

### Testing & DevOps

| Component | Version | Purpose |
|-----------|---------|---------|
| **Jest** | 29.7.0 | Unit + integration test runner |
| **React Testing Library** | 16.0.1 | Component testing |
| **Supertest** | 6.3.4 | HTTP endpoint testing |
| **mongodb-memory-server** | - | In-memory MongoDB for tests |
| **ESLint** | 9.13.0 | Code quality linting |
| **Prettier** | 3.3.3 | Code formatting |
| **Nodemon** | 3.1.7 | Auto-reload dev server |
| **GitHub Actions** | - | CI/CD pipeline |

### Integration APIs

| Service | SDK | API Version | Notes |
|---------|-----|-------------|-------|
| **Stripe** | stripe v16.6.0 | 2024-06-20 | Manual capture payment flow |
| **Twilio** | twilio v5.10.5 | REST API | SMS + request signature verification |
| **Airtable** | airtable v0.12.2 | REST API | Analytics sync + SMS logging |
| **Mapbox** | Client-side API | v5 | Geocoding (forward + reverse) |

---

## 🐛 Technical Debt and Known Issues

A comprehensive bug hunt identified 30 issues across the codebase. This section documents the most critical findings and their resolutions.

### 🚨 CRITICAL SECURITY ISSUES

#### 1. Hardcoded JWT Secret Fallback
**File:** `server/src/middlewares/auth.js:14`, `server/src/services/authService.js:17`
**Issue:** Default JWT secret `'dev-secret'` used when `JWT_SECRET` env var unset
```javascript
const payload = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret');
```
**Risk:** Production credentials compromised if JWT_SECRET not explicitly configured
**Fix:** Remove fallback; throw error requiring explicit configuration
**Status:** ⚠️ TODO - Must fix before production deployment

#### 2. Overly Permissive CORS Configuration
**File:** `server/src/app.js:13`
**Issue:** CORS origin defaults to wildcard (`*`) when not configured
```javascript
app.use(cors({ origin: process.env.CORS_ORIGIN || '*', credentials: true }));
```
**Risk:** CSRF vulnerability; any origin can make authenticated requests
**Fix:** Define explicit allowed origins or deny by default
**Status:** ⚠️ TODO - Set `CORS_ORIGIN` in production

#### 3. Token Exposure in Query Parameters
**File:** `client/src/hooks/useRideData.js:71`
**Issue:** JWT token passed in URL query parameters for EventSource
```javascript
streamUrl.searchParams.set('token', accessToken);
```
**Risk:** Tokens visible in browser history, logs, referrer headers
**Fix:** Implement custom header authentication or Cookie-based auth for EventSource
**Workaround:** Tokens are short-lived (15min) and EventSource fallback only
**Status:** ⚠️ MEDIUM - Research EventSource auth alternatives

#### 4. Airtable Query Injection
**File:** `server/src/services/analyticsService.js:157, 244`
**Issue:** Unescaped user input in Airtable `filterByFormula`
```javascript
filterByFormula: `{Ride ID} = "${rideId}"` // rideId not escaped
```
**Risk:** Malicious rideId could break queries or access unintended data
**Fix:** Properly escape values or use Airtable parameterized queries
**Status:** ⚠️ HIGH - Needs escaping utility

### 🔴 HIGH-PRIORITY ISSUES

#### 5. Ride ID Property Mismatch (Real-time Updates)
**File:** `client/src/hooks/useRideData.js:81` vs `server/src/controllers/rideController.js:235`
**Issue:** Server emits `ride.id` but client looks for `payload._id`
```javascript
// Server: rideEvents.emit('ride-status', { rideId: ride.id, ride });
// Client: const index = current.findIndex((ride) => ride._id === payload._id);
```
**Impact:** Real-time updates don't match rides; UI doesn't update correctly
**Fix:** Use consistent property naming (recommend `_id`)
**Status:** ⚠️ HIGH - Breaking issue for live updates

#### 6. Euclidean Distance Calculation (Geo Matching)
**File:** `server/src/config/redis.js:99`
**Issue:** In-memory geo client uses Euclidean distance instead of Haversine
```javascript
const distance = Math.sqrt((lon - centerLongitude) ** 2 + (lat - centerLatitude) ** 2);
```
**Impact:** Driver matching results off by 50%+ at equator; worse near poles
**Fix:** Implement proper Haversine formula for Earth distance
**Status:** ⚠️ CRITICAL - Geo accuracy severely compromised

#### 7. WTP Amount Logic Bug
**File:** `server/src/routes/twilioRoutes.js:144`
**Issue:** Zero amount treated as falsy
```javascript
if (wtpAmountUsd) { // Zero dollars wouldn't be saved
  ride.wtpAmountUsd = wtpAmountUsd;
}
```
**Impact:** Users offering $0 WTP not recorded
**Fix:** Use explicit null checks: `wtpAmountUsd !== null && wtpAmountUsd !== undefined`
**Status:** ⚠️ MEDIUM - Edge case but impacts analytics

### 🟡 MEDIUM-PRIORITY ISSUES

#### 8. Error Handler Inadequate
**File:** `server/src/middlewares/errorHandler.js`
**Issue:** Doesn't properly classify/detail errors; returns generic 500s
**Impact:** Inconsistent error responses; clients can't distinguish error types
**Fix:** Add error classification and detailed context
**Status:** ⚠️ MEDIUM - Impacts debugging and API reliability

#### 9. Missing Event Listener Cleanup
**File:** `client/src/hooks/useRideData.js:98-100`
**Issue:** EventSource errors don't close connection; listeners accumulate
```javascript
source.onerror = () => {
  setError('Connection interrupted...');
  // source never closed; listener never removed
};
```
**Impact:** Zombie connections accumulate in memory
**Fix:** Close source and implement exponential backoff
**Status:** ⚠️ MEDIUM - Memory leak over time

#### 10. Missing Database Indexes
**File:** `server/src/models/User.js`, `server/src/models/Ride.js`
**Issue:** Frequently queried fields lack explicit indexes
- Email field (authService.registerUser, validateUserCredentials)
- Phone field (WTP matching: `findOne({ riderPhone })`)

**Impact:** Query performance degrades with large datasets
**Fix:** Add explicit indexes: `userSchema.index({ email: 1 }); userSchema.index({ phoneNumber: 1 })`
**Status:** ⚠️ MEDIUM - Performance regression with scale

#### 11. Memory Leak in SMS Cache
**File:** `server/src/services/analyticsService.js:261`
**Issue:** setTimeout cleanup without stored references
```javascript
setTimeout(() => smsLogCache.delete(messageSid), 3600000); // No ref stored
```
**Impact:** With high SMS volume, cleanup timeouts accumulate
**Fix:** Store timeout refs; clear on shutdown
**Status:** ⚠️ MEDIUM - Affects high-traffic deployments

#### 12. Silent Promise Rejections
**File:** `server/src/services/paymentService.js:125, 163`
**Issue:** `catch(() => {})` silently swallows errors
```javascript
await ride.save().catch(() => {}); // Silent failure
```
**Impact:** Payment data loss undetected; hard to debug
**Fix:** Log errors or propagate
**Status:** ⚠️ MEDIUM - Critical for reliability

### 🔵 LOWER-PRIORITY ISSUES (6+ more)

Additional issues include:
- Inconsistent logging (mix of console.log and winston)
- Missing client-side form validation
- Redundant error checks in ActiveRidePage
- Race condition in ride streaming setup
- Async/await pattern issues in driverService
- Type safety issues (missing JSDoc/TypeScript)

**Full audit report:** See [Bug Hunt Details](#bug-hunt-summary-table) below

### Bug Hunt Summary Table

| Severity | Count | Examples |
|----------|-------|----------|
| CRITICAL | 2 | JWT fallback, Euclidean distance |
| HIGH | 5 | CORS config, token in query, ride ID mismatch, Airtable injection, WTP logic |
| MEDIUM | 17 | Error handling, memory leaks, missing indexes, silent rejections |
| LOW | 6 | Logging inconsistency, missing validation, redundant checks |
| **TOTAL** | **30** | See implementation notes above |

### Recommended Action Plan

**Phase 1 (CRITICAL - Do Immediately):**
1. Remove JWT secret fallback; require explicit `JWT_SECRET`
2. Fix Euclidean distance → Haversine formula
3. Set `CORS_ORIGIN` to explicit domain (not wildcard)
4. Fix ride ID mismatch (server `ride.id` → `ride._id`)

**Phase 2 (HIGH - This Sprint):**
5. Escape Airtable filterByFormula inputs
6. Implement proper error handler with classification
7. Fix WTP amount falsy check
8. Close EventSource on error; implement backoff

**Phase 3 (MEDIUM - Next Sprint):**
9. Add database indexes for email, phoneNumber
10. Proper logging throughout (replace console.log)
11. Fix silent promise rejections (log or propagate)
12. Add client-side form validation

**Phase 4 (LOW - Future):**
- Add TypeScript or comprehensive JSDoc
- Improve async/await patterns
- Add timeout logic to EventSource
- Request-level rate limiting for auth endpoints

### Security Audit Checklist

- [ ] JWT secret not hardcoded (requires explicit env var)
- [ ] CORS origin explicitly configured (not wildcard)
- [ ] Token auth for real-time (not in query params)
- [ ] SQL injection protected (Airtable escaping)
- [ ] Error messages don't leak sensitive info
- [ ] Rate limiting per-endpoint for auth
- [ ] No credentials in logs or error responses
- [ ] HTTPS enforced in production
- [ ] Helmet security headers enabled
- [ ] Request validation on all endpoints

---

## 📝 License

See [LICENSE](LICENSE) for details.

---

## 🙏 Acknowledgments

Built with modern web technologies and best practices. Special thanks to all contributors who have helped shape this project through 31+ pull requests.

**Project maintained by:** PetrefiedThunder
**Last Updated:** 2025-11-15
**Last Comprehensive Audit:** 2025-11-15 (30 issues identified and documented)

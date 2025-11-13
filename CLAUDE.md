# CLAUDE.md - AI Assistant Guide for SupportCarr

## Project Overview

**SupportCarr** is an on-demand e-bike and bicycle rescue service MVP operating in Echo Park, Silver Lake, and Joshua Tree. This is a full-stack monorepo featuring:

- **Express 5 + MongoDB** backend with JWT authentication
- **React 18 + Vite** PWA frontend with real-time ride tracking
- **Redis geospatial** driver matching
- **Stripe** payment processing (manual capture)
- **Airtable** analytics integration
- **Jest** test suites (unit + integration)
- **GitHub Actions** CI/CD pipeline

**Business Model:** $50 flat-rate bike/e-bike rescue service with automatic driver assignment and real-time tracking.

---

## Repository Structure

```
/
├── server/              # Express API backend (CommonJS)
│   ├── src/
│   │   ├── config/      # Database, Redis, Logger configuration
│   │   ├── controllers/ # Request handlers (thin layer)
│   │   ├── middlewares/ # Auth, validation, error handling
│   │   ├── models/      # Mongoose schemas (User, Ride, Driver)
│   │   ├── routes/      # Express routers with middleware chains
│   │   ├── services/    # Business logic layer
│   │   ├── utils/       # Validation schemas, seed data, serializers
│   │   └── tests/       # Jest unit & integration tests
│   ├── server.js        # Entry point (starts HTTP server)
│   └── .env.example     # Required environment variables
│
├── client/              # React PWA frontend (ES Modules)
│   ├── src/
│   │   ├── api/         # HTTP client, geocoding service
│   │   ├── components/  # Reusable UI components
│   │   ├── pages/       # Route-level components
│   │   ├── hooks/       # Custom React hooks
│   │   ├── store/       # Zustand state management
│   │   ├── pwa/         # Service worker registration
│   │   └── tests/       # Jest + React Testing Library
│   ├── vite.config.js   # Vite build configuration
│   └── .env.example     # Frontend environment variables
│
├── backend/             # Infrastructure code (Postgres, auth utilities)
├── services/            # Microservices (api-gateway stub)
├── src/                 # Shared middleware
├── docs/                # Architecture, API reference, setup guides
├── .github/workflows/   # CI/CD (quality → test → build)
└── package.json         # Root workspace configuration
```

### Key Directories Explained

- **server/src/services/**: Business logic layer - all domain logic lives here, not in controllers
- **server/src/controllers/**: Thin handlers that call services and format responses
- **server/src/models/**: Mongoose models with schema definitions and indexes
- **server/src/middlewares/**: Auth (JWT), validation (Joi), error handling
- **server/src/utils/**: Validation schemas, event emitters, serializers
- **client/src/store/**: Zustand stores for session management (multi-role switching)
- **client/src/api/**: Axios HTTP client with auth interceptors
- **docs/**: Comprehensive documentation including OpenAPI spec

---

## Technology Stack

### Backend
- **Runtime:** Node.js 20+
- **Framework:** Express 5.1.0
- **Database:** MongoDB with Mongoose 8.7.0
- **Cache:** Redis 4.6.13 (with in-memory fallback)
- **Auth:** JWT (jsonwebtoken 9.0.2), bcryptjs 2.4.3
- **Validation:** Joi 17.13.3
- **Payments:** Stripe 16.6.0 (manual capture for pre-authorization)
- **Analytics:** Airtable 0.12.2
- **Logging:** Winston 3.14.2
- **Testing:** Jest 29.7.0, Supertest 6.3.4, mongodb-memory-server 9.1.7

### Frontend
- **Framework:** React 18.3.1, React Router 6.27.0
- **Build Tool:** Vite 5.4.8
- **State:** Zustand 4.5.4
- **HTTP:** Axios 1.7.7
- **Maps:** Leaflet 1.9.4
- **Styling:** Tailwind CSS 3.4.14
- **Testing:** Jest 29.7.0, React Testing Library 16.0.1, jsdom

---

## Development Setup

### Prerequisites
- Node.js 20+
- MongoDB running locally or connection string
- Redis (optional - falls back to in-memory)

### Quick Start

```bash
# Install all dependencies
npm install

# Copy environment files
cp server/.env.example server/.env
cp client/.env.example client/.env

# Configure server/.env with your values
# - MONGODB_URI (required)
# - JWT_SECRET (required)
# - REDIS_URL (optional)
# - STRIPE_SECRET_KEY (optional for payments)
# - AIRTABLE_API_KEY (optional for analytics)

# Start backend (port 4000)
npm run dev:server

# Start frontend (port 5173) - in separate terminal
npm run dev:client

# Seed database with demo data
npm --workspace server run seed

# Run demo script (simulates full ride lifecycle)
node server/src/utils/demoScript.js
```

### Environment Variables

**server/.env:**
```bash
PORT=4000
MONGODB_URI=mongodb://localhost:27017/supportcarr
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-secret-key-here
JWT_EXPIRATION=1d
STRIPE_SECRET_KEY=sk_test_...
AIRTABLE_API_KEY=pat...
AIRTABLE_BASE_ID=app...
AIRTABLE_RIDES_TABLE=RideEvents
```

**client/.env:**
```bash
VITE_API_URL=http://localhost:4000/api
```

---

## Architecture & Patterns

### Backend Patterns

**1. Service Layer Pattern**
```
Controller (thin) → Service (business logic) → Model (data access)
```

Controllers should be minimal - just extract request data and call services:
```javascript
// Good: Controller delegates to service
async function createRide(req, res, next) {
  try {
    const ride = await rideService.requestRide({
      riderId: req.user.sub,
      pickup: req.body.pickup,
      dropoff: req.body.dropoff,
      bikeType: req.body.bikeType,
      notes: req.body.notes
    });
    res.status(201).json(ride);
  } catch (error) {
    next(error);
  }
}
```

**2. Middleware Pipeline**
```
Security (Helmet) → CORS → Rate Limiting → Logging →
JWT Auth → Validation → Controller → Error Handler
```

**3. Event-Driven Updates**
```javascript
const rideEvents = require('../utils/rideEvents');

// Emit events after state changes
rideEvents.emit('ride-status', { rideId, ride });

// Listen in controllers for SSE streaming
rideEvents.on('ride-status', onRideEvent);
```

**4. Graceful Degradation**
- Redis connection failures fall back to in-memory storage
- External service failures (Stripe, Airtable) log errors but don't block operations

**5. Manual Payment Capture**
- Pre-authorize on ride request: `capture_method: 'manual'`
- Capture on ride completion: `paymentIntents.capture()`

### Frontend Patterns

**1. API Client with Interceptors**
```javascript
// api/client.js exports configured axios instance
// Automatically attaches auth tokens from Zustand store
```

**2. Server-Sent Events (SSE) for Real-Time**
```javascript
const eventSource = new EventSource(`/api/rides/${rideId}/stream`);
eventSource.addEventListener('status', (event) => {
  const ride = JSON.parse(event.data);
  // Update UI
});
```

**3. Zustand for Global State**
```javascript
// Multi-role session management
const { activeRole, setActiveRole, tokens } = useSessionStore();
```

**4. Custom Hooks for Complex Logic**
```javascript
// hooks/useDemoSession.js - Auto-login for demo mode
// hooks/useRideData.js - Fetch and cache ride data
```

---

## Code Conventions & Style

### JavaScript Style

**Backend (CommonJS):**
```javascript
// Use require/module.exports
const express = require('express');
module.exports = { createRide, updateRide };

// Async/await for all async operations
async function createRide(req, res, next) {
  try {
    const ride = await rideService.requestRide(data);
    res.status(201).json(ride);
  } catch (error) {
    next(error); // Always pass errors to next()
  }
}
```

**Frontend (ES Modules):**
```javascript
// Use import/export
import { useEffect, useState } from 'react';
export default RideRequestForm;
```

### Naming Conventions

- **Files:** camelCase (e.g., `rideService.js`, `RideRequestForm.jsx`)
- **Components:** PascalCase (e.g., `RideRequestForm`, `MapPreview`)
- **Functions:** camelCase with descriptive verbs (e.g., `createRide`, `findNearbyDrivers`)
- **Constants:** SCREAMING_SNAKE_CASE (e.g., `JWT_EXPIRATION`)
- **Models:** PascalCase singular (e.g., `User`, `Ride`, `Driver`)

### Error Handling

**Backend:**
```javascript
// Throw descriptive errors in services
if (!ride) {
  throw new Error('Ride not found');
}

// Let centralized error handler (middleware) format responses
// Don't manually send error responses in services
```

**Frontend:**
```javascript
// Catch and display user-friendly messages
try {
  await api.createRide(data);
} catch (error) {
  console.error('Ride creation failed:', error);
  setError(error.response?.data?.message || 'Failed to create ride');
}
```

### ESLint Rules

- `no-unused-vars: 'warn'` - Unused variables are warnings
- `eqeqeq: 'error'` - Always use `===` and `!==`
- eslint:recommended baseline

---

## Testing Guidelines

### Backend Testing

**Test Structure:**
```
server/src/tests/
├── unit/               # Service-level tests with mocked dependencies
│   ├── rideService.test.js
│   └── dispatchService.test.js
├── integration/        # Full request/response lifecycle
│   └── rideLifecycle.test.js
└── mocks/              # Shared test fixtures
```

**Unit Test Patterns:**
```javascript
// Mock external services
jest.mock('../../services/dispatchService');

// Use mongodb-memory-server for DB isolation
beforeAll(async () => {
  await mongoose.connect(global.__MONGO_URI__);
});

// Mock Stripe/Airtable with test helpers
paymentService.__setStripeClient(mockStripeClient);
analyticsService.__setAirtableBase(mockAirtableBase);

// Clean up after tests
afterEach(async () => {
  await Ride.deleteMany({});
  jest.clearAllMocks();
});
```

**Integration Test Patterns:**
```javascript
// Use Supertest for HTTP testing
const response = await request(app)
  .post('/api/rides')
  .set('Authorization', `Bearer ${token}`)
  .send(rideData)
  .expect(201);

expect(response.body.status).toBe('requested');
```

**Test Commands:**
```bash
# Run all tests
npm test

# Backend only
npm --workspace server run test

# Unit tests only
npm --workspace server run test:unit

# Integration tests only
npm --workspace server run test:integration

# Watch mode
npm --workspace server run test:watch
```

### Frontend Testing

**Component Test Patterns:**
```javascript
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock API calls
jest.mock('../api/client');

test('submits ride request', async () => {
  const user = userEvent.setup();
  render(<RideRequestForm />);

  await user.type(screen.getByLabelText(/pickup/i), '123 Main St');
  await user.click(screen.getByRole('button', { name: /request/i }));

  await waitFor(() => {
    expect(api.createRide).toHaveBeenCalled();
  });
});
```

**Test Commands:**
```bash
# Frontend tests
npm --workspace client run test

# Watch mode
npm --workspace client run test:watch
```

---

## Common Workflows

### Adding a New API Endpoint

1. **Define validation schema** in `server/src/utils/validationSchemas.js`:
```javascript
const newFeatureSchema = Joi.object({
  field: Joi.string().required(),
  // ...
});
```

2. **Add service method** in appropriate service file:
```javascript
// server/src/services/featureService.js
async function createFeature(data) {
  // Business logic here
  return await Feature.create(data);
}
```

3. **Add controller** in `server/src/controllers/`:
```javascript
async function createFeature(req, res, next) {
  try {
    const result = await featureService.createFeature(req.body);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
}
```

4. **Add route** in `server/src/routes/`:
```javascript
router.post('/',
  authenticateJWT,
  requireRole(['admin']),
  validate(newFeatureSchema),
  featureController.createFeature
);
```

5. **Write tests** in `server/src/tests/unit/` and `integration/`

6. **Update OpenAPI spec** in `docs/openapi.yaml`

### Adding a New React Component

1. **Create component** in `client/src/components/`:
```javascript
export default function MyComponent({ prop1, prop2 }) {
  return (
    <div className="container">
      {/* Tailwind classes */}
    </div>
  );
}
```

2. **Add test** in `client/src/tests/`:
```javascript
import { render, screen } from '@testing-library/react';
import MyComponent from '../components/MyComponent';

test('renders correctly', () => {
  render(<MyComponent prop1="test" />);
  expect(screen.getByText(/test/i)).toBeInTheDocument();
});
```

3. **Use in page** or other components:
```javascript
import MyComponent from '../components/MyComponent';
```

### Adding a New Mongoose Model

1. **Create model** in `server/src/models/`:
```javascript
const mongoose = require('mongoose');

const featureSchema = new mongoose.Schema({
  name: { type: String, required: true },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  }
}, {
  timestamps: true // Adds createdAt, updatedAt
});

// Add indexes
featureSchema.index({ name: 1 });

module.exports = mongoose.model('Feature', featureSchema);
```

2. **Add to database config** if needed for initialization

3. **Create service** to encapsulate business logic

4. **Write unit tests** for model validation and methods

### Running the Full Demo

```bash
# 1. Seed database with demo users and drivers
npm --workspace server run seed

# 2. Run automated demo script
node server/src/utils/demoScript.js

# This simulates:
# - Rider login and ride request
# - Driver auto-assignment
# - Status updates (en_route → completed)
# - Payment capture
# - Analytics logging
```

---

## Database & Data Models

### User Model (`server/src/models/User.js`)

```javascript
{
  email: String (unique, lowercase, required),
  passwordHash: String (required),
  role: Enum['rider', 'driver', 'admin'] (required),
  name: String (required),
  phoneNumber: String,
  stripeCustomerId: String,
  refreshTokens: [{
    token: String,
    expiresAt: Date
  }],
  createdAt: Date (auto),
  updatedAt: Date (auto)
}
```

**Indexes:** `email` (unique)

### Driver Model (`server/src/models/Driver.js`)

```javascript
{
  user: ObjectId → User (required),
  vehicleType: Enum['van', 'truck', 'suv', 'other'] (required),
  vehicleDescription: String,
  licensePlate: String,
  active: Boolean (default: true),
  currentLocation: {
    lat: Number,
    lng: Number
  },
  serviceRadiusMiles: Number (default: 15),
  createdAt: Date (auto),
  updatedAt: Date (auto)
}
```

**Indexes:** `user` (unique)

### Ride Model (`server/src/models/Ride.js`)

```javascript
{
  rider: ObjectId → User (required),
  driver: ObjectId → Driver,
  pickup: {
    lat: Number (required),
    lng: Number (required),
    address: String
  },
  dropoff: {
    lat: Number (required),
    lng: Number (required),
    address: String
  },
  bikeType: Enum['bike', 'ebike', 'cargo', 'other'] (required),
  distanceMiles: Number,
  priceCents: Number (required),
  status: Enum['requested', 'accepted', 'en_route', 'completed', 'cancelled']
          (default: 'requested'),
  driverEtaMinutes: Number,
  notes: String,
  paymentIntentId: String,
  paymentChargeId: String,
  paymentStatus: String,
  paymentCapturedAt: Date,
  lastPaymentError: String,
  createdAt: Date (auto),
  updatedAt: Date (auto)
}
```

**Indexes:** `rider`, `driver`, `status`

### Redis Data Structures

- **Key:** `drivers:geo` (geospatial index)
- **Type:** GEOADD with driver IDs at lat/lng coordinates
- **TTL:** No expiration (updated on driver location changes)
- **Queries:** GEORADIUS for finding nearby drivers within radius

---

## API Patterns

### Authentication Flow

```
1. POST /api/auth/register
   → Creates user with hashed password
   → Returns 201 with user object

2. POST /api/auth/login
   → Validates credentials
   → Returns { accessToken, refreshToken }
   → Store tokens in client

3. All protected routes:
   → Include header: Authorization: Bearer <accessToken>

4. POST /api/auth/refresh (when access token expires)
   → Send { refreshToken }
   → Returns new { accessToken, refreshToken }
   → Old refresh token is invalidated (rotation)
```

### Ride Lifecycle

```
1. POST /api/rides (rider/admin)
   → Creates ride with status='requested'
   → Pre-authorizes payment (manual capture)
   → Auto-assigns nearest driver if available
   → Returns ride object with status='accepted' or 'requested'

2. PATCH /api/rides/:rideId (driver/admin)
   → Update status to 'en_route', 'completed', or 'cancelled'
   → If 'completed': captures payment automatically

3. GET /api/rides/:rideId/stream (rider/driver/admin)
   → Opens SSE connection for real-time updates
   → Receives 'snapshot' event immediately
   → Receives 'status' events on changes
   → Heartbeat every 25s to keep connection alive

4. GET /api/rides/:rideId/poll (rider/driver/admin)
   → Alternative to SSE for polling-based clients
   → Returns current ride snapshot
```

### Authorization Rules

- **Public:** `/api/auth/*`, `/api/health`
- **Authenticated:** All other routes require valid JWT
- **Role-based:**
  - `POST /api/rides`: Rider or Admin only
  - `PATCH /api/rides/:rideId`: Driver or Admin only
  - `GET /api/drivers`: Admin only
  - Ride access: Rider, assigned driver, or admin

### Error Responses

```javascript
// Standard error format
{
  "message": "Human-readable error message",
  "status": 400, // HTTP status code
  "error": "BadRequest" // Error type
}

// Common status codes:
// 400 - Bad Request (validation failed)
// 401 - Unauthorized (no/invalid token)
// 403 - Forbidden (insufficient permissions)
// 404 - Not Found
// 500 - Internal Server Error
```

---

## Frontend Patterns

### API Client Usage

```javascript
import api from '../api/client';

// GET request
const rides = await api.get('/rides');

// POST request
const ride = await api.post('/rides', {
  pickup: { lat: 34.078, lng: -118.261, address: 'Echo Park' },
  dropoff: { lat: 34.092, lng: -118.328, address: 'Griffith Observatory' },
  bikeType: 'ebike'
});

// Auth token is automatically attached from Zustand store
```

### Real-Time Updates

```javascript
// SSE for live ride tracking
useEffect(() => {
  const eventSource = new EventSource(
    `${import.meta.env.VITE_API_URL}/rides/${rideId}/stream`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  eventSource.addEventListener('status', (event) => {
    const updatedRide = JSON.parse(event.data);
    setRide(updatedRide);
  });

  return () => eventSource.close();
}, [rideId]);
```

### Multi-Role Session Management

```javascript
import { useSessionStore } from '../store/sessionStore';

function RoleSwitcher() {
  const { activeRole, setActiveRole } = useSessionStore();

  return (
    <select value={activeRole} onChange={(e) => setActiveRole(e.target.value)}>
      <option value="rider">Rider</option>
      <option value="driver">Driver</option>
      <option value="admin">Admin</option>
    </select>
  );
}
```

### Routing Structure

```javascript
// App.jsx
<Routes>
  <Route path="/" element={<Landing />} />
  <Route path="/request" element={<RideRequest />} />
  <Route path="/active" element={<ActiveRide />} />
  <Route path="/driver" element={<DriverDashboard />} />
  <Route path="/admin" element={<AdminDispatch />} />
</Routes>
```

---

## Important Gotchas

### Backend

1. **MongoDB Connection Required**
   - App will not start without valid `MONGODB_URI`
   - Use mongodb-memory-server for tests (auto-configured)

2. **Redis is Optional**
   - Gracefully falls back to in-memory storage
   - Production should use real Redis for multi-instance support

3. **JWT Secret Security**
   - `JWT_SECRET` must be set in production
   - Never commit secrets to version control
   - Use strong random strings (32+ characters)

4. **Stripe Test Mode**
   - Use `sk_test_...` keys for development
   - Payments won't actually charge in test mode
   - Manual capture is critical: `capture_method: 'manual'`

5. **Error Handling**
   - Always use `next(error)` in controllers, never `res.status(500)`
   - Centralized error handler formats all responses
   - Services throw errors, controllers catch and delegate to `next()`

6. **Mongoose Promises**
   - All Mongoose operations return promises, always use `await`
   - Don't forget `.exec()` on queries if not using `await`

7. **Event Emitter Cleanup**
   - Always remove listeners in SSE `req.on('close')` handler
   - Clear intervals to prevent memory leaks

### Frontend

1. **Environment Variables**
   - Must be prefixed with `VITE_` to be accessible
   - Access via `import.meta.env.VITE_API_URL`
   - Not available in regular `.js` files, only build-time

2. **SSE Browser Support**
   - EventSource doesn't support custom headers in all browsers
   - Token must be in URL query param or use polyfill

3. **Build Output**
   - Production build goes to `client/dist/`
   - Preview with `npm --workspace client run preview`

4. **API URL Configuration**
   - Dev server proxies not configured, use full URL with CORS
   - Production should use relative URLs or CDN

5. **Zustand Persistence**
   - Session tokens not persisted to localStorage by default
   - Implement persistence middleware if needed for production

---

## CI/CD & Deployment

### GitHub Actions Workflow

```yaml
# .github/workflows/ci.yml

quality → test → build

1. quality: Lint both workspaces
2. test: Run backend + frontend tests
3. build: Build client PWA, upload artifact
```

**Triggers:** Push or PR to `main` branch

**Node Version:** 20 (specified in workflow)

### Manual Deployment

**Backend:**
```bash
# Install dependencies
npm install --workspace server --production

# Set environment variables on hosting platform

# Start server
npm --workspace server run start
```

**Frontend:**
```bash
# Build production assets
npm run build

# Serve from client/dist/
# Use any static hosting (Netlify, Vercel, etc.)
```

**Recommended Platforms:**
- Backend: Render, Railway, Heroku
- Frontend: Netlify, Vercel, Cloudflare Pages
- Database: MongoDB Atlas
- Cache: Redis Cloud

### Health Checks

```bash
# Backend health
curl http://localhost:4000/api/health
# Expected: { "status": "ok" }

# Database connection
# Server logs will show "MongoDB connected"

# Redis connection
# Server logs will show "Redis connected" or "Using in-memory fallback"
```

---

## Useful Commands

### Development
```bash
# Install everything
npm install

# Run backend dev server (nodemon, port 4000)
npm run dev:server

# Run frontend dev server (vite, port 5173)
npm run dev:client

# Run all tests (backend + frontend)
npm test

# Lint all workspaces
npm run lint

# Build production PWA
npm run build
```

### Backend Specific
```bash
# Run backend tests
npm --workspace server run test

# Run unit tests only
npm --workspace server run test:unit

# Run integration tests only
npm --workspace server run test:integration

# Start production server
npm --workspace server run start

# Seed database
npm --workspace server run seed

# Run demo script
node server/src/utils/demoScript.js
```

### Frontend Specific
```bash
# Run frontend tests
npm --workspace client run test

# Build for production
npm --workspace client run build

# Preview production build
npm --workspace client run preview

# Run Vite dev server
npm --workspace client run dev
```

### Database Operations
```bash
# Connect to MongoDB (if running locally)
mongosh mongodb://localhost:27017/supportcarr

# List collections
show collections

# Query users
db.users.find({})

# Query rides
db.rides.find({}).sort({ createdAt: -1 })

# Clear all data
db.users.deleteMany({})
db.drivers.deleteMany({})
db.rides.deleteMany({})
```

---

## Best Practices for AI Assistants

### When Making Changes

1. **Always read files before editing** - Use the Read tool to understand context
2. **Run tests after changes** - Use `npm test` to verify nothing broke
3. **Follow existing patterns** - Match the style and structure of existing code
4. **Update tests** - Add/modify tests when changing functionality
5. **Check environment variables** - Ensure new features don't require undocumented env vars
6. **Update documentation** - Modify relevant docs/ files when adding features

### Code Quality Checklist

- [ ] Does code follow the service layer pattern?
- [ ] Are errors properly handled with try/catch → next(error)?
- [ ] Are new routes protected with authentication middleware?
- [ ] Are request bodies validated with Joi schemas?
- [ ] Are database operations properly awaited?
- [ ] Are tests written for new functionality?
- [ ] Is the code properly formatted (2-space indentation)?
- [ ] Are console.logs removed (use logger instead)?
- [ ] Are secrets kept out of version control?

### Common Pitfalls to Avoid

- **Don't** put business logic in controllers - use services
- **Don't** manually format error responses - use next(error)
- **Don't** forget to clean up event listeners in SSE handlers
- **Don't** hardcode environment-specific values
- **Don't** commit `.env` files (only `.env.example`)
- **Don't** use `var` - always use `const` or `let`
- **Don't** forget to populate references when needed (`.populate()`)
- **Don't** mix CommonJS and ES Modules in same file

### When Debugging

1. **Check logs** - Winston logs to console in development
2. **Verify environment** - Ensure `.env` variables are set
3. **Check database** - Use mongo shell to verify data state
4. **Test endpoints** - Use curl or Postman to isolate issues
5. **Review tests** - Existing tests show expected behavior
6. **Check CI** - GitHub Actions logs show test failures

---

## Additional Resources

- **Architecture:** `/docs/ARCHITECTURE.md`
- **API Reference:** `/docs/API.md`
- **OpenAPI Spec:** `/docs/openapi.yaml`
- **Setup Guide:** `/docs/README.md`
- **Roadmap:** `/ROADMAP.md`
- **Contributing:** `/CONTRIBUTING.md`
- **Project Research:** `/docs/ProjectResearchCompendium.md`

---

## Quick Reference

### Port Numbers
- Backend API: 4000
- Frontend Dev: 5173
- MongoDB: 27017
- Redis: 6379

### Default Credentials (After Seeding)
```
Rider:  rider@test.com / password123
Driver: driver@test.com / password123
Admin:  admin@test.com / password123
```

### Key Business Logic
- Flat rate pricing: $50 (5000 cents) for all rides
- Auto-assignment radius: 15 miles
- Payment: Manual capture (pre-auth on request, capture on completion)
- SSE heartbeat: 25 seconds
- JWT expiration: 1 day (configurable)
- Rate limit: 100 requests per 15 minutes

---

**Last Updated:** 2025-11-13
**Project Version:** 0.1.0
**Maintained by:** SupportCarr Team

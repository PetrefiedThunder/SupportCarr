# SupportCarr Environment Variables & Configuration Summary

## Overview
The SupportCarr application uses environment variables to configure external services, database connections, authentication, and deployment settings. Configuration is managed through `.env` files in both server and client directories.

---

## ENVIRONMENT VARIABLE FILES

### Server
- **Path:** `/home/user/SupportCarr/server/.env.example`
- **Purpose:** Contains all backend server configuration
- **Usage:** Copy to `server/.env` and fill in with real credentials

### Client
- **Path:** `/home/user/SupportCarr/client/.env.example`
- **Purpose:** Contains all frontend PWA configuration
- **Usage:** Copy to `client/.env` and fill in with real credentials

---

## COMPLETE LIST OF ENVIRONMENT VARIABLES

### SERVER ENVIRONMENT VARIABLES

#### Core Server Configuration
| Variable | Type | Default | Required | Purpose |
|----------|------|---------|----------|---------|
| `PORT` | Number | 4000 | Optional | HTTP server listening port |
| `NODE_ENV` | String | - | Optional | Environment mode (test/production) - affects Twilio signature verification |
| `CORS_ORIGIN` | String | - | **REQUIRED** | Frontend origin for CORS (e.g., http://localhost:5173) - throws error if not set |
| `LOG_LEVEL` | String | info | Optional | Logging level (debug/info/warn/error) |

#### Database Configuration
| Variable | Type | Default | Required | Purpose |
|----------|------|---------|----------|---------|
| `MONGODB_URI` | String | mongodb://localhost:27017/supportcarr | Optional | MongoDB connection string |
| `MONGO_URI` | String | mongodb://localhost:27017/supportcarr | Optional | Alternative MongoDB URI variable |

#### Cache/Geo Configuration
| Variable | Type | Default | Required | Purpose |
|----------|------|---------|----------|---------|
| `REDIS_URL` | String | redis://localhost:6379 | Optional | Redis connection URL for geospatial queries and driver matching |

#### Authentication
| Variable | Type | Default | Required | Purpose |
|----------|------|---------|----------|---------|
| `JWT_SECRET` | String | - | **REQUIRED** (in production) | Secret key for JWT token signing/verification; affects auth.js line 13 |
| `JWT_EXPIRATION` | String | 1d | Optional | JWT token expiration duration (1d, 24h, etc.) |

#### Payment Processing (Stripe)
| Variable | Type | Default | Required | Purpose |
|----------|------|---------|----------|---------|
| `STRIPE_SECRET_KEY` | String | - | Optional | Stripe secret API key (format: sk_test_* or sk_live_*) |
| | | | | Used in paymentService.js; required for payment creation/capture |

#### SMS Integration (Twilio)
| Variable | Type | Default | Required | Purpose |
|----------|------|---------|----------|---------|
| `TWILIO_ACCOUNT_SID` | String | - | Optional | Twilio Account SID (format: AC followed by 32 alphanumeric characters) |
| `TWILIO_AUTH_TOKEN` | String | - | Optional | Twilio Authentication Token for signature verification and SMS sending |
| `TWILIO_FROM_NUMBER` | String | - | Optional | Twilio phone number in E.164 format (e.g., +13105551234) |

#### Analytics Integration (Airtable)
| Variable | Type | Default | Required | Purpose |
|----------|------|---------|----------|---------|
| `AIRTABLE_API_KEY` | String | - | Optional | Airtable Personal Access Token (format: pat_*) |
| `AIRTABLE_BASE_ID` | String | - | Optional | Airtable Base ID (format: app*) for Santa Monica pilot |
| `AIRTABLE_RIDES_TABLE` | String | Rides | Optional | Airtable table name for storing ride events |
| `AIRTABLE_SMS_LOGS_TABLE` | String | SMS Logs | Optional | Airtable table name for storing SMS conversation logs |

#### Seeding & Demo Configuration
| Variable | Type | Default | Required | Purpose |
|----------|------|---------|----------|---------|
| `SEED_ADMIN_EMAIL` | String | admin@supportcarr.test | Optional | Demo admin email (seed.js) |
| `SEED_ADMIN_PASSWORD` | String | Admin1234! | Optional | Demo admin password (seed.js) |
| `SEED_DRIVER_PASSWORD` | String | Driver1234! | Optional | Demo driver password (seed.js) |

#### API & Script Configuration
| Variable | Type | Default | Required | Purpose |
|----------|------|---------|----------|---------|
| `API_BASE_URL` | String | http://localhost:4000/api | Optional | API base URL used in demo scripts |

---

### CLIENT ENVIRONMENT VARIABLES

| Variable | Type | Default | Required | Purpose |
|----------|------|---------|----------|---------|
| `VITE_API_URL` | String | http://localhost:4000/api | Optional | Backend API URL for frontend HTTP client |
| `VITE_MAPBOX_TOKEN` | String | - | Optional | Mapbox access token for address autocomplete/geocoding |
| `VITE_MAPBOX_ACCESS_TOKEN` | String | - | Optional | Alternative Mapbox token variable name |
| `VITE_MAPBOX_GEOCODING_URL` | String | https://api.mapbox.com/geocoding/v5/mapbox.places | Optional | Custom Mapbox geocoding endpoint |

---

## WHERE ENVIRONMENT VARIABLES ARE USED

### Backend Files

#### Configuration & Initialization
- **`/home/user/SupportCarr/server/server.js`** (line 9)
  - Reads: `PORT`, `NODE_ENV`, `JWT_SECRET`, `CORS_ORIGIN`
  - Initializes HTTP server and connects to databases

- **`/home/user/SupportCarr/server/src/app.js`** (line 17)
  - Reads: `CORS_ORIGIN` (throws error if not set - SECURITY CRITICAL)
  
#### Database & Cache
- **`/home/user/SupportCarr/server/src/config/database.js`** (line 10)
  - Reads: `MONGODB_URI`, `MONGO_URI` (fallback)
  - Establishes MongoDB connection

- **`/home/user/SupportCarr/server/src/config/redis.js`** (line 15)
  - Reads: `REDIS_URL`
  - Creates Redis client for geospatial queries

- **`/home/user/SupportCarr/server/src/config/logger.js`** (line 4)
  - Reads: `LOG_LEVEL`
  - Configures Winston logger

#### Authentication
- **`/home/user/SupportCarr/server/src/middlewares/auth.js`** (line 13)
  - Reads: `JWT_SECRET`
  - Verifies JWT tokens (SECURITY CRITICAL)

- **`/home/user/SupportCarr/server/src/services/authService.js`** (line 17)
  - Reads: `JWT_SECRET`
  - Signs new JWT tokens

#### Payment Processing
- **`/home/user/SupportCarr/server/src/services/paymentService.js`** (line 13)
  - Reads: `STRIPE_SECRET_KEY`
  - Creates Stripe API client

#### SMS Integration
- **`/home/user/SupportCarr/server/src/services/smsService.js`** (lines 14-15, 38)
  - Reads: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER`
  - Sends SMS via Twilio

- **`/home/user/SupportCarr/server/src/routes/twilioRoutes.js`** (lines 14, 24-25)
  - Reads: `TWILIO_AUTH_TOKEN`, `NODE_ENV`
  - Verifies inbound webhook signatures (SECURITY CRITICAL)

#### Analytics & Airtable
- **`/home/user/SupportCarr/server/src/services/analyticsService.js`** (lines 7-8, 21-22)
  - Reads: `AIRTABLE_API_KEY`, `AIRTABLE_BASE_ID`, `AIRTABLE_RIDES_TABLE`, `AIRTABLE_SMS_LOGS_TABLE`
  - Syncs ride data and SMS logs to Airtable

#### Testing & Seeding
- **`/home/user/SupportCarr/server/src/utils/seed.js`**
  - Reads: `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`, `SEED_DRIVER_PASSWORD`
  - Creates demo users and data

- **`/home/user/SupportCarr/server/src/utils/demoScript.js`** (line 4)
  - Reads: `API_BASE_URL`
  - Used for end-to-end workflow simulation

### Frontend Files

- **`/home/user/SupportCarr/client/src/api/httpClient.js`** (line 5)
  - Reads: `VITE_API_URL`, `process.env.VITE_API_URL`
  - Configures Axios HTTP client base URL

- **`/home/user/SupportCarr/client/src/api/geocoding.js`** (lines 11-12)
  - Reads: `VITE_MAPBOX_TOKEN`, `VITE_MAPBOX_ACCESS_TOKEN`, `VITE_MAPBOX_GEOCODING_URL`
  - Performs address autocomplete/geocoding

---

## CRITICAL SECURITY CONSIDERATIONS

### Required Environment Variables

1. **`CORS_ORIGIN`** (Server)
   - Status: **REQUIRED** - Application throws error at startup if not set
   - Security: Prevents Cross-Origin attacks
   - Example: `http://localhost:5173` (dev) or `https://yourdomain.com` (production)
   - File: `/home/user/SupportCarr/server/src/app.js:17-20`

2. **`JWT_SECRET`** (Server)
   - Status: **REQUIRED for production** - currently has validation in authService.js
   - Security: Used to sign/verify authentication tokens
   - File: `/home/user/SupportCarr/server/src/middlewares/auth.js:13`
   - Issue: Currently may have dev-secret fallback that needs hardening

3. **`TWILIO_AUTH_TOKEN`** (Server)
   - Status: Optional but critical for SMS functionality
   - Security: Verifies webhook signatures to prevent spoofed SMS data
   - File: `/home/user/SupportCarr/server/src/routes/twilioRoutes.js:14`
   - Note: Signature verification is bypassed if not set (dev-mode only)

### Sensitive Credentials

- `STRIPE_SECRET_KEY` - Never commit to version control
- `AIRTABLE_API_KEY` - Never commit to version control
- `TWILIO_AUTH_TOKEN` - Never commit to version control
- `TWILIO_ACCOUNT_SID` - Never commit to version control
- `JWT_SECRET` - Generate secure random value using:
  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```

---

## CONFIGURATION FILES FOR CREDENTIALS

### Schema Validation
- **`/home/user/SupportCarr/server/scripts/validate-airtable-config.js`**
  - Validates Airtable configuration
  - Displays expected schema
  - Run: `node server/scripts/validate-airtable-config.js`

### Airtable Tables Required

**Rides Table** (configurable via `AIRTABLE_RIDES_TABLE`)
- Ride ID (Single line text - primary key)
- Rider phone (E.164)
- Pickup address (normalized)
- Drop-off address (normalized)
- Ride status (Single select with specific options)
- WTP asked? (Checkbox)
- WTP response (Single select: YES/NO/No reply)
- WTP amount (USD) (Number)
- Dispatched at, Arrived pickup at, Completed at (Dates)
- Notes (Long text)

**SMS Logs Table** (configurable via `AIRTABLE_SMS_LOGS_TABLE`)
- SMS ID (Autonumber - primary key)
- Ride (Link to Rides)
- Direction (Single select: Inbound/Outbound)
- To/From (phone)
- Body (Long text)
- Template ID (Single select)
- Sent/received at (Date)
- Delivery status (Single select: Queued/Sent/Delivered/Failed)

---

## DOCUMENTATION REFERENCES

1. **PILOT_SETUP.md** - `/home/user/SupportCarr/docs/PILOT_SETUP.md`
   - Complete setup for Airtable credentials
   - Twilio account configuration
   - Environment variable configuration steps
   - Testing procedures

2. **README.md** - `/home/user/SupportCarr/README.md`
   - High-level overview
   - Feature descriptions
   - Quick start with env file setup

3. **docs/README.md** - `/home/user/SupportCarr/docs/README.md`
   - Prerequisites and setup
   - Running locally
   - Seeding demo data

---

## DEVELOPMENT vs PRODUCTION

### Development
- `CORS_ORIGIN=http://localhost:5173`
- `NODE_ENV=development`
- `MONGODB_URI=mongodb://localhost:27017/supportcarr`
- `REDIS_URL=redis://localhost:6379`
- Twilio/Stripe/Airtable: Optional (logs warn if not set)
- JWT_SECRET: Any string (but should be random)

### Production
- `CORS_ORIGIN=https://yourdomain.com`
- `NODE_ENV=production`
- `MONGODB_URI=<production-mongo-url>`
- `REDIS_URL=<production-redis-url>`
- All Twilio/Stripe/Airtable credentials: **REQUIRED**
- `JWT_SECRET`: Generated secure random string
- `STRIPE_SECRET_KEY`: sk_live_* (not test key)
- `TWILIO_AUTH_TOKEN`: Production credentials
- `AIRTABLE_API_KEY`: Production credentials

---

## SUMMARY TABLE

### Total Environment Variables: 28

**By Category:**
- Core Server: 4 variables
- Database: 2 variables
- Cache: 1 variable
- Authentication: 2 variables
- Payments: 1 variable
- SMS: 3 variables
- Analytics: 4 variables
- Seeding: 3 variables
- Scripts/API: 1 variable
- Frontend: 4 variables

**By Requirement Level:**
- Required (throws error): 1 (`CORS_ORIGIN`)
- Critical for features: 8 (Stripe, Twilio, Airtable)
- Optional with defaults: 19

**By Sensitivity:**
- Secrets: 6 (JWT_SECRET, STRIPE_SECRET_KEY, TWILIO_AUTH_TOKEN, TWILIO_ACCOUNT_SID, AIRTABLE_API_KEY, MAPBOX_TOKEN)
- Configuration: 22

---

## USAGE PATTERNS

### Optional Services (Graceful Degradation)
- **Twilio SMS**: Logs warning if not configured, SMS not sent
- **Stripe Payments**: Logs warning if not configured
- **Airtable Analytics**: Logs warning if not configured, analytics skipped
- **Mapbox Geocoding**: Throws error only when used (not at startup)
- **Redis**: Falls back to in-memory geo store if unavailable

### Fallback Mechanisms
- Database: Has `MONGO_URI` as fallback for `MONGODB_URI`
- Airtable Tables: Default to "Rides" and "SMS Logs" if not specified
- Log Level: Defaults to "info"
- Seed Passwords: Have hardcoded defaults
- API URLs: Have hardcoded localhost defaults


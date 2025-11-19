# SupportCarr - Required API Keys & Credentials Checklist

## Quick Setup Checklist for Mock API Keys

Use this checklist when setting up the application with mock or test credentials.

### Server Configuration (.env)

#### Authentication & Core (REQUIRED)
- [ ] `CORS_ORIGIN` - Frontend URL (e.g., `http://localhost:5173`)
- [ ] `JWT_SECRET` - Random string (generate with: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`)

#### Database & Cache (Optional, has localhost defaults)
- [ ] `MONGODB_URI` - MongoDB connection (default: `mongodb://localhost:27017/supportcarr`)
- [ ] `REDIS_URL` - Redis connection (default: `redis://localhost:6379`)

#### External Services (Optional but needed for full features)

**Stripe (Payment Processing)**
- [ ] `STRIPE_SECRET_KEY` - Test format: `sk_test_XXXXXXXXXXXXXXXX...`
  - Get from: https://dashboard.stripe.com/test/apikeys
  - For testing: Use any string starting with `sk_test_`

**Twilio (SMS)**
- [ ] `TWILIO_ACCOUNT_SID` - Format: `ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
  - Get from: https://console.twilio.com/
- [ ] `TWILIO_AUTH_TOKEN` - Long alphanumeric string
  - Get from: https://console.twilio.com/
- [ ] `TWILIO_FROM_NUMBER` - E.164 format: `+13105551234`
  - Get from: https://console.twilio.com/us1/develop/phone-numbers/manage/search

**Airtable (Analytics)**
- [ ] `AIRTABLE_API_KEY` - Format: `pat_XXXXXXXXXXXXX...`
  - Get from: https://airtable.com/account
  - Generate: Click "Generate token"
- [ ] `AIRTABLE_BASE_ID` - Format: `appXXXXXXXXXXXXXX...`
  - Get from: https://airtable.com/api after creating base
  - Also visible in Airtable URL

#### Server Settings (Optional)
- [ ] `PORT` - HTTP port (default: 4000)
- [ ] `NODE_ENV` - Environment (development/production/test)
- [ ] `LOG_LEVEL` - Logging level (debug/info/warn/error, default: info)
- [ ] `JWT_EXPIRATION` - Token expiration (default: 1d)

#### Seeding/Demo (Optional)
- [ ] `SEED_ADMIN_EMAIL` - Demo admin email
- [ ] `SEED_ADMIN_PASSWORD` - Demo admin password
- [ ] `SEED_DRIVER_PASSWORD` - Demo driver password
- [ ] `API_BASE_URL` - Used in demo scripts

### Client Configuration (.env)

- [ ] `VITE_API_URL` - Backend URL (default: `http://localhost:4000/api`)
- [ ] `VITE_MAPBOX_TOKEN` - Mapbox token for address autocomplete
  - Get from: https://account.mapbox.com/tokens

---

## Where to Get Each Credential

### 1. CORS_ORIGIN
**What is it?** Frontend URL for CORS configuration
**How to get:** 
- Development: `http://localhost:5173` (Vite default)
- Production: Your deployed frontend URL

### 2. JWT_SECRET
**What is it?** Secret key for signing JWT tokens
**How to get:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
**Example:** `a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6`

### 3. STRIPE_SECRET_KEY
**What is it?** API key for payment processing
**How to get:**
1. Go to https://dashboard.stripe.com/test/apikeys
2. Copy the "Secret key" (starts with `sk_test_`)
**Example:** `your_stripe_test_key_here`

### 4. TWILIO_ACCOUNT_SID
**What is it?** Twilio account identifier
**How to get:**
1. Go to https://console.twilio.com/
2. Dashboard shows "Account SID" (starts with `AC`)
**Example:** `ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

### 5. TWILIO_AUTH_TOKEN
**What is it?** Twilio authentication token
**How to get:**
1. Go to https://console.twilio.com/
2. Find "Auth Token" next to Account SID (click to reveal)
**Security:** Keep this secret!

### 6. TWILIO_FROM_NUMBER
**What is it?** Your Twilio phone number for sending SMS
**How to get:**
1. Go to https://console.twilio.com/us1/develop/phone-numbers/manage/incoming
2. Purchase a number or use existing
3. Copy in E.164 format: `+1XXXXXXXXXX`
**Example:** `+13105551234`

### 7. AIRTABLE_API_KEY
**What is it?** Personal access token for Airtable API
**How to get:**
1. Go to https://airtable.com/account
2. Scroll to "Personal access tokens"
3. Click "Generate token"
4. Name it "SupportCarr Server"
5. Add scopes: `data.records:read`, `data.records:write`
6. Copy token (starts with `pat_`)
**Security:** Keep this secret!

### 8. AIRTABLE_BASE_ID
**What is it?** ID of your Airtable base
**How to get:**
1. Go to https://airtable.com/api
2. Select your base
3. Base ID shown in documentation (starts with `app`)
4. Also visible in URL: `https://airtable.com/[BASE_ID]/...`
**Example:** `appXXXXXXXXXXXXXX`

### 9. VITE_MAPBOX_TOKEN
**What is it?** Mapbox API token for address autocomplete
**How to get:**
1. Go to https://account.mapbox.com/tokens/
2. Copy your default public token or create new
3. Must start with `pk_`
**Example:** `pk_eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycW1...`

---

## Mock Credentials for Local Testing

If you don't have real accounts yet, use these mock values for local development:

```bash
# .env file for local testing without external services

# Required
CORS_ORIGIN=http://localhost:5173
JWT_SECRET=dev-secret-key-change-in-production-1234567890abcdef

# Database (local services)
MONGODB_URI=mongodb://localhost:27017/supportcarr
REDIS_URL=redis://localhost:6379

# Mock External Services (optional - app logs warnings if not set)
STRIPE_SECRET_KEY=sk_test_mock123456789
TWILIO_ACCOUNT_SID=ACmock123456789012345678901234
TWILIO_AUTH_TOKEN=mock_auth_token_12345678901234567890
TWILIO_FROM_NUMBER=+15551234567
AIRTABLE_API_KEY=pat_mock123456789
AIRTABLE_BASE_ID=app_mock123456789

# Frontend
VITE_API_URL=http://localhost:4000/api
VITE_MAPBOX_TOKEN=pk_mock_test_token_123456789
```

---

## Security Best Practices

### DO's
- Use environment variables for all credentials
- Generate strong JWT_SECRET (32+ characters random)
- Use test API keys (`sk_test_*`) in development
- Use live API keys (`sk_live_*`) only in production
- Rotate credentials periodically
- Store `.env` in `.gitignore` (never commit)
- Use different credentials for dev/test/production

### DON'Ts
- Never hardcode credentials in code
- Never commit `.env` files to git
- Never use same credentials across environments
- Never share `.env` files in chat/email
- Never log sensitive credentials
- Never use demo/test keys in production

---

## Verification Steps

Once you've configured all credentials:

### 1. Check Server Startup
```bash
npm --workspace server run dev
```
Expected output:
- No "CORS_ORIGIN not set" error
- "Connected to MongoDB"
- "Connected to Redis" or "Failed to connect to Redis" (graceful fallback)
- "SupportCarr API listening on port 4000"

### 2. Verify Credentials are Being Used
```bash
# Check if JWT is working
curl http://localhost:4000/api/healthz
# Should return: {"status":"ok"}
```

### 3. Test Airtable Connection (optional)
```bash
node server/scripts/validate-airtable-config.js
```
Expected output: Configuration validation

### 4. Test Frontend Connection
```bash
npm --workspace client run dev
```
Expected output:
- Vite dev server running on http://localhost:5173
- Frontend loads without "API_URL" errors
- Can navigate pages

---

## Troubleshooting

### "CORS_ORIGIN environment variable is required"
- Set `CORS_ORIGIN=http://localhost:5173` in server/.env

### "Twilio not configured; SMS messages will not be sent"
- This is OK for development
- Set all three Twilio variables to enable SMS

### "Airtable analytics not configured"
- This is OK for development
- Set `AIRTABLE_API_KEY` and `AIRTABLE_BASE_ID` to enable

### "Stripe configuration missing"
- This is OK for development
- Set `STRIPE_SECRET_KEY` to enable payments

### "Mapbox access token is not configured"
- Set `VITE_MAPBOX_TOKEN` in client/.env to enable address autocomplete

---

## Example Complete .env Files

### Minimal Setup (Local Only)
```
CORS_ORIGIN=http://localhost:5173
JWT_SECRET=local-dev-secret-key-123456789abcdef
PORT=4000
MONGODB_URI=mongodb://localhost:27017/supportcarr
REDIS_URL=redis://localhost:6379
LOG_LEVEL=info
```

### Development Setup (With Test APIs)
```
CORS_ORIGIN=http://localhost:5173
JWT_SECRET=dev-secret-key-123456789abcdef
PORT=4000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/supportcarr
REDIS_URL=redis://localhost:6379
STRIPE_SECRET_KEY=sk_test_123456789
TWILIO_ACCOUNT_SID=AC123456789
TWILIO_AUTH_TOKEN=auth_token_test
TWILIO_FROM_NUMBER=+15551234567
AIRTABLE_API_KEY=pat_test123
AIRTABLE_BASE_ID=app_test123
VITE_API_URL=http://localhost:4000/api
VITE_MAPBOX_TOKEN=pk_test_123456789
```

### Production Setup (Real APIs)
```
CORS_ORIGIN=https://supportcarr.yourdomain.com
JWT_SECRET=<generated-secure-random-string>
PORT=4000
NODE_ENV=production
MONGODB_URI=<your-production-mongo-url>
REDIS_URL=<your-production-redis-url>
STRIPE_SECRET_KEY=sk_live_<your-real-key>
TWILIO_ACCOUNT_SID=AC<your-real-sid>
TWILIO_AUTH_TOKEN=<your-real-token>
TWILIO_FROM_NUMBER=+1<your-real-number>
AIRTABLE_API_KEY=pat_<your-real-key>
AIRTABLE_BASE_ID=app<your-real-id>
VITE_API_URL=https://api.yourdomain.com
VITE_MAPBOX_TOKEN=pk_<your-real-token>
```


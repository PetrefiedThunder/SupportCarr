# Mock Demo Setup Guide

This guide explains how to run SupportCarr in demo mode using mock API keys and placeholder credentials.

## Quick Start

Mock `.env` files have been created with placeholder values that allow you to run the application without real API credentials. The app gracefully handles missing or invalid credentials for optional services.

### 1. Environment Files Created

Both `.env` files have been created from the `.env.example` templates:

- `server/.env` - Backend configuration with mock credentials
- `client/.env` - Frontend configuration

### 2. What Works in Mock Mode

**Fully Functional:**
- User authentication (using mock JWT secret)
- Database operations (MongoDB local instance)
- Redis caching (if running locally)
- Core ride booking and management
- User management and roles

**Gracefully Degraded (with mock keys):**
- Payment processing - Will fail gracefully, allowing you to demo the UI/UX
- SMS notifications - Will log attempts but won't send actual SMS
- Airtable analytics - Will skip logging to Airtable
- Mapbox address autocomplete - Will fall back to manual address entry

## Mock Credentials Provided

### Server Configuration

```bash
# Critical (Working Mock Values)
PORT=4000
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173
JWT_SECRET=dev_mock_secret_key_change_in_production_12345

# Database (Requires local MongoDB)
MONGODB_URI=mongodb://localhost:27017/supportcarr
REDIS_URL=redis://localhost:6379

# Demo Seeding
SEED_ADMIN_EMAIL=admin@supportcarr.demo
SEED_ADMIN_PASSWORD=Demo123!Admin
SEED_DEMO_DATA=true

# External Services (Mock - Won't Actually Work)
STRIPE_SECRET_KEY=your_stripe_test_key_here
TWILIO_ACCOUNT_SID=AC00000000000000000000000000000000
TWILIO_AUTH_TOKEN=mock_auth_token_for_demo_00000000
TWILIO_FROM_NUMBER=+15555551234
AIRTABLE_API_KEY=patMockKeyForLocalDevelopment...
AIRTABLE_BASE_ID=appMockBaseId12345
```

### Client Configuration

```bash
VITE_API_URL=http://localhost:4000/api
VITE_MAPBOX_TOKEN=pk.eyJ1IjoibW9ja3VzZXIiLCJhIjoibW9ja3Rva2VuMTIzNDU2Nzg5MCJ9...
```

## Prerequisites for Mock Demo

1. **MongoDB** - Must be running locally on port 27017
   ```bash
   # Install MongoDB if needed
   # macOS: brew install mongodb-community
   # Ubuntu: sudo apt-get install mongodb

   # Start MongoDB
   mongod --dbpath /path/to/data/db
   ```

2. **Redis** (Optional) - For caching
   ```bash
   # Install Redis if needed
   # macOS: brew install redis
   # Ubuntu: sudo apt-get install redis

   # Start Redis
   redis-server
   ```

## Running the Demo

### 1. Install Dependencies

```bash
# Server
cd server
npm install

# Client
cd ../client
npm install
```

### 2. Start the Application

```bash
# Terminal 1 - Start MongoDB (if not running as service)
mongod

# Terminal 2 - Start backend server
cd server
npm run dev

# Terminal 3 - Start frontend client
cd client
npm run dev
```

### 3. Access the Application

- Frontend: http://localhost:5173
- Backend API: http://localhost:4000/api
- Demo Admin Login:
  - Email: `admin@supportcarr.demo`
  - Password: `Demo123!Admin`

## Demo Limitations

### Services That Won't Work (Expected Behavior)

1. **Stripe Payments**
   - Payment attempts will fail
   - Error messages will be logged
   - UI flow can still be demonstrated

2. **Twilio SMS**
   - SMS sending will fail silently
   - Check server logs to see mock SMS attempts
   - Phone verification won't actually send codes

3. **Airtable Analytics**
   - No data will be sent to Airtable
   - Application continues normally
   - Analytics features can be demonstrated in UI

4. **Mapbox Geocoding**
   - Address autocomplete won't work
   - Users must manually enter addresses
   - Rest of address handling works normally

## Upgrading to Real Credentials

To use real services instead of mocks, replace the mock values in `.env` files:

### 1. Stripe (Payments)
```bash
# Get test keys from: https://dashboard.stripe.com/test/apikeys
STRIPE_SECRET_KEY=sk_test_YOUR_REAL_TEST_KEY
```

### 2. Twilio (SMS)
```bash
# Get from: https://console.twilio.com/
TWILIO_ACCOUNT_SID=ACyour_real_account_sid
TWILIO_AUTH_TOKEN=your_real_auth_token
TWILIO_FROM_NUMBER=+1234567890  # Your verified Twilio number
```

### 3. Airtable (Analytics)
```bash
# Get API key from: https://airtable.com/create/tokens
AIRTABLE_API_KEY=patyour_real_personal_access_token
AIRTABLE_BASE_ID=appYourRealBaseId
```

### 4. Mapbox (Geocoding)
```bash
# Get from: https://account.mapbox.com/access-tokens/
VITE_MAPBOX_TOKEN=pk.your_real_public_token
```

## Security Notes

⚠️ **IMPORTANT:**

1. The mock JWT secret is for **demo purposes only**
2. Never commit real `.env` files to version control
3. Change all secrets before deploying to production
4. Use environment-specific secrets in production (not the mock values)
5. The `.env` files are gitignored by default

## Troubleshooting

### "CORS_ORIGIN is required"
- Make sure `CORS_ORIGIN=http://localhost:5173` is set in `server/.env`

### "JWT must be provided"
- Ensure `JWT_SECRET` is set in `server/.env`
- The mock value provided should work

### Database Connection Failed
- Verify MongoDB is running: `mongosh` or `mongo`
- Check the connection string in `MONGODB_URI`
- Default: `mongodb://localhost:27017/supportcarr`

### Frontend Can't Connect to Backend
- Verify backend is running on port 4000
- Check `VITE_API_URL=http://localhost:4000/api` in `client/.env`
- Restart the Vite dev server after changing `.env`

### Payment/SMS/Analytics Errors
- These are expected with mock credentials
- Check server logs to verify graceful degradation
- Services should fail without crashing the app

## Demo Features to Showcase

Even with mock credentials, you can demonstrate:

1. **User Authentication** - Registration, login, JWT tokens
2. **Ride Booking** - Create, view, update rides
3. **Role-based Access** - Admin, driver, customer roles
4. **Real-time Updates** - Ride status changes
5. **Map Interface** - Visual ride tracking (with manual addresses)
6. **Payment UI** - Payment flow interface (won't process)
7. **SMS UI** - Notification interface (won't send)
8. **Analytics Dashboard** - UI elements (won't persist to Airtable)

## Need Help?

For more detailed information about all environment variables, see:
- `ENV_VARIABLES_SUMMARY.md` - Complete reference of all 28 variables
- `API_KEYS_SETUP.md` - Detailed setup instructions for each service

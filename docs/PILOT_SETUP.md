# SupportCarr Santa Monica Pilot - Setup Guide

This guide walks you through setting up the complete pilot system from scratch, including Airtable, Twilio, and the backend integration.

## Table of Contents

1. [Airtable Setup](#airtable-setup)
2. [Twilio Setup](#twilio-setup)
3. [Environment Configuration](#environment-configuration)
4. [Testing the System](#testing-the-system)

---

## 1. Airtable Setup

### Step 1.1: Create the Base

1. Log in to [Airtable](https://airtable.com)
2. Create a new base named: **`SupportCarr Pilot – Santa Monica`**

### Step 1.2: Create the `Rides` Table

1. Rename the default table to `Rides`
2. Create the following fields (columns):

| Field Name | Field Type | Configuration |
|------------|------------|---------------|
| `Ride ID` | Single line text | Primary field |
| `Rider phone (E.164)` | Single line text | e.g., +13105551234 |
| `Pickup address (normalized)` | Single line text | |
| `Drop-off address (normalized)` | Single line text | |
| `Ride status` | Single select | Options: `New`, `Assigned`, `Driver en route`, `Driver arrived`, `In transit`, `Completed`, `Cancelled – Rider no-show`, `Cancelled – Safety`, `Rejected – Geofence` |
| `Dispatched at` | Date | Include time |
| `Arrived pickup at` | Date | Include time |
| `Completed at` | Date | Include time |
| `WTP asked?` | Checkbox | |
| `WTP response` | Single select | Options: `YES`, `NO`, `No reply` |
| `WTP amount (USD)` | Number | Decimal allowed |
| `Created at` | Created time | Auto-populated |
| `Notes` | Long text | Optional |

### Step 1.3: Create the `SMS Logs` Table

1. Click the "+" icon to add a new table
2. Name it `SMS Logs`
3. Create the following fields:

| Field Name | Field Type | Configuration |
|------------|------------|---------------|
| `SMS ID` | Autonumber | Primary field |
| `Ride` | Link to another record | Link to `Rides` table, allow linking to multiple records |
| `Direction` | Single select | Options: `Inbound`, `Outbound` |
| `To (phone)` | Single line text | |
| `From (phone)` | Single line text | |
| `Body` | Long text | |
| `Template ID` | Single select | Options: `R6_COMPLETE_WTP` (add more as needed) |
| `Sent/received at` | Date | Include time |
| `Delivery status` | Single select | Options: `Queued`, `Sent`, `Delivered`, `Failed` |

### Step 1.4: Get Your Airtable Credentials

1. Go to [Airtable Account](https://airtable.com/account)
2. Generate a Personal Access Token:
   - Click "Generate token"
   - Name it "SupportCarr Server"
   - Add scopes: `data.records:read`, `data.records:write`
   - Add access to your base
   - Copy the token (starts with `pat_`)
3. Get your Base ID:
   - Go to [Airtable API](https://airtable.com/api)
   - Select your base
   - The Base ID is shown in the URL and docs (starts with `app`)

---

## 2. Twilio Setup

### Step 2.1: Create Twilio Account

1. Sign up at [Twilio](https://www.twilio.com/try-twilio)
2. Verify your email and phone number

### Step 2.2: Get a Phone Number

1. Go to [Phone Numbers > Manage > Buy a number](https://console.twilio.com/us1/develop/phone-numbers/manage/search)
2. Search for a number in Santa Monica area (310 area code recommended)
3. Filter by capabilities: Check "SMS"
4. Purchase the number

### Step 2.3: Get Your Twilio Credentials

1. Go to [Twilio Console](https://console.twilio.com/)
2. Find your credentials in the dashboard:
   - **Account SID** (starts with `AC`)
   - **Auth Token** (click to reveal)
3. Note your purchased phone number in E.164 format (e.g., `+13105551234`)

### Step 2.4: Configure Inbound Webhook (After Server Deployment)

**NOTE**: This step must be done after deploying your server and exposing it to the internet.

1. Go to [Phone Numbers > Manage > Active numbers](https://console.twilio.com/us1/develop/phone-numbers/manage/incoming)
2. Click on your purchased number
3. Scroll to "Messaging Configuration"
4. Under "A MESSAGE COMES IN":
   - Select "Webhook"
   - Enter: `https://your-domain.com/api/twilio/inbound`
   - HTTP Method: `POST`
5. Save

**For local development** (using ngrok):
```bash
# Install ngrok
npm install -g ngrok

# Start your server
npm --workspace server run dev

# In another terminal, expose it
ngrok http 4000

# Use the ngrok URL in Twilio:
# https://abc123.ngrok.io/api/twilio/inbound
```

---

## 3. Environment Configuration

### Step 3.1: Create Environment File

Copy the example environment file:

```bash
cd server
cp .env.example .env
```

### Step 3.2: Configure Environment Variables

Edit `server/.env` with your credentials:

```env
# Server Configuration
PORT=4000

# Database
MONGODB_URI=mongodb://localhost:27017/supportcarr

# Redis
REDIS_URL=redis://localhost:6379

# Authentication
JWT_SECRET=your-secure-random-string-here
JWT_EXPIRATION=1d

# Payments (Stripe)
STRIPE_SECRET_KEY=sk_test_yourSecretKey

# Analytics (Airtable)
AIRTABLE_API_KEY=pat_yourAirtableTokenHere
AIRTABLE_BASE_ID=appYourBaseIdHere
AIRTABLE_RIDES_TABLE=Rides
AIRTABLE_SMS_LOGS_TABLE=SMS Logs

# SMS (Twilio)
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_FROM_NUMBER=+13105551234
```

### Step 3.3: Generate Secure JWT Secret

```bash
# Generate a secure random string
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy the output and use it as your `JWT_SECRET`.

---

## 4. Testing the System

### Step 4.1: Start the Server

```bash
# Make sure MongoDB and Redis are running
# Then start the server
npm --workspace server run dev
```

You should see:
```
Server running on http://localhost:4000
MongoDB connected successfully
Redis connected
```

### Step 4.2: Create a Test Ride

**Option A: Using the API directly**

```bash
# 1. Register a test user
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "rider@test.com",
    "password": "test123",
    "name": "Test Rider",
    "phoneNumber": "+1YOUR_ACTUAL_PHONE",
    "role": "rider"
  }'

# Save the token from the response

# 2. Create a test ride
curl -X POST http://localhost:4000/api/rides \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "pickup": {
      "lat": 34.0195,
      "lng": -118.4912,
      "address": "Santa Monica Pier, Santa Monica, CA"
    },
    "dropoff": {
      "lat": 34.0259,
      "lng": -118.7798,
      "address": "123 Main St, Santa Monica, CA 90401"
    },
    "bikeType": "bike"
  }'

# Save the ride ID from the response
```

**Option B: Manually create in MongoDB**

```javascript
// Using MongoDB shell or Compass
use supportcarr

// Create a user first
db.users.insertOne({
  email: "rider@test.com",
  name: "Test Rider",
  phoneNumber: "+1YOUR_ACTUAL_PHONE",
  role: "rider",
  createdAt: new Date(),
  updatedAt: new Date()
})

// Create a ride with that user's _id
db.rides.insertOne({
  rider: ObjectId("USER_ID_FROM_ABOVE"),
  pickup: {
    lat: 34.0195,
    lng: -118.4912,
    address: "Santa Monica Pier, Santa Monica, CA"
  },
  dropoff: {
    lat: 34.0259,
    lng: -118.7798,
    address: "123 Main St, Santa Monica, CA 90401"
  },
  status: "requested",
  bikeType: "bike",
  distanceMiles: 2,
  priceCents: 5000,
  createdAt: new Date(),
  updatedAt: new Date()
})
```

### Step 4.3: Complete the Ride (Triggers WTP SMS)

```bash
# Update ride status to completed
curl -X PATCH http://localhost:4000/api/rides/RIDE_ID_HERE \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "status": "completed"
  }'
```

**Expected Result:**
1. You receive an SMS: "SupportCarr: Your bike rescue is complete and the bike was dropped at 123 Main St, Santa Monica, CA 90401. This is a free pilot. If this service cost $25 in the future, would you pay for it? Reply YES or NO."
2. The SMS appears in your Airtable `SMS Logs` table
3. The ride in Airtable `Rides` table shows `WTP asked? = true`

### Step 4.4: Reply to the SMS

Reply to the SMS with one of:
- `YES`
- `NO`
- `25` (or any number)
- `$30` (dollar sign optional)

**Expected Result:**
1. Your reply appears in the `SMS Logs` table
2. The ride in the `Rides` table updates with:
   - `WTP response` = `YES` or `NO`
   - `WTP amount (USD)` = the number you sent (if applicable)

### Step 4.5: Verify in Airtable

1. Open your Airtable base
2. Check the `Rides` table:
   - Should have a row with your test ride
   - `WTP asked?` should be checked
   - `WTP response` should show your reply
   - If you sent a number, `WTP amount (USD)` should show it
3. Check the `SMS Logs` table:
   - Should have 2 rows: one Outbound (the question) and one Inbound (your reply)

---

## Troubleshooting

### SMS Not Sending

1. Check server logs for errors
2. Verify Twilio credentials are correct
3. Check that the phone number is in E.164 format
4. Ensure Twilio has sufficient balance

### SMS Not Received (Inbound)

1. Check that webhook URL is accessible from the internet
2. Test the webhook manually:
   ```bash
   curl -X POST http://localhost:4000/api/twilio/inbound \
     -d "From=%2B1YOUR_PHONE&To=%2B1TWILIO_NUMBER&Body=YES"
   ```
3. Check Twilio webhook logs in the console

### Airtable Not Updating

1. Check server logs for Airtable errors
2. Verify API token has correct scopes
3. Ensure table names match exactly (case-sensitive)
4. Check that field names match exactly

---

## Next Steps

Once the pilot is working:

1. **Collect Real Data**: Start taking real bike rescues
2. **Monitor**: Watch Airtable for WTP responses
3. **Iterate**: Add more SMS templates, geofencing, etc.
4. **Scale**: Consider Airtable Automations for dispatch workflow

---

## API Endpoints Reference

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/register` | POST | Register new user |
| `/api/auth/login` | POST | Login user |
| `/api/rides` | POST | Create new ride |
| `/api/rides/:id` | PATCH | Update ride status |
| `/api/twilio/inbound` | POST | Twilio webhook for inbound SMS |

---

## Security & Data Integrity

### Twilio Signature Verification

The system validates all inbound webhook requests using Twilio's `X-Twilio-Signature` header to prevent spoofed requests.

**How it works:**
- Every request to `/api/twilio/inbound` is verified against the signature
- If `TWILIO_AUTH_TOKEN` is not set, verification is skipped (dev mode only)
- Invalid signatures are logged and ignored (but return 200 to Twilio)

**Why this matters:**
- Prevents anyone from POSTing fake SMS data to corrupt WTP metrics
- Critical for data integrity when making pricing decisions
- Essential if you add driver SMS commands (ARRIVED, DROP, etc.)

### PII and Third-Party Storage

**Data being stored:**
- **Phone numbers** (E.164 format) in MongoDB, Twilio, and Airtable
- **Addresses** (pickup/dropoff) in MongoDB and Airtable
- **SMS message bodies** in Airtable SMS Logs

**Storage locations:**
- **MongoDB**: Your infrastructure (full control)
- **Twilio**: SMS logs stored in Twilio (US data centers by default)
- **Airtable**: SaaS storage (check current data residency in Airtable settings)

**Compliance considerations:**
1. **Data retention**: Plan to export and delete Airtable data after pilot ends
2. **Access control**: Limit Airtable base access to minimum necessary users
3. **Privacy notices**: Inform riders that phone numbers are stored for pilot measurement
4. **Geographic considerations**: Be aware of GDPR/CCPA if riders are in EU/CA

**Recommended practices:**
- Document what PII goes where in your internal docs
- Set a pilot end date and schedule data deletion
- Don't share the Airtable base link organization-wide
- Consider anonymizing phone numbers in logs after pilot (keep last 4 digits only)

### Airtable Data Linkage

**How rides are linked between MongoDB and Airtable:**

The `Ride ID` field in Airtable stores the MongoDB `_id` value. This allows:
- Finding Airtable records to update WTP responses
- Linking SMS Logs to the correct Ride record

**Critical requirements:**
1. Never manually edit the `Ride ID` field in Airtable
2. If you manually create test rides in Airtable, they won't link to MongoDB
3. SMS Logs are linked via the `Ride` link field (auto-populated by code)

**Data consistency:**
- MongoDB is the source of truth
- Airtable is a read-optimized view for pilot measurement
- If data conflicts, MongoDB wins

### Multi-Rider WTP Matching

**How inbound SMS replies are matched to rides:**

The system queries `Ride` records by `riderPhone` field to find the most recent ride where:
- `wtpAsked = true`
- `wtpResponse = null` (not yet answered)
- `riderPhone` matches the sender's phone number

**Why this matters:**
- If multiple riders have open WTP questions, each reply goes to the correct ride
- No cross-contamination between riders
- Most recent unanswered ride wins (important if a rider has multiple rescues)

**Test this scenario:**
```bash
# Run the multi-rider test
node server/scripts/test-multi-rider-wtp.js
```

This test verifies that when Rider A and Rider B both have open WTP questions:
- Rider A's reply updates Rider A's ride only
- Rider B's reply updates Rider B's ride only

---

## Support

For issues or questions:
1. Check server logs: `npm --workspace server run dev`
2. Check MongoDB: `mongo supportcarr` or MongoDB Compass
3. Check Airtable API logs in the Airtable dashboard
4. Check Twilio logs in the Twilio console

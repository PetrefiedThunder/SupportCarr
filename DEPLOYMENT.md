# SupportCarr Deployment Guide

## Bluehost VPS Deployment

This guide covers deploying SupportCarr to a Bluehost VPS using Docker.

### Prerequisites

- Bluehost VPS with SSH access
- Domain name pointed to your VPS IP
- Required API keys (Twilio, Stripe, Airtable)

### Step 1: Install Docker on VPS

SSH into your Bluehost VPS and run:

```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Install Docker Compose (if not included)
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Verify installation
docker --version
docker-compose --version
```

### Step 2: Clone Repository

```bash
git clone https://github.com/petrefiedthunder/supportcarr.git
cd supportcarr
```

### Step 3: Configure Environment Variables

Create a `.env` file with your production secrets:

```bash
nano .env
```

Copy the contents from `.env.example` and fill in your real values:

```env
# CRITICAL: Replace these with your actual secrets
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_PHONE_NUMBER=+1234567890
STRIPE_SECRET_KEY=sk_live_your-stripe-secret-key
STRIPE_WEBHOOK_SECRET=whsec_your-webhook-secret
AIRTABLE_API_KEY=your-airtable-api-key
AIRTABLE_BASE_ID=appXXXXXXXXXXXXXX
```

**Security Note:** Change the database password in `docker-compose.yml` from `secure_password` to a strong random password.

### Step 4: Build and Start Services

```bash
# Build and start all containers
docker-compose up -d --build

# Check logs
docker-compose logs -f app

# Verify all services are running
docker-compose ps
```

You should see:
- `app` - Running on port 80
- `db` - PostgreSQL with PostGIS
- `redis` - Redis cache

### Step 5: Run Database Migrations

```bash
# Run Knex migrations
docker-compose exec app npx knex migrate:latest --knexfile /app/server/knexfile.js

# Seed initial data
docker-compose exec app npm run seed --workspace=server
```

### Step 6: Verify Deployment

1. **Health Check:** Visit `http://your-vps-ip/api/healthz`
   - Should return: `{"status":"ok"}`

2. **Frontend:** Visit `http://your-vps-ip`
   - Should load the React PWA

3. **Database:** Check PostgreSQL is running:
   ```bash
   docker-compose exec db psql -U supportcarr -d supportcarr -c "\dt"
   ```

### Step 7: Configure Domain & SSL (Production)

#### Using Nginx Proxy Manager (Recommended)

```bash
# Install Nginx Proxy Manager
docker run -d \
  --name nginx-proxy-manager \
  -p 80:80 \
  -p 443:443 \
  -p 81:81 \
  jc21/nginx-proxy-manager:latest

# Access admin panel at http://your-vps-ip:81
# Default credentials: admin@example.com / changeme
```

1. Add a Proxy Host pointing `yourdomain.com` → `app:8080`
2. Enable "Force SSL" and "WebSocket Support"
3. Request Let's Encrypt certificate

Update `docker-compose.yml` to remove port 80 mapping since Nginx will handle it:

```yaml
app:
  ports:
    - "8080:8080"  # Only expose to localhost
```

### Common Operations

#### View Logs
```bash
docker-compose logs -f app     # Application logs
docker-compose logs -f db      # Database logs
docker-compose logs -f redis   # Redis logs
```

#### Restart Services
```bash
docker-compose restart app     # Restart app only
docker-compose restart         # Restart all services
```

#### Update Application
```bash
git pull origin main
docker-compose up -d --build app
```

#### Backup Database
```bash
docker-compose exec db pg_dump -U supportcarr supportcarr > backup_$(date +%Y%m%d).sql
```

#### Restore Database
```bash
cat backup_20241205.sql | docker-compose exec -T db psql -U supportcarr supportcarr
```

### Troubleshooting

#### App Won't Start
```bash
# Check logs
docker-compose logs app

# Common issues:
# 1. Missing environment variables - check .env file
# 2. Database not ready - wait 30s and restart: docker-compose restart app
```

#### Database Connection Errors
```bash
# Verify database is running
docker-compose ps db

# Check database logs
docker-compose logs db

# Test connection
docker-compose exec app npm run seed --workspace=server
```

#### "Driver not found" Errors
This means drivers haven't been seeded in PostgreSQL. Run:
```bash
docker-compose exec app npm run seed --workspace=server
```

### Production Checklist

- [ ] Changed default database password in `docker-compose.yml`
- [ ] Set strong `JWT_SECRET` in `.env`
- [ ] Configured all API keys (Twilio, Stripe, Airtable)
- [ ] Set up SSL certificate
- [ ] Configured domain DNS
- [ ] Ran migrations and seeds
- [ ] Tested health endpoint
- [ ] Configured backups (database + uploads)
- [ ] Set up monitoring/logging
- [ ] Configured Stripe webhooks endpoint

### Architecture

```
Internet
    ↓
Nginx Proxy Manager (ports 80/443)
    ↓
SupportCarr App (port 8080)
    ↓
├── PostgreSQL (PostGIS) - port 5432
└── Redis - port 6379
```

### Support

For issues, check:
1. Application logs: `docker-compose logs -f app`
2. Database status: `docker-compose ps db`
3. GitHub Issues: https://github.com/petrefiedthunder/supportcarr/issues

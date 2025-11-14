# SupportCarr Monorepo

SupportCarr delivers a production-ready full-stack platform for on-demand e-bike and bicycle rescue service. The project powers the Santa Monica pilot with advanced features including real-time tracking, automated SMS surveys, Airtable analytics, and Stripe payments. Built with Express + MongoDB backend, React + Vite PWA frontend, comprehensive testing, CI/CD automation, and complete production deployment infrastructure.

## 🎯 Project Status

- **Current Phase:** Santa Monica Pilot (Production-Ready)
- **Total PRs Merged:** 31 (see [PR Catalog](PR_LABELS.md))
- **Test Coverage:** Comprehensive unit and integration tests
- **CI/CD:** Automated linting, testing, and builds on every PR
- **Documentation:** Complete setup guides, API reference, and architecture docs

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

backend/    # Legacy backend structure (being migrated to server/)

services/   # Microservices architecture
            # - API gateway
            # - Payment service
            # - Analytics service

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
- **Ride Lifecycle Management** - Complete breakdown request to completion workflow
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
npm test                             # run backend + frontend tests
npm run lint                         # lint both workspaces
npm run build                        # build the PWA for production
npm --workspace server run seed      # seed MongoDB and Redis with demo data
node server/src/utils/demoScript.js  # simulate end-to-end breakdown workflow

# Santa Monica Pilot Testing
node server/scripts/test-wtp-flow.js +1YOUR_PHONE        # test WTP SMS with real phone
node server/scripts/test-multi-rider-wtp.js              # test multi-rider scenario
```

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
2. **Automatic SMS** - System sends WTP survey via Twilio: *"Would you pay $25 for this service?"*
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
- **Multiple Refactoring PRs** - Code quality and architecture improvements

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

### Backend
- **Runtime:** Node.js with Express
- **Database:** MongoDB with Mongoose ODM
- **Cache:** Redis for geospatial queries
- **Authentication:** JWT with refresh tokens
- **Payment:** Stripe API
- **SMS:** Twilio API
- **Analytics:** Airtable API

### Frontend
- **Framework:** React 18
- **Build Tool:** Vite
- **Styling:** Tailwind CSS
- **State Management:** React Context + Hooks
- **PWA:** Service Workers for offline capability

### DevOps & Testing
- **Testing:** Jest + React Testing Library + Supertest
- **CI/CD:** GitHub Actions
- **Linting:** ESLint
- **Package Management:** NPM Workspaces
- **Version Control:** Git + GitHub

---

## 📝 License

See [LICENSE](LICENSE) for details.

---

## 🙏 Acknowledgments

Built with modern web technologies and best practices. Special thanks to all contributors who have helped shape this project through 31+ pull requests.

**Project maintained by:** PetrefiedThunder
**Last Updated:** 2025-11-14

# SupportCarr MVP – Sprint-Mapped Engineering Task Schedule

## Sprint 1: Foundations & Core Infrastructure

### Backend
- Event schema definitions (Avro/JSON v1)
- API Gateway routes + validation middleware (stub endpoints)
- Authentication middleware (OAuth 2.0 PKCE, JWT validation) – scaffolding only
- Postgres/PostGIS shard-aware schema setup (`region_id` PKs)
- Redis cluster configuration for geospatial + streams

### Frontend
- Rider & Driver PWA skeleton projects (React + PWA manifest + routing)
- Admin console scaffold with secure login placeholder

### DevOps
- CI/CD pipeline skeleton (build, test stages)
- Terraform base modules for staging/prod
- Kubernetes cluster provisioning

### Security
- TLS termination setup at API Gateway
- Secrets management scaffolding (Vault/AWS Secrets Manager)

### Data
- Base BI schema in warehouse (BigQuery/Snowflake)
- Kinesis/PubSub pipeline skeleton

### QA
- Basic unit test harnesses for backend services

## Sprint 2: Ride Core & Matching

### Backend
- RideService state machine (REQUESTED → COMPLETED)
- Idempotent handlers for all state transitions
- MatchService with Redis geospatial indexing + nearest neighbor search
- Integration between RideService and MatchService via Redis Streams

### Frontend
- Rider request flow UI (pickup/drop-off form, map view placeholder)
- Driver availability toggle + location sharing UI

### DevOps
- Add staging namespace to Kubernetes cluster
- Deploy Redis + Postgres in staging

### Data
- Index tuning for geospatial queries
- Event ingestion from MatchService into BI pipeline

### QA
- Integration tests for ride request → match flow

## Sprint 3: Notifications & Pricing

### Backend
- NotifyService (WebSockets + FCM push)
- PriceService (dynamic pricing, fare estimates)
- Price caching logic

### Frontend
- Rider fare estimate display
- Driver incoming offer screen (accept/reject with real-time updates)

### DevOps
- WebSocket load balancer config
- Prometheus + Grafana observability stack deployed

### Security
- JWT validation + refresh token flow finalized

### QA
- WebSocket connection tests
- Price accuracy test cases

## Sprint 4: Payments & GeoService

### Backend
- PaymentService (Stripe integration: intent, capture, refund)
- Stripe webhook security + retry logic
- GeoService deployment (OSRM HA mode, multi-AZ)
- ETA calculation endpoints

### Frontend
- Rider payment flow integration (Stripe Elements)
- Driver navigation link integration

### DevOps
- Secrets injection for Stripe keys in CI/CD
- OSRM monitoring

### QA
- Payment flow integration tests
- Routing/ETA accuracy tests

## Sprint 5: Admin & Operational Tools

### Backend
- Admin console backend APIs (ride search, refund, manual adjustments)
- Incident reporting service

### Frontend
- Admin console dashboards (live ride tracking, incident resolution)
- Driver onboarding form UI

### DevOps
- Role-based access control (RBAC) in Admin console
- Logging stack (Loki/ELK) with correlation IDs

### Security
- Column-level encryption for PII in Postgres

### QA
- Admin console E2E tests
- Role-based access control tests

## Sprint 6: Data & Security Hardening

### Backend
- DLQ and replay mechanisms for event streams
- Retry policies + exponential backoff in services

### Data
- Nightly ETL jobs to BI warehouse
- BI dashboards for driver utilization, match time, churn

### Security
- mTLS between internal services
- Dependency and container image scanning in CI/CD

### QA
- Penetration testing setup
- Failover tests for DB, GeoService, Redis

## Sprint 7: QA, Load Testing & Bug Fixes

### QA
- Load testing with k6 at 150% projected peak
- WebSocket stress tests
- End-to-end happy-path and edge-case tests

### Backend
- Performance optimization for PostGIS queries
- Optimize OSRM routing performance

### Frontend
- UI/UX refinements per QA findings
- Offline state handling

### DevOps
- Canary deployment setup

## Sprint 8: Launch Readiness

### Backend
- Final performance tuning
- Feature flag audit (disable incomplete features)

### Frontend
- Polish, accessibility fixes, cross-browser testing

### DevOps
- Blue/green deployment for production
- Production secrets injection

### Security
- Final penetration test

### Ops
- Driver & rider beta program setup
- Incident management playbook finalization


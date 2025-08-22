# SupportCarr Task Breakdown

This document translates the project research compendium into actionable development tasks. Tasks are grouped by sprint targets.

## Sprint 1 – Foundation
- Draft OpenAPI specification v1 including error schemas and idempotency keys.
- Implement API Gateway with authentication, RBAC, rate limiting, and basic metrics.
- Build User Service for rider/driver CRUD and device token storage.
- Provision Geo Store with PostGIS and Redis Geo and seed initial zones.
- Deliver Match Service v0: distance-only matching, offer queue, TTL, single-shot offers.
- Establish observability scaffolding (logs, metrics, traces) and dashboards skeleton.
- Configure CI/CD pipeline for linting, testing, build, and staging deployment.

## Sprint 2 – Orchestration and Notifications
- Implement Ride Orchestrator state machine and event bus wiring.
- Upgrade Match Service to v1 with multi-criteria scoring, backoff radius, and fairness.
- Develop Notify Service with WebSocket hub, FCM integration, and message templates.
- Introduce basic Trust & Safety functionality: flags and audit trails.
- Create data migrations for Ride, Offer, and Assignment tables.
- Execute Load Test v0 for 100 concurrent users meeting P95 targets.

## Sprint 3 – PWAs and Payments
- Build Rider PWA v1: request flow, live ETA, receipts.
- Build Driver PWA v1: offers, accept, navigation hand-off, completion flow.
- Integrate Payment Service for tokenization, pre-authorization, capture, refunds, and payouts.
- Implement Pricing Service v0 with surge bounds and demand index prototype.
- Complete baseline accessibility pass (WCAG-AA).
- Add B2B Hooks v0 for account management and contracted-rate scaffolding.

## Sprint 4 – Testing and Launch Preparation
- Write E2E tests, perform chaos drills, and prepare rollback runbooks.
- Implement incident management tools and in-app playbooks for supervisors.
- Finalize compliance pack: insurance documents, safety training, and privacy policy.
- Produce launch toolkit including driver onboarding funnel, geo-targeted ads, and partnership kit.
- Configure post-launch telemetry with KPI dashboards and alerting policies.

## Backlog and Research
- Finalize insurance stack per city scenario (platform, driver, cargo).
- Conduct pricing tests for per-job elasticity, membership attachment, and B2B SLAs.
- Align NYC operations with local battery regulations for swap and storage.
- Investigate CA/NY street-legality and permit pathways for Kei-class microtrucks.
- Define scope and training standards for ADA-focused utility assistance.

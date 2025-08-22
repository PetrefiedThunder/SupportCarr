SupportCarr — Project Research Compendium (as of 2025‑08‑19)

Scope: Centralized reference of strategy, research, specs, and plans for SupportCarr (AAA for cyclists → AI‑native micromobility ops + utility‑vehicle marketplace extension). Echo Park / Silver Lake pilot; NYC expansion thesis; decentralized battery‑swap infrastructure.

⸻

0) One‑Page Executive Summary
•What: On‑demand roadside rescue for micro‑mobility, evolving into a distributed battery swap & utility‑vehicle service network. AI‑native dispatch, transparent public metrics, and compliance‑first operations.
•Where (MVP): Echo Park & Silver Lake, Los Angeles.
•Why now: Exploding e‑bike & LEV usage; safety, uptime, and compliant charging gaps; high willingness to pay for reliability; municipal interest in decarb & safety.
•How: Lightweight PWAs (rider/driver), geospatial matching, surge‑bounded dynamic pricing, modular ops playbooks, and open‑source leaning stack.
•KPIs (launch targets): 40 rides/day, ≤8 min avg wait, ≥85% match rate, ≥90% completion, P95 API ≤500 ms, 99.5% uptime.
•Business model: Per‑job fees + memberships (careful price psychology), B2B (delivery, fleets, property managers), and later: swap‑locker subscriptions.
•Edge/Moat: Neighborhood‑density ops, transparent impact dashboard (uptime, CO₂e avoided), compliance engine, and driver economics (target 75% revenue share) that create supply stickiness.

⸻

1) MVP Roadmap (Provided) — Condensed Strategic Blueprint

Objective: Field‑ready MVP in ≤64 days.

Team & Capacity
•Backend: 6 | Frontend: 4 | DevOps: 2 | Operations: 3
•Velocity: 45 pts/sprint target; 178 pts planned + 20 pt risk buffer (11.2%); 91% utilization.

Sprint Plan (4 sprints)
•S1–S2: Technical Foundation
•S3: Integration & PWAs (Rider + Driver, Payments)
•S4: Testing, Launch Prep, Compliance

Critical Path Components (w/ Story Points → Sprint Map)
•API Gateway (17) → S1
•Match Service (38) → S1–S2
•Ride Orchestrator (36) → S2
•Notify Service (20) → S2
•Payment Integration (11) → S3
•Rider PWA (20) → S3
•Driver PWA (16) → S3

Performance Targets
•Driver–Rider Matching: O(n log n), P95 < 200 ms, >90% match success (steady‑state)
•Dynamic Pricing: Base × [1.0…3.0], refresh ≤ 2 min under peak; bounded surge

Success Metrics (MVP)
•API P95 ≤ 500 ms • Uptime ≥ 99.5% • 100 concurrent users with no degradation • 40 rides/day
•Operational: ≥200 active drivers • Match ≥85% • Completion ≥90% • Wait ≤ 8 min • NPS ≥ 40

Investment & ROI (MVP)
•$583K total (Personnel $480K, Infra $15K, Ops $35K, Contingency $53K)
•Break‑even: 6,000 rides | Time to BE: 16–20 weeks | Year‑1 Rev: $2.4M | Expected ROI: 240%

⸻

2) Architecture & Systems

2.1 End‑to‑End Flow (E2E)
1.Rider PWA → POST /v1/rides
2.API Gateway → Ride Orchestrator
3.Orchestrator → validate, persist, emit ride.requested
4.Match Service → PostGIS + Redis Geo → assign → ride.matched
5.Notify Service → WebSocket + FCM push to Driver PWA
6.Driver PWA → Accept → POST /v1/rides/{id}/accept
7.Orchestrator → status ENROUTE → push ETA; lifecycle updates (arrived, assist, complete)
8.Payments → hold → capture on completion; receipts + notifications

2.2 Core Services & Interfaces
•API Gateway: AuthN/Z, rate‑limiting, routing, metrics.
•Ride Orchestrator: State machine (requested → matched → enroute → on‑scene → completed/canceled). Idempotency.
•Match Service: Geospatial nearest‑neighbor; queueing & fallback; supply weighting (experience, equipment, rating).
•Notify Service: WebSocket hub + FCM/APNs; templated messages.
•Pricing Service: Demand index + surge bounds; membership discounts; B2B rulesets.
•Payment Service: Tokenize, pre‑auth, capture/refund; dispute hooks.
•Identity & Trust: KYC/KYB (drivers), insurance documents, safety attestations.
•Observability: Traces, logs, metrics; SLOs; incident webhooks.

2.3 Recommended OSS Stack (lean, modular)
•API/Orchestrator: Node.js/TypeScript or Go; Express/Fastify/Fiber + OpenAPI.
•Data: Postgres + PostGIS; Redis (Geo + queues). Optional: Kafka/NATS for events.
•Realtime: WebSocket server; push via FCM.
•Infra: Terraform + Docker + k8s (or ECS); GitHub Actions CI; Feature flags.
•Monitoring: OpenTelemetry + Prometheus + Grafana; Sentry.
•PWAs: React + Vite; Service Workers; Workbox; FCM for push; Tailwind.

2.4 Data Model (high‑level)
•User (rider/driver), Vehicle (bike/e‑bike/utility), Ride (states, timestamps), Location (snapshots), PricingQuote, PaymentIntent, Notification, Document (insurance, IDs), Rating/CSAT.

⸻

3) Algorithms & Ops Logic

3.1 Matching
•Indexing: Redis Geo (primary), PostGIS (authoritative).
•Heuristics: Distance, ETA, equipment fit (tube kits, racks, battery capacity), acceptance rate, reliability score, time since last job.
•Constraints: Max search radius; backoff expansion; multi‑offer w/ TTL; fair distribution (anti‑starvation).
•Complexity: O(n log n) candidate pruning; SLA P95 < 200 ms end‑to‑end.

3.2 Dynamic Pricing
•Inputs: Supply/demand ratio, time/day, zones, weather, incident type, SLA pressure.
•Bounds: Base × [1.0, 3.0]; refresh ≤ 2 min during peaks; floor for essential rescues.
•Memberships/B2B: Contracted rates; surge dampening for partners.

3.3 Reliability & SLA Automation
•Auto‑reoffer if timeout; escalate radius; supervisor page if ETA breach risk.
•ETA calibration via historical traces; driver pacing models.

⸻

4) Product Surfaces (MVP)

4.1 Rider PWA
•Core: Create request; live ETA; driver profile; secure pay; chat/voice relay; receipt.
•Edge: Accessibility (WCAG‑AA), language toggle; membership upsell.

4.2 Driver PWA
•Core: Online/Offline; offers; navigation hand‑off; incident checklists; photos; completion; earnings.
•Compliance: Doc upload & renewals; background/KYC status.

4.3 Ops Console
•Dispatch: Map with live jobs; SLA heatmap; manual reassign; incident scripts.
•Trust & Safety: Alerts; driver/rider flags; ban/appeal workflow.
•Finance: Refunds; adjustments; disputes; payouts.

⸻

5) Operations Playbooks (Pilot)
•Coverage: Echo Park/Silver Lake geofences; peak rosters; on‑call supervisor.
•Equipment Standards: Patch kits, pumps, spare tubes (common sizes), straps, compact racks; PPE.
•Job Types: Flat repair assist, chain issues, dead‑battery tow, rider transport (optional), bike‑only recovery to safe location.
•SOPs: Arrival protocol; scene safety; photo evidence; customer comms; completion checklist; NPS prompt.
•Escalation: Severe incidents → local emergency services coordination.

⸻

6) Compliance & Risk
•Licensing/Classification: Platform is a marketplace; drivers are independent contractors; ensure TNC vs courier vs roadside assistance classification alignment per jurisdiction.
•Insurance: Platform liability; driver occupational accident; cargo/bike coverage; optional rider transport coverage.
•Battery Safety & Charging: Align with major city fire codes; certified charging/storage; training on lithium‑ion risks.
•Data Privacy: PCI DSS for payments; PII minimization; retention schedule.
•Accessibility & ADA: Inclusive service options (e.g., utility‑vehicle assist for disabled riders).
•Recordkeeping: Incident logs; audit trails; regulator‑friendly exports.

⸻

7) Decentralized Battery‑Swap Infrastructure (Phase 2+)
•Units: Weather‑sealed, OSHA/NEC‑compliant lockers; modular bays; sensor/telemetry; remote locks.
•Power: Solar primary; site‑specific wind/hydro where feasible; hybrid inputs for resilience.
•Siting: Rural & tourist corridors and urban hubs; fire‑safety & egress compliance.
•Ops: Courier‑delivered swaps (interim) → self‑service lockers; membership or PAYG.
•Data: Public uptime, swap counts, CO₂e avoided; API for civic dashboards.

⸻

8) Utility‑Vehicle Marketplace Extension (SupportCarr Utility)
•Use Cases: Last‑mile goods transport (lumber, dirt, appliances), bike recovery, kayak/boat moves, dump runs; rider not required to ride in vehicle.
•Supply: Fuel‑efficient pickups (e.g., Maverick) and vetted work‑ready vehicles; expectation‑setting for light labor.
•Compliance: Courier/haul classification; no hazardous materials; local hauling permits as needed; clear ToS.
•NYC Thesis: High demand due to low car ownership; focus on haul‑only jobs; curb management compliance.

⸻

9) Market & Competitive Positioning
•Differentiators: 95%+ completion potential (at scale), sub‑8 min matching, 75% driver share, neighborhood ops density, transparent civic metrics.
•Segments: Consumers (riders), delivery workers, fleets/food platforms, property managers, municipalities.
•Pricing Psychology: Keep membership optional; ensure per‑job price fairness; surge bounds; enterprise SLAs for B2B.

⸻

10) Impact & Transparency Portal
•Live Metrics: Rides, wait times, completion rate, driver earnings share, incidents resolved, gas‑vehicle miles avoided, CO₂e avoided.
•Methodology Cards: How KPIs & CO₂e are calculated; third‑party verification readiness.

⸻

11) Fundraising Strategy (Current State)
•Pre‑seed target: ~$400K to stand up pilot + early locker prototype.
•Series A framing (prior work): $1.2M draft with pre‑money ~$8M (historical artifact—revisit for alignment).
•Investor Types: Climate/infra, workforce enablement, civic tech, delivery ecosystem, neurodiverse founder cohorts.
•Use of Funds: Hiring ops leads, driver acquisition budget, infra & compliance, locker prototype, GTM experiments.
•Data Room Prep: MVP metrics, city compliance letters, safety training docs, reliability SLOs, locker safety tests.

⸻

12) Go‑To‑Market (Pilot → Scale)
•Supply Acquisition: Recruit in rider communities; pitch 75% revenue share; fast payouts; safety training included.
•Demand Acquisition: Geo‑targeted ads; partnerships (bike shops, cafes, campuses); B2B with delivery groups; SOS hotline stickers at racks.
•Retention: Membership perks (priority queue), referral credits, reliability guarantees.
•NYC Expansion: Align with local battery rules; focus courier partnerships; borough‑by‑borough density.

⸻

13) KPIs, SLOs, and Dashboards
•Core KPIs: Match %, Completion %, Wait time, CSAT/NPS, Driver online hrs, Acceptance %, Cancellations, Gross bookings (GBV), Take rate, Payout latency.
•Reliability SLOs: P95 API ≤ 500 ms; Offer TTLs; Reoffer latency ≤ 5 s.
•Ops Dash: SLA heatmap, driver coverage map, incident queue, churn watchlist.

⸻

14) Engineering Work Breakdown → Sprint Map

Sprint 1 — Foundation (API + Matching base)
•Contracts: OpenAPI spec v1; error schemas; idempotency keys
•API Gateway: Auth, RBAC, rate‑limit, metrics
•User Service: Rider/Driver CRUD; device tokens
•Geo Store: PostGIS base + Redis Geo bootstrap; seed zones
•Match v0: Distance‑only; offer queue; TTL + single‑shot offers
•Observability v0: Logs, metrics, traces; dashboards skeleton
•CI/CD: Lint, tests, build, deploy to staging

Sprint 2 — Orchestration + Notify
•Orchestrator: Ride state machine; event bus wiring
•Match v1: Multi‑criteria scoring; backoff radius; fairness
•Notify Service: WebSocket hub + FCM integration; templates
•Trust & Safety v0: Basic flags, audit trails
•Data Migrations: Ride/Offer/Assignment tables
•Load Test v0: 100 concurrent users; P95 targets

Sprint 3 — PWAs + Payments
•Rider PWA v1: Request flow, live ETA, receipts
•Driver PWA v1: Offers, accept, navigate, complete
•Payments: Tokenize, pre‑auth, capture, refunds, payouts
•Pricing v0: Surge bounds, demand index prototype
•Accessibility pass (WCAG‑AA baseline)
•B2B Hooks v0: Account & contracted‑rate scaffolding

Sprint 4 — Test, Launch, Compliance
•E2E tests; chaos drills; rollback runbook
•Incident Management: Playbooks in‑app; supervisor tools
•Compliance pack: Insurance docs, safety training, privacy policy
•Launch toolkit: Driver onboarding funnel, geo ads, partnership kit
•Post‑Launch Telemetry: KPI boards; alerting policies

⸻

15) Risk Register & Mitigations
•Supply shortage: Over‑recruit + guaranteed minimums during peak; heatmap scheduling.
•Battery safety incident: Certified training; storage compliance; insurer partnership; incident comms templates.
•Regulatory classification drift: Early counsel; clear ToS; city MoUs where possible.
•Payments fraud/chargebacks: Pre‑auth; photo evidence; dispute playbook.
•Unit economics sensitivity: Surge bounds + membership tuning; B2B floor volume.

⸻

16) SWOT Snapshot
•Strengths: Neighborhood focus; ops rigor; civic transparency; flexible infra.
•Weaknesses: Early supply density; regulatory variance by city; limited capital.
•Opportunities: Delivery partnerships; NYC haul‑only niche; grants for safety/charging.
•Threats: Larger platforms entering; adverse fire‑safety headlines; insurance pricing.

⸻

17) Hiring Plan (Pilot)
•Ops Lead (1) • Dispatcher/CS (2) • Field Supervisors (2 p/t) • Driver Growth (1) • Sr. Full‑Stack (1) • DevOps (0.5) • Compliance Analyst (0.5)

⸻

18) Open Questions / Research Backlog
•Finalize insurance stack per city scenario (platform + driver + cargo)
•Price tests: per‑job elasticity, membership attach, B2B SLAs
•NYC fire code alignment details for swap & storage
•Kei‑class microtrucks: CA/NY street‑legality and permit pathways
•ADA‑focused utility assist: scope & training standards

⸻

19) Appendices

A) Personas & Use Cases
•Maria (NYC courier): Mid‑shift dead battery → 15‑min swap beats 3‑hr charge.
•Homeowner: Needs 1 yd³ mulch delivered; haul‑only job; fixed‑window ETA.
•Commuter: Flat repair assist at dawn; safety first; quick tow for bike‑only.

B) Acceptance Criteria (Samples)
•Rider creates request → receives ETA ≤ 60 s → driver assigned ≤ 120 s → live location updates → completion → receipt.
•Driver offer → must accept within TTL (e.g., 20 s) → route link issued → arrival confirmation.

C) API (Sample)
•POST /v1/rides → returns ride_id, quote, ETA
•POST /v1/rides/{id}/accept → driver claim
•GET /v1/rides/{id} → status stream

D) Telemetry (Fields)
•Offer latency, accept latency, arrival delta vs ETA, on‑scene duration, completion delta; payout latency; CSAT.

E) Launch Checklist (Pilot)
•Driver roster ≥ 60 for target hours
•Insurance & training signed
•PWA smoke tests on iOS/Android + low‑end Android
•Partnerships: 5+ bike shops, 3+ campuses/cowork hubs
•KPI dashboards & alerting live

⸻

Owner: Christopher L. Sellers (Founder)
Last updated: 2025‑08‑19
Next actions: Prioritize Open Questions; lock Sprint‑1 issue list; start driver recruiting funnel.

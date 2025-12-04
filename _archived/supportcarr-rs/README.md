# SupportCarr Rust Workspace

This workspace is the Rust migration target for the SupportCarr services. It mirrors the
existing Node.js behavior while providing typed interfaces and tested FSM logic.

## Crates

- `supportcarr-core`: Domain types, ride finite-state machine, pilot-distance helper, and
  dispatch traits shared across the workspace.
- `supportcarr-dispatch-redis`: Redis-backed dispatch engine that stores pilot GEO points
  and availability using the same semantics as the current `dispatchService.js`.
- `supportcarr-api`: Axum-powered API surface for creating rides and querying ride status.
  It wires in the Redis dispatch engine and applies FSM assignment events. Persistence is
  defined via traits so Mongo/SQL backends can plug in later.
- `supportcarr-twilio`: Twilio helper crate with signature verification and an inbound SMS
  handler that updates ride status via FSM events (complete/cancel) using a pluggable ride
  store.

## Running tests

From the `supportcarr-rs/` directory, run:

```bash
cargo test
```

Redis integration tests in `supportcarr-dispatch-redis` require a running Redis instance
and the `REDIS_URL` environment variable. Enable them with:

```bash
cargo test -p supportcarr-dispatch-redis --features redis-tests
```

## Migration notes

- The ride FSM matches `server/src/services/rideService.js`, including allowed transitions
  and the 10-mile pilot constraint enforced via the Haversine distance helper.
- Dispatch mirrors the Redis GEO usage in the JS services, using configurable key prefixes
  to co-exist with existing data.
- Twilio webhook handling returns Twilio-friendly plain-text responses and performs the
  same signature verification flow used by the Node implementation.

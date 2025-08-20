# SupportCarr

SupportCarr is a Node.js-based ride-hailing platform API that enables riders to request trips and track ride lifecycles. The project serves as a reference implementation for core ride-hailing features.

## Objectives

- Expose a clean REST interface for creating and retrieving rides.
- Provide health check and monitoring endpoints.
- Lay the foundation for future enhancements such as driver matching, pricing, and notifications.

## Installation Requirements

- Node.js 18+
- npm

## Quick Start

1. Install dependencies: `npm install`
2. Start the server: `npm start`
3. (Optional) Run tests: `npm test`
4. (Optional) Lint code: `npm run lint`

## Continuous Integration

This project uses a GitHub Actions workflow located at `.github/workflows/ci.yml`.
The workflow runs linting and unit tests on every push and pull request targeting the `main` branch.

## API Endpoints

### GET /api/health
Checks service status.

**Sample Response**
```json
{"status":"ok"}
```

### POST /api/rides
Creates a new ride request.

**Sample Request**
```json
{
  "rider_id": "abc123",
  "pickup": {"lat": 37.77, "lng": -122.41},
  "dropoff": {"lat": 37.79, "lng": -122.42}
}
```

**Sample Response**
```json
{
  "ride_id": "ride123",
  "status": "REQUESTED"
}
```

### GET /api/rides/{ride_id}
Retrieves details for a specific ride.

**Sample Response**
```json
{
  "ride_id": "ride123",
  "rider_id": "abc123",
  "status": "REQUESTED",
  "pickup": {"lat": 37.77, "lng": -122.41},
  "dropoff": {"lat": 37.79, "lng": -122.42}
}
```

## Configuration

Environment variables configure the service:

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Port for HTTP server | `3000` |
| `DATABASE_URL` | Postgres connection string | – |
| `REDIS_URL` | Redis connection string | – |
| `JWT_SECRET` | Secret for signing JWT tokens | – |

## Contribution Guidelines

Contributions are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct and the process for proposing changes.

## Roadmap

For long-term planning and upcoming features, see [ROADMAP.md](ROADMAP.md).

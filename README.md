# SupportCarr

SupportCarr is a ride-hailing platform API.

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

## Development Workflow

1. Install dependencies: `npm install`
2. Run tests: `npm test`
3. Lint code: `npm run lint`

## Continuous Integration

The repository uses a GitHub Actions workflow at `.github/workflows/ci.yml` to run linting and tests on pushes and pull requests to `main`.


## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on proposing changes.

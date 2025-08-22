# API Gateway

Express-based gateway exposing a `/v1/rides` endpoint for ride requests with payload validation and structured error handling. This service will expand to handle authentication, rate limiting, and routing to downstream components.

## Development

```bash
npm install
npm start
```

## Testing

```bash
npm test
```

## Endpoint

### `POST /v1/rides`

#### Request Body

```json
{
  "riderId": "string",
  "pickup": { "lat": 34.05, "lng": -118.25 }
}
```

#### Responses

- `201 Created` – `{ "ride_id": "uuid", "rider_id": "string" }`
- `400 Bad Request` – `{ "error": "validation message" }`

# API Reference

The canonical OpenAPI specification lives at `server/openapi.yaml`. Run `npm --workspace server run openapi` to copy the file
into `docs/openapi.yaml` for distribution.

Key endpoints:

| Method | Path | Description |
| ------ | ---- | ----------- |
| GET | `/api/health` | Service health check |
| POST | `/api/auth/register` | Register riders and drivers |
| POST | `/api/auth/login` | Authenticate and receive JWTs |
| POST | `/api/rides` | Create ride requests |
| PATCH | `/api/rides/{rideId}` | Update ride lifecycle |
| POST | `/api/drivers` | Create or update driver profile |
| PATCH | `/api/drivers/{driverId}` | Update availability + geolocation |

Refer to the spec for request/response examples, authentication scopes, and schema definitions.

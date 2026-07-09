# App Auth API — `/api/app-auth`

## Endpoints
- `POST /api/app-auth/token`
  - body: `{ clientId, clientSecret }`
  - response: `{ tokenId, expiresAt, applicationId }`

- `POST /api/app-auth/legacy-login`
  - body: `{ clientId, clientSecret, userEmail, password, includePermissions }`

- `POST /api/app-auth/validate-token`
  - body: `{ token, clientId }`

- `GET /api/app-auth/stats/{clientId}`
  - requiere token

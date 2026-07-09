# Users API — `/api/users`

## Endpoints
- `GET /api/users`
  - query: `page=1`, `size=100`

- `GET /api/users/paged`
  - query: `page`, `pageSize`, `search`, `sortBy`, `sortDirection`

- `GET /api/users/{id}`

- `POST /api/users`
  - body: `{ email, displayName, userType: "Local" }`

- `PUT /api/users/{id}`
  - body: `{ displayName, isActive, azureObjectId, userType }`

- `DELETE /api/users/{id}`

- `GET /api/users/{userId}/permissions`
  - response: `{ roles[], permissions[], menuItems[] }`

## Notas
- retorna `PagedResult<User>` en listados
- revisar también `docs/guides/PAGINATION.md`

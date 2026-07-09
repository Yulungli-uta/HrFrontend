# Roles y Permissions API

## Roles — `/api/roles`
- `GET /api/roles`
- `GET /api/roles/paged`
  - query: `page`, `pageSize`, `search`, `sortBy`, `sortDirection`
- `GET /api/roles/{id}`
- `POST /api/roles`
  - body: `{ name, description, priority: 100 }`
- `PUT /api/roles/{id}`
  - body: `{ description, isActive, priority }`
- `DELETE /api/roles/{id}`

## Permissions — `/api/permissions`
- CRUD estándar
- create dto: `{ name, module, action: "Read", description, version: 1 }`

## User Roles — `/api/user-roles`
- `GET /api/user-roles`
- `GET /api/user-roles/{userId}/{roleId}/{assignedAt}`
- `POST /api/user-roles`
  - body: `{ userId, roleId, expiresAt, assignedBy, reason }`
- `PUT /api/user-roles`
- `DELETE /api/user-roles/{userId}/{roleId}/{assignedAt}`

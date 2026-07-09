# Local AD API — `/api/local-ad`

## Regla general
- `POST /authenticate` es público
- el resto requiere rol `Administrador`

## Usuarios
- `POST /authenticate`
  - body: `{ username, password }`

- `GET /users`
  - query: `page=1`, `pageSize=50`, `filter`

- `GET /users/{id}`
- `GET /users/by-email/{email}`
- `POST /users`
- `PUT /users/{id}`
- `POST /users/{id}/enable`
- `POST /users/{id}/disable`
- `DELETE /users/{id}`

## Grupos
- `GET /groups`
- `GET /groups/{id}`
- `POST /groups/{groupId}/members/{userId}`
- `DELETE /groups/{groupId}/members/{userId}`
- `GET /groups/{groupId}/members`
- `GET /users/{userId}/groups`
- `GET /users/{userId}/groups/{groupId}`

## Notas
- LDAP no expone conteo total nativo confiable
- revisar `docs/guides/PAGINATION.md`

## DTOs clave
- `LocalAdAuthRequest`
- `LocalAdAuthResponse`
- `CreateLocalAdUserRequest`
- `UpdateLocalAdUserRequest`
- `LocalAdUserResponse`
- `LocalAdGroupResponse`

## Servicio frontend relacionado
- `LocalAdManagementAPI` en `client/src/lib/api/services/auth.ts`

# Azure Management API — `/api/azure-management`

## Usuarios Azure
- `POST /users`
- `GET /users`
  - query: `page`, `pageSize`, `filter`
- `GET /users/{id}`
- `GET /users/by-email/{email}`
- `PUT /users/{id}`
- `DELETE /users/{id}`
  - query: `permanent=false`
- `POST /users/{id}/enable`
- `POST /users/{id}/disable`
- `POST /users/{id}/reset-password`
  - query: `forceChange=true`
- `POST /users/bulk-create`
- `POST /sync/user/{id}`

## Grupos Azure
- CRUD en `/groups`
- `POST /groups/{groupId}/members/{userId}`
- `DELETE /groups/{groupId}/members/{userId}`
- `GET /groups/{groupId}/members`
- `POST /groups/{groupId}/members/bulk-add`
- `GET /users/{id}/azure-groups`

## Roles de directorio
- `GET /azure-roles`
- `GET /users/{id}/azure-roles`
- `POST /users/{userId}/azure-roles/{roleId}`
- `DELETE /users/{userId}/azure-roles/{roleId}`
- `GET /azure-roles/{roleId}/members`

## Contraseñas
- `POST /validate-password`
- `GET /generate-password`

## DTO útil
`CreateAzureUserDto`:
`{ email, displayName, givenName, surname, password, forceChangePasswordNextSignIn, jobTitle, department, accountEnabled }`

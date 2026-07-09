# Paginación — Estándar `PagedResult<T>`

## Regla general
Todos los endpoints `GET /api/{recurso}` retornan `PagedResult<T>` dentro de la respuesta estándar.

## Query params universales
- `page`: default `1`
- `pageSize`: default `20`
- límite backend: `1-200`

## Forma esperada
```json
{
  "success": true,
  "data": {
    "items": [],
    "page": 1,
    "pageSize": 20,
    "totalCount": 150,
    "totalPages": 8,
    "hasPreviousPage": false,
    "hasNextPage": true
  }
}
```

## Notas
- `totalPages`, `hasPreviousPage` y `hasNextPage` son calculados por backend
- `/api/users/paged` y `/api/roles/paged` soportan `search`, `sortBy`, `sortDirection`

## Caso especial LDAP
En `GET /api/local-ad/users` y `GET /api/local-ad/groups`:
- `totalCount` refleja solo la página actual
- `hasNextPage` y `totalPages` no son confiables
- paginar hasta recibir `items` vacío

## Frontend
- `PagedResult<T>` y `PagedRequest` → `client/src/lib/api/core/pagination.ts`
- `list(page, pageSize)` retorna `PagedResult<T>`
- `listPaged(params)` usa `/paged`

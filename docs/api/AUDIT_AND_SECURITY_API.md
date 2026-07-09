# Audit y Security APIs

## Controladores disponibles
- `/api/sessions`
- `/api/audit-log`
- `/api/login-history`
- `/api/user-activity`
- `/api/failed-logins`
- `/api/azure-sync-log`
- `/api/role-change-history`
- `/api/permission-change-history`
- `/api/security-tokens`
- `/api/app-params`
- `/api/user-employees`
- `/api/role-menu-items`

## Patrón común
Todos exponen:
- `GET /`
- `GET /{id}`
- `POST /`
- `PUT /{id}`

## Query común de listado
- `page=1`
- `size=100`

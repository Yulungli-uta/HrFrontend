# API Index

## Base
- Base URL: `http://localhost:5010/api`
- Variable: `VITE_AUTH_API_URL`
- Respuesta estándar: `{ success, data, message, errors, timestamp }`
- Auth: `Authorization: Bearer <token>` en endpoints protegidos

## Archivos por dominio
- `AUTH_API.md`
- `APP_AUTH_API.md`
- `USERS_API.md`
- `ROLES_PERMISSIONS_API.md`
- `MENU_API.md`
- `AZURE_MANAGEMENT_API.md`
- `LOCAL_AD_API.md`
- `AUDIT_AND_SECURITY_API.md`

## Uso recomendado
- Si la tarea es login/token → `AUTH_API.md` o `APP_AUTH_API.md`
- Si la tarea es usuarios/roles/permisos → `USERS_API.md` o `ROLES_PERMISSIONS_API.md`
- Si la tarea es menú → `MENU_API.md`
- Si la tarea es Azure → `AZURE_MANAGEMENT_API.md`
- Si la tarea es LDAP/AD local → `LOCAL_AD_API.md`
- Si la tarea es auditoría/tokens/historial → `AUDIT_AND_SECURITY_API.md`

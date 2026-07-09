# Paquete optimizado para Claude — versión granular

Este paquete separa el contexto estable y la API por dominios pequeños para reducir consumo de tokens.

## Estructura
- `.claude/CLAUDE.md` → contexto mínimo
- `.claude/ARCHITECTURE_MAP.md` → mapa de arquitectura
- `docs/guides/PAGINATION.md` → paginación
- `docs/guides/TOKEN_STRATEGY.md` → estrategia de ahorro
- `docs/api/INDEX.md` → índice
- `docs/api/*.md` → API por dominio

## Uso recomendado
1. Reemplaza tu `CLAUDE.md` principal por `.claude/CLAUDE.md`
2. Conserva el resto como referencia separada
3. Cuando la tarea sea específica, indica a Claude el archivo exacto:
   - login/token → `docs/api/AUTH_API.md`
   - usuarios → `docs/api/USERS_API.md`
   - roles/permisos → `docs/api/ROLES_PERMISSIONS_API.md`
   - Azure → `docs/api/AZURE_MANAGEMENT_API.md`
   - LDAP → `docs/api/LOCAL_AD_API.md`

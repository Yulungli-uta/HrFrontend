# Estrategia para ahorro de tokens

## Objetivo
Mantener `.claude/CLAUDE.md` pequeño y estable.

## Reparto recomendado
- `.claude/CLAUDE.md` → reglas del proyecto
- `.claude/ARCHITECTURE_MAP.md` → arquitectura y flujo
- `docs/guides/PAGINATION.md` → paginación
- `docs/api/*.md` → API separada por dominio

## Qué sí va en `CLAUDE.md`
- stack
- estructura
- reglas críticas
- restricciones
- convenciones
- ubicaciones clave

## Qué no va en `CLAUDE.md`
- tablas largas de endpoints
- DTOs extensos
- ejemplos JSON grandes
- detalles raros de Azure o LDAP
- documentación que solo aplica a tareas específicas

## Regla práctica
Si una sección no ayuda en la mayoría de tareas de frontend, muévela fuera de `CLAUDE.md`.

## Máxima reducción
Cuando una tarea sea sobre un dominio concreto, indicar a Claude que consulte solo ese archivo de `docs/api/`.

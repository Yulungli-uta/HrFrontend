# Menu API

## Menu — `/api/menu`
- `GET /api/menu/user`
  - devuelve menú del usuario autenticado según roles
  - response: `[{ menuItemId, menuItemName, url, icon, parentId, order, isVisible }]`

## Menu Items — `/api/menu-items`
- CRUD estándar
- create dto: `{ parentId, name, url, icon, order, moduleName, isVisible }`

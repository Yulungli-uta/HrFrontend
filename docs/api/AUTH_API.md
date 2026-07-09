# Auth API — `/api/auth`

## Endpoints
- `POST /api/auth/login`
  - body: `{ email, password }`
  - response: `{ accessToken, refreshToken }`

- `POST /api/auth/refresh`
  - body: `{ refreshToken }`
  - response: `{ accessToken, refreshToken }`

- `GET /api/auth/azure/url`
  - query: `clientId`, `browserId`

- `GET /api/auth/azure/callback`
  - uso interno
  - responde HTML

- `GET /api/auth/me`
  - requiere token

- `POST /api/auth/validate-token`
  - body: `{ token, clientId }`
  - response: `{ isValid, tokenType, expiresAt, userId, ... }`

- `POST /api/auth/change-password`
  - requiere token
  - body: `{ currentPassword, newPassword }`

- `POST /api/auth/request-password-change-2fa`
  - requiere token
  - paso 1 OTP

- `POST /api/auth/change-password-2fa`
  - requiere token
  - body: `{ currentPassword, newPassword, otpCode }`

## Reglas de contraseña
- mínimo 8 caracteres
- una mayúscula
- un número
- distinta a la actual

## Nota
- `otpCodeDev` solo se devuelve en Development

# MusicShare — Contrato REST Frontend ↔ Backend Serverless (Python 3.12 + Floci/AWS)

Este documento define el contrato HTTP exacto que consume el frontend (`src/services/apiAdapter.ts`) cuando `VITE_USE_MOCKS=false`.

---

## 1. Variables de Entorno del Frontend

```env
VITE_USE_MOCKS=false
VITE_API_BASE_URL=http://localhost:4566
VITE_S3_IMAGES_BASE_URL=http://localhost:4566/imginstrumentos
```

- En S3 (`Front-React`), el frontend se compila con `base: './'` y usa **`HashRouter`** (`#/`, `#/instruments/:id`, `#/loans`, `#/alerts`), por lo que no requiere reglas de rewrite en S3.

---

## 2. Headers de Sesión y Mockup de Autenticación (MVP)

Cuando existe sesión activa, `httpClient.ts` adjunta el token de sesión (si el backend lo emitió) junto con los headers mockup del usuario activo:

| Header | Ejemplo | Notas |
|---|---|---|
| `Authorization` | `Bearer eyJ...` | Enviado cuando `login`/`register` retorna `token` |
| `X-User-Id` | `usr-musician-1` | ID del usuario activo |
| `X-User-Role` | `musician` \| `owner` \| `admin` | Rol del usuario activo |
| `X-User-Name` | `Mateo%20R%C3%ADos` | URI-encoded (`decodeURIComponent` en Python) |
| `X-User-Email` | `mateo.rios@musicshare.org` | Correo para notificaciones SNS |

---

## 3. CORS Requerido (API Gateway + Bucket S3 `imginstrumentos`)

Configurar en API Gateway / FastAPI (`CORSMiddleware`) y en la política CORS del bucket S3 `imginstrumentos`:

- **Allow-Origins:** `*` (o el origen exacto del bucket `Front-React` y `http://localhost:5173`)
- **Allow-Methods:** `GET, POST, PUT, PATCH, DELETE, OPTIONS`
- **Allow-Headers:** `Content-Type, Authorization, X-User-Id, X-User-Role, X-User-Name, X-User-Email`

---

## 4. Modelos JSON

### `User`
```json
{
  "id": "usr-musician-1",
  "name": "Mateo Ríos",
  "email": "mateo.rios@musicshare.org",
  "role": "musician",
  "phone": "+57 310 555 0142",
  "createdAt": "2026-09-20T10:00:00.000Z"
}
```
`role`: `"musician" | "owner" | "admin"`

### `Instrument`
```json
{
  "id": "inst-1",
  "name": "Guitarra Acústica Dreadnought",
  "category": "cuerdas",
  "brand": "Yamaha FG800",
  "description": "Tapa maciza de abeto con funda acolchada.",
  "condition": "excelente",
  "status": "disponible",
  "ownerId": "usr-owner-1",
  "ownerName": "Clara Mendoza",
  "imageUrl": "http://localhost:4566/imginstrumentos/inst-1.jpg",
  "imageKey": "inst-1.jpg",
  "location": "Sala Comunitaria Norte",
  "createdAt": "2026-10-15T14:00:00.000Z",
  "updatedAt": "2026-11-20T12:00:00.000Z"
}
```
- `category`: `"cuerdas" | "viento" | "percusion" | "teclados" | "amplificacion" | "otros"` (atributo directo en DynamoDB, sin CRUD de categorías)
- `condition`: `"excelente" | "bueno" | "regular" | "dañado"`
- `status`: `"disponible" | "prestado" | "mantenimiento" | "retirado"`

### `Loan`
```json
{
  "id": "loan-1",
  "instrumentId": "inst-2",
  "instrumentName": "Saxofón Alto Eb",
  "instrumentImageUrl": "http://localhost:4566/imginstrumentos/inst-2.jpg",
  "borrowerId": "usr-musician-1",
  "borrowerName": "Mateo Ríos",
  "ownerId": "usr-owner-1",
  "ownerName": "Clara Mendoza",
  "startDate": "2026-11-10",
  "dueDate": "2026-11-22",
  "returnedAt": null,
  "status": "activo",
  "damageNotes": null,
  "createdAt": "2026-11-10T10:00:00.000Z",
  "updatedAt": "2026-11-10T10:00:00.000Z"
}
```
- `status`: `"activo" | "devuelto" | "dañado"`

### `AlertNotification`
```json
{
  "id": "alert-1",
  "type": "damage_maintenance",
  "severity": "critical",
  "source": "sqs",
  "channel": "sns_email",
  "loanId": "loan-4",
  "instrumentId": "inst-6",
  "recipientUserId": "usr-owner-1",
  "title": "Revisión requerida: Amplificador a Válvulas 15W",
  "message": "Devuelto con reporte de daño...",
  "read": false,
  "createdAt": "2026-11-20T18:41:00.000Z"
}
```
- `type`: `"due_soon" | "overdue" | "damage_maintenance"`
- `severity`: `"info" | "warning" | "critical"`
- `source`: `"eventbridge" | "sqs"`
- `channel`: `"sns_email" | "sns_sms" | "in_app"`

---

## 5. Endpoints REST

### Autenticación (`DB Usuarios`)
- `POST /auth/login` → Body: `{ email, password }` → `200 AuthSession` (`{ user: User, token?: string }`). Retorna `401` si las credenciales son inválidas.
- `POST /auth/register` → Body: `{ name, email, password, role, phone? }` → `201 AuthSession` (`{ user: User, token?: string }`). Retorna `409` si el correo ya existe en `DB Usuarios`.

### Usuarios (`DB Usuarios`)
- `GET /users` → `User[]`
- `GET /users/{id}` → `User`

### Instrumentos (`DB Instrumento` + S3 `imginstrumentos`)
- `GET /instruments?q=&category=&status=&ownerId=` → `Instrument[]`
- `GET /instruments/{id}` → `Instrument`
- `POST /instruments` → Body: `{ name, category, brand?, description, condition, location?, imageUrl, imageKey? }` → `201 Instrument`
  - El backend asigna `ownerId` y `ownerName` desde `X-User-Id` / `X-User-Name` (con `status: "disponible"` por defecto).
- `PUT /instruments/{id}` → Body parcial/completo → `200 Instrument`
- `DELETE /instruments/{id}` → `204 No Content` (rechazar con `409` si tiene préstamo `activo`)
- `POST /instruments/upload-url` → Body: `{ filename, contentType }` → `200 { uploadUrl, imageKey, publicUrl }`
  - El frontend ejecuta `PUT {uploadUrl}` directo al bucket S3 `imginstrumentos` con el archivo binario.
  - Si este endpoint no responde aún, el frontend degrada automáticamente enviando `imageUrl` como Data URL JPEG comprimida en el JSON de `POST /instruments`.

### Préstamos (`DBPrestamos`)
- `GET /loans?borrowerId=&ownerId=&status=` → `Loan[]`
- `GET /loans/{id}` → `Loan`
- `POST /loans` → Body: `{ instrumentId, startDate, dueDate, borrowerId? }` → `201 Loan`
  - Valida que el instrumento esté `"disponible"` (de lo contrario `409`), crea el préstamo con `status: "activo"` y cambia el instrumento a `"prestado"`.
- `PATCH /loans/{id}/return` → Body: `{ status: "devuelto" | "dañado", damageNotes?: string }` → `200 Loan`
  - Si `status === "devuelto"`: actualiza préstamo y devuelve instrumento a `"disponible"`.
  - Si `status === "dañado"`: actualiza préstamo con `damageNotes`, cambia instrumento a `"mantenimiento"` (`condition: "dañado"`), envía mensaje a **Amazon SQS** → Lambda Mantenimiento → **Amazon SNS** y registra `AlertNotification` (`type: "damage_maintenance"`).
- `DELETE /loans/{id}` → `204 No Content`

### Alertas (`EventBridge` + `SQS` + `SNS`)
- `GET /alerts?userId=&type=&unreadOnly=` → `AlertNotification[]`
- `PATCH /alerts/{id}/read` → `200 AlertNotification`
- `PATCH /alerts/read-all?userId=` → `204 No Content`
- `POST /alerts/check-due` → `200 AlertNotification[]` *(Endpoint opcional para invocar manualmente la Lambda `notificarVencimiento` en demos locales; en producción lo dispara EventBridge diariamente).*

---

## 6. Errores Esperados

Cualquier error `4xx`/`5xx` debe retornar JSON con `detail` o `message`:
```json
{
  "detail": "Este instrumento no está disponible para préstamo en este momento."
}
```

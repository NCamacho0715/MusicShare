# MusicShare Backend

Backend serverless para la plataforma **MusicShare** construido con **Python 3.12**, **AWS Lambda**, **DynamoDB**, **S3**, **API Gateway**, **SQS**, **SNS**, **EventBridge**, **Terraform**, **Docker**, **Floci** y **Pytest**.

## 🚀 Inicio rápido con un solo comando

Para levantar el emulador Floci, empaquetar las funciones Lambda, aprovisionar la infraestructura con Terraform, cargar datos de prueba y ejecutar todas las pruebas:

```powershell
.\backend\scripts\musicshare.ps1 all
```

En entornos Linux / macOS / Bash:

```bash
chmod +x ./backend/scripts/musicshare.sh
./backend/scripts/musicshare.sh all
```

## 📋 Comandos disponibles

| Comando PowerShell | Equivalente Bash | Descripción |
|---|---|---|
| `.\backend\scripts\musicshare.ps1 start` | `./backend/scripts/musicshare.sh start` | Levanta el emulador Floci en Docker |
| `.\backend\scripts\musicshare.ps1 infra` | `./backend/scripts/musicshare.sh infra` | Empaqueta Lambdas y aplica Terraform |
| `.\backend\scripts\musicshare.ps1 seed` | `./backend/scripts/musicshare.sh seed` | Carga datos iniciales de prueba en DynamoDB |
| `.\backend\scripts\musicshare.ps1 test` | `./backend/scripts/musicshare.sh test` | Ejecuta lint y suite de pruebas con Pytest |
| `.\backend\scripts\musicshare.ps1 stop` | `./backend/scripts/musicshare.sh stop` | Detiene los contenedores de Floci |
| `.\backend\scripts\musicshare.ps1 clean` | `./backend/scripts/musicshare.sh clean` | Limpia artefactos generados y contenedores |
| `.\backend\scripts\musicshare.ps1 all` | `./backend/scripts/musicshare.sh all` | Flujo integral end-to-end automatizado |

## 📐 Arquitectura

### 1. Flujo Síncrono (CRUD)
```text
Frontend → API Gateway → Lambda → DynamoDB / S3
```
- Lambdas independientes por operación sin llamadas síncronas entre sí.
- Headers simulados de autenticación: `X-User-Id`, `X-User-Role`.

### 2. Flujo Asíncrono de Instrumentos Dañados (Evento SQS)
```text
API Gateway → Lambda de préstamos → SQS → Lambda de mantenimiento → DynamoDB + SNS
```
- Transición de préstamo a `dañado` envía un evento a `musicshare-danos-queue`.
- La Lambda de mantenimiento actualiza el estado del instrumento a `en_mantenimiento` y publica alerta en SNS `musicshare-notificaciones`.
- Idempotente y respaldado por Dead Letter Queue (`musicshare-danos-dlq`).

### 3. Flujo Asíncrono de Vencimientos (EventBridge programado)
```text
EventBridge → Lambda revisar_vencimientos → DynamoDB + SNS
```
- Ejecución diaria programada.
- Identifica préstamos próximos a vencer y vencidos, actualiza estados y envía notificaciones sin duplicados.

## 🗄️ Modelos de Base de Datos (DynamoDB)

- **Usuarios**: Clave primaria `id`. GSIs: `email-index`, `rol-index`.
- **Instrumentos**: Clave primaria `id`. GSIs: `propietario_id-index`, `estado-index`, `categoria-index`.
- **Prestamos**: Clave primaria `id`. GSIs: `instrumento_id-index`, `solicitante_id-index`, `propietario_id-index`, `estado-index`, `fecha_vencimiento-index`.

## 🧪 Pruebas Automatizadas

```bash
# Pruebas unitarias
pytest backend/tests/unit

# Pruebas de contrato
pytest backend/tests/contract

# Pruebas de integración
pytest backend/tests/integration

# Pruebas end-to-end
pytest backend/tests/e2e
```

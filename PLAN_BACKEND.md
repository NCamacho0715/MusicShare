# Plan completo del backend de MusicShare

## 1. Objetivo y alcance

Construir únicamente el backend con Python 3.12, AWS Lambda, DynamoDB, S3, API Gateway, SQS, SNS, EventBridge, Terraform, Docker, Floci y Pytest. El frontend queda fuera del alcance.

El sistema debe poder levantarse, aprovisionarse y validarse con un solo comando:

```powershell
.\backend\scripts\musicshare.ps1 all
```

Si alguna validación falla, el proceso debe detenerse y devolver un código de error.

## 2. Arquitectura

### Flujo síncrono

```text
Frontend → API Gateway → Lambda → DynamoDB / S3
```

Cada Lambda accederá directamente a los recursos que necesite. No habrá llamadas síncronas entre Lambdas.

### Flujo de instrumentos dañados

```text
API Gateway → Lambda de préstamos → SQS → Lambda de mantenimiento → DynamoDB + SNS
```

### Flujo de vencimientos

```text
EventBridge → Lambda revisar_vencimientos → DynamoDB + SNS
```

## 3. Estructura de archivos

```text
MusicShare/
├── backend/
│   ├── infrastructure/
│   │   ├── modules/
│   │   │   ├── dynamodb/
│   │   │   ├── s3/
│   │   │   ├── lambda/
│   │   │   ├── api_gateway/
│   │   │   ├── sqs/
│   │   │   ├── sns/
│   │   │   └── eventbridge/
│   │   ├── environments/
│   │   │   ├── local.tfvars
│   │   │   ├── ci.tfvars
│   │   │   └── production.tfvars
│   │   ├── main.tf
│   │   ├── providers.tf
│   │   ├── variables.tf
│   │   ├── outputs.tf
│   │   ├── versions.tf
│   │   └── iam.tf
│   ├── lambdas/
│   │   ├── usuarios/
│   │   │   ├── crear/handler.py
│   │   │   ├── buscar/handler.py
│   │   │   ├── actualizar/handler.py
│   │   │   └── eliminar/handler.py
│   │   ├── instrumentos/
│   │   │   ├── crear/handler.py
│   │   │   ├── buscar/handler.py
│   │   │   ├── actualizar/handler.py
│   │   │   ├── eliminar/handler.py
│   │   │   └── imagen/handler.py
│   │   ├── prestamos/
│   │   │   ├── crear/handler.py
│   │   │   ├── buscar/handler.py
│   │   │   ├── obtener/handler.py
│   │   │   ├── actualizar/handler.py
│   │   │   └── eliminar/handler.py
│   │   ├── mantenimiento/handler.py
│   │   └── vencimientos/handler.py
│   ├── shared/
│   │   ├── aws_clients.py
│   │   ├── config.py
│   │   ├── responses.py
│   │   ├── errors.py
│   │   ├── dates.py
│   │   ├── auth_headers.py
│   │   ├── models/{usuario,instrumento,prestamo}.py
│   │   ├── repositories/{usuarios,instrumentos,prestamos}_repository.py
│   │   └── services/{s3,sqs,sns,prestamos}_service.py
│   ├── tests/
│   │   ├── unit/
│   │   ├── integration/
│   │   ├── contract/
│   │   ├── e2e/
│   │   └── fixtures/
│   ├── scripts/
│   │   ├── musicshare.ps1
│   │   ├── musicshare.sh
│   │   ├── wait_for_floci.py
│   │   ├── seed_data.py
│   │   └── package_lambdas.py
│   ├── docker-compose.yml
│   ├── Dockerfile
│   ├── pyproject.toml
│   └── README.md
├── .github/workflows/
│   ├── backend-ci.yml
│   └── backend-cd.yml
├── .env.example
└── README.md
```

## 4. Base de datos DynamoDB

Se utilizarán tres tablas independientes para mantener el diseño simple.

### `Usuarios`

Clave primaria:

```text
id: String
```

Atributos:

```text
id, nombre, apellido, correo, telefono, rol, estado, created_at, updated_at
```

Roles: `estudiante`, `musico`, `propietario`, `administrador`.

Índices: `email-index`, `rol-index`. El correo debe ser único.

### `Instrumentos`

Clave primaria:

```text
id: String
```

Atributos:

```text
id, nombre, marca, modelo, categoria, descripcion, estado,
propietario_id, imagen_key, created_at, updated_at
```

Estados: `disponible`, `prestado`, `en_mantenimiento`, `inactivo`.

Índices: `propietario_id-index`, `estado-index`, `categoria-index`.

La categoría será un atributo, no una tabla independiente.

### `Prestamos`

Clave primaria:

```text
id: String
```

Atributos:

```text
id, instrumento_id, solicitante_id, propietario_id,
fecha_inicio, fecha_vencimiento, fecha_devolucion, estado,
observaciones, notificacion_vencimiento_enviada, created_at, updated_at
```

Estados: `solicitado`, `activo`, `devuelto`, `dañado`, `cancelado`, `vencido`.

Índices: `instrumento_id-index`, `solicitante_id-index`, `propietario_id-index`, `estado-index`, `fecha_vencimiento-index`.

Las fechas se guardarán en UTC e ISO 8601, por ejemplo `2026-11-20T18:30:00Z`.

## 5. S3

Bucket de imágenes:

```text
musicshare-instrument-images
```

Ruta de objetos:

```text
instrumentos/{instrumento_id}/{nombre_archivo}
```

DynamoDB almacenará solamente `imagen_key`. La Lambda de instrumentos podrá generar URLs prefirmadas, registrar la clave y eliminar la imagen. El bucket del frontend no pertenece a este backend.

## 6. Lambdas y responsabilidades

### Usuarios

```text
crear_usuario
buscar_usuarios
actualizar_usuario
eliminar_usuario
```

Validan con Pydantic, comprueban correos duplicados y gestionan DynamoDB.

### Instrumentos

```text
crear_instrumento
buscar_instrumentos
actualizar_instrumento
eliminar_instrumento
generar_url_imagen
```

Gestionan catálogo, propietarios, estados e imágenes.

### Préstamos

```text
crear_prestamo
buscar_prestamos
obtener_prestamo
actualizar_prestamo
eliminar_prestamo
```

Validan usuarios e instrumentos, comprueban disponibilidad y actualizan estados.

Transiciones principales:

```text
solicitado → activo
activo → devuelto
activo → dañado
activo → vencido
solicitado → cancelado
```

Cuando un préstamo cambie a `dañado`, se publicará un evento en SQS.

### Mantenimiento

`procesar_danio_instrumento` será activada por SQS, cambiará el instrumento a `en_mantenimiento` y publicará una notificación SNS.

Mensaje esperado:

```json
{
  "event_id": "event-123",
  "prestamo_id": "prestamo-123",
  "instrumento_id": "instrumento-123",
  "usuario_id": "usuario-123",
  "tipo_evento": "instrumento_daniado"
}
```

Debe ser idempotente.

### Vencimientos

`revisar_vencimientos` será activada diariamente por EventBridge. Buscará préstamos activos, identificará próximos vencimientos y vencidos, actualizará estados y publicará alertas sin duplicarlas.

## 7. SQS, DLQ y SNS

Colas:

```text
musicshare-danos-queue
musicshare-danos-dlq
```

Configuración inicial: `maxReceiveCount: 3` y un `visibilityTimeout` superior al timeout de la Lambda.

Topic SNS:

```text
musicshare-notificaciones
```

Tipos de mensaje: `instrumento_daniado`, `prestamo_proximo_a_vencer`, `prestamo_vencido`.

En Floci se comprobará que los mensajes se publiquen correctamente; no se dependerá de correos reales durante el MVP.

## 8. API Gateway

```text
POST   /usuarios
GET    /usuarios
GET    /usuarios/{id}
PUT    /usuarios/{id}
DELETE /usuarios/{id}

POST   /instrumentos
GET    /instrumentos
GET    /instrumentos/{id}
PUT    /instrumentos/{id}
DELETE /instrumentos/{id}
POST   /instrumentos/{id}/imagen-url

POST   /prestamos
GET    /prestamos
GET    /prestamos/{id}
PUT    /prestamos/{id}
DELETE /prestamos/{id}
```

Headers simulados: `X-User-Id` y `X-User-Role`. No representan autenticación real.

## 9. Terraform y Floci

Terraform creará tablas, índices, bucket, Lambdas, permisos IAM, API Gateway, SQS, DLQ, SNS, reglas EventBridge e integraciones entre servicios.

Ambientes:

```text
local
ci
production
```

Para local y CI:

```text
AWS_ENDPOINT_URL=http://localhost:4566
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=test
AWS_SECRET_ACCESS_KEY=test
```

El mismo código Terraform debe poder adaptarse posteriormente a AWS real mediante variables.

## 10. Pruebas

### Unitarias

Validarán modelos Pydantic, reglas de negocio, estados, fechas, respuestas HTTP, errores y eventos.

### Integración

Se ejecutarán contra Floci y comprobarán DynamoDB, S3, Lambda, SQS, SNS, EventBridge y API Gateway.

### Contrato

Validarán rutas, métodos HTTP, códigos de respuesta, JSON, campos obligatorios y errores.

### End-to-end

Se validará el flujo completo: crear usuario, crear instrumento, generar URL de imagen, guardar imagen, crear y activar préstamo, devolverlo, marcar otro como dañado, verificar SQS, ejecutar mantenimiento, verificar estado y SNS, crear préstamo vencido y verificar la alerta de EventBridge.

## 11. Regla de bloqueo

```text
Lint
  ↓
Pruebas unitarias
  ↓
Terraform validate
  ↓
Terraform plan
  ↓
Pruebas de integración
  ↓
Pruebas end-to-end
  ↓
Despliegue
```

Si falla cualquier etapa, no se ejecutará el despliegue. El comando local también debe devolver un código de error distinto de cero.

## 12. Comando único

El script `backend/scripts/musicshare.ps1 all` debe:

1. Verificar Docker.
2. Levantar Floci.
3. Esperar a que Floci esté disponible.
4. Instalar dependencias.
5. Empaquetar Lambdas.
6. Ejecutar `terraform init`.
7. Ejecutar `terraform validate`.
8. Ejecutar `terraform plan`.
9. Ejecutar `terraform apply`.
10. Cargar datos de prueba.
11. Ejecutar pruebas unitarias, de integración y end-to-end.
12. Mostrar un resumen final.

Comandos auxiliares:

```powershell
.\backend\scripts\musicshare.ps1 start
.\backend\scripts\musicshare.ps1 infra
.\backend\scripts\musicshare.ps1 test
.\backend\scripts\musicshare.ps1 seed
.\backend\scripts\musicshare.ps1 stop
.\backend\scripts\musicshare.ps1 clean
.\backend\scripts\musicshare.ps1 all
```

## 13. CI/CD

### Integración continua

`.github/workflows/backend-ci.yml` se ejecutará en pull requests y pushes a la rama principal:

```text
Instalar dependencias
   ↓
Levantar Floci
   ↓
Terraform validate
   ↓
Pruebas unitarias
   ↓
Terraform apply en Floci
   ↓
Pruebas de integración
   ↓
Pruebas end-to-end
```

Si falla, el workflow falla y no permite hacer merge.

### Despliegue continuo

`.github/workflows/backend-cd.yml` desplegará inicialmente en Floci como ambiente de validación. El futuro flujo para AWS será:

```text
CI contra Floci → Merge a main → Terraform plan → Aprobación → Terraform apply en AWS
```

El despliegue real requerirá definir credenciales, cuenta AWS, backend remoto de Terraform, roles IAM y variables protegidas.

## 14. Orden de construcción

1. Crear la estructura del backend.
2. Configurar Docker y Floci.
3. Configurar Python y Pytest.
4. Crear módulos Terraform.
5. Crear tablas DynamoDB.
6. Crear bucket S3.
7. Crear CRUD de usuarios.
8. Crear CRUD de instrumentos.
9. Crear CRUD de préstamos.
10. Crear API Gateway.
11. Crear SQS y DLQ.
12. Crear Lambda de mantenimiento.
13. Crear SNS.
14. Crear EventBridge.
15. Crear Lambda de vencimientos.
16. Crear pruebas unitarias, de integración y end-to-end.
17. Crear el comando único.
18. Crear workflows de CI/CD.
19. Ejecutar una validación completa desde un entorno limpio.

## 15. Criterio de finalización

Cualquier integrante debe poder clonar el repositorio y ejecutar:

```powershell
.\backend\scripts\musicshare.ps1 all
```

El comando deberá levantar Floci, crear la infraestructura, cargar datos de prueba, ejecutar todas las pruebas y mostrar claramente si el sistema funciona o debe considerarse fallido.

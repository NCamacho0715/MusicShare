# MusicShare

Plataforma serverless para la gestión comunitaria y préstamo de instrumentos musicales. Conecta a músicos y academias que necesitan instrumentos con propietarios disponibles, automatizando el seguimiento de préstamos, vencimientos y reportes de mantenimiento.

---

## 🏗️ Arquitectura y Tecnologías

- **Backend (Serverless):** Python 3.12, AWS Lambda, DynamoDB, Amazon S3, Amazon SQS, Amazon SNS, Amazon EventBridge y API Gateway.
- **Emulador Local AWS:** Floci en Docker (`http://localhost:4566`).
- **Infraestructura como Código (IaC):** Terraform con módulos modulares y soporte CORS completo.
- **Frontend (SPA):** React 19, TypeScript, Vite, Tailwind CSS, Lucide Icons, Zod y React Router.

---

## 🚀 Inicio Rápido con un Solo Comando

### Ejecución Integral (Backend + Frontend)

Para levantar Floci, compilar y empaquetar Lambdas, aprovisionar infraestructura con Terraform, sembrar datos de prueba, validar ambas capas con pruebas automáticas y compilar el frontend:

**En Windows (PowerShell):**
```powershell
.\musicshare.ps1 all
```

**En Linux / macOS / WSL (Bash):**
```bash
chmod +x ./musicshare.sh
./musicshare.sh all
```

---

## 💻 Modo Desarrollo (En Vivo)

Para iniciar todos los servicios del backend en segundo plano y lanzar el servidor de desarrollo interactivo de React con Vite:

**PowerShell:**
```powershell
.\musicshare.ps1 dev
```

**Bash:**
```bash
./musicshare.sh dev
```

Una vez iniciado:
- **Frontend Web:** Abre tu navegador en [http://localhost:5173](http://localhost:5173)
- **API Gateway (Floci):** `http://localhost:4566/restapis/<api_id>/local/_user_request_`
- **S3 Bucket de Imágenes:** `http://localhost:4566/musicshare-instrument-images`

---

## 📋 Comandos Disponibles

| Comando PowerShell | Comando Bash | Descripción |
|---|---|---|
| `.\musicshare.ps1 all` | `./musicshare.sh all` | Flujo integral end-to-end (Infra, Seed, Tests, Build) |
| `.\musicshare.ps1 dev` | `./musicshare.sh dev` | Levanta backend y arranca servidor Vite en `http://localhost:5173` |
| `.\musicshare.ps1 start` | `./musicshare.sh start` | Inicia el contenedor Docker con Floci (`http://localhost:4566`) |
| `.\musicshare.ps1 infra` | `./musicshare.sh infra` | Empaqueta Lambdas, aplica Terraform y sincroniza `frontend/.env` |
| `.\musicshare.ps1 seed` | `./musicshare.sh seed` | Carga usuarios, instrumentos y préstamos de prueba en DynamoDB |
| `.\musicshare.ps1 test` | `./musicshare.sh test` | Corre suite de pruebas de Backend (Pytest) y Frontend (Typecheck) |
| `.\musicshare.ps1 build` | `./musicshare.sh build` | Compila frontend para producción (`dist/`), empaqueta backend y despliega a S3 |
| `.\musicshare.ps1 s3` | `./musicshare.sh s3` | Compila y despliega el Frontend al bucket S3 en Floci (`http://localhost:4566/musicshare-frontend/index.html`) |
| `.\musicshare.ps1 stop` | `./musicshare.sh stop` | Detiene los contenedores Docker de Floci |
| `.\musicshare.ps1 clean` | `./musicshare.sh clean` | Limpia artefactos generados, terraform state y contenedores |

---

## 👥 Cuentas de Prueba Pre-sembradas

El comando `seed` precarga los siguientes usuarios en DynamoDB listos para ingresar desde la pantalla de login:

- **Músico:** `ana.gomez@musicshare.org` (Rol: Músico)
- **Propietario:** `contacto@filarmonicabogota.com` (Rol: Propietario / Academia)
- **Administrador:** `admin@musicshare.local` (Rol: Administrador)
- **Estudiante:** `carlos.perez@musica.edu.co` (Rol: Estudiante)

---

## 📁 Estructura del Repositorio

```text
MusicShare/
├── musicshare.ps1         # Script unificado de orquestación maestro (PowerShell)
├── musicshare.sh          # Script unificado de orquestación maestro (Bash)
├── backend/               # Código, infraestructura y pruebas del backend
│   ├── infrastructure/    # Módulos Terraform (DynamoDB, S3, Lambda, API Gateway con CORS, SQS, SNS)
│   ├── lambdas/           # Handlers AWS Lambda independientes por operación
│   ├── shared/            # Modelos Pydantic, repositorios DynamoDB, servicios AWS
│   ├── tests/             # Tests unitarios, integración, contrato y E2E (Pytest)
│   └── scripts/           # Scripts específicos de backend (seed, wait, package)
├── frontend/              # Aplicación SPA cliente (React 19 + TypeScript + Vite)
│   ├── src/services/      # apiAdapter conectado a endpoints del backend serverless
│   ├── src/pages/         # Catálogo, préstamos, alertas, detalle de instrumentos
│   └── src/context/       # Contextos de autenticación simulada y alertas
└── .github/workflows/     # Pipelines de CI/CD para GitHub Actions
```

# MusicShare

Plataforma serverless para la gestión y préstamo de instrumentos musicales.

## Estructura del repositorio

```text
MusicShare/
├── backend/               # Código, infraestructura y pruebas del backend
│   ├── infrastructure/    # Módulos Terraform (DynamoDB, S3, Lambda, API Gateway, SQS, SNS, EventBridge)
│   ├── lambdas/           # Handlers de AWS Lambda (Python 3.12)
│   ├── shared/            # Modelos Pydantic, repositorios DynamoDB, servicios AWS
│   ├── tests/             # Tests unitarios, integración, contrato y E2E
│   └── scripts/           # Scripts de automatización (musicshare.ps1, etc.)
├── frontend/              # Aplicación SPA cliente (React)
└── .github/workflows/     # Pipelines de CI/CD para GitHub Actions
```

Para instrucciones detalladas del backend, consulta [backend/README.md](backend/README.md).

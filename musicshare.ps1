<#
.SYNOPSIS
    Script maestro para la ejecución, construcción y validación integral de MusicShare (Backend Serverless + Frontend React).
.DESCRIPTION
    Orquesta tanto el Backend (Docker Floci, Lambdas Python 3.12, DynamoDB, S3, SQS, SNS, Terraform)
    como el Frontend (React 19, TypeScript, Vite, Tailwind CSS), conectando ambas capas sin fisuras.
.PARAMETER Action
    all, dev, start, infra, seed, test, build, s3, stop, clean
.EXAMPLE
    .\musicshare.ps1 all      # Ejecución y validación integral de todo el proyecto
    .\musicshare.ps1 dev      # Inicia backend y levanta servidor de desarrollo Vite
    .\musicshare.ps1 s3       # Compila y despliega el frontend al bucket S3 en Floci
    .\musicshare.ps1 test     # Ejecuta la suite de pruebas de backend y frontend
    .\musicshare.ps1 build    # Empaqueta backend, compila frontend y lo sube a S3
#>

param (
    [Parameter(Position=0)]
    [ValidateSet("all", "dev", "start", "infra", "seed", "test", "build", "s3", "stop", "clean")]
    [string]$Action = "all"
)

if (Test-Path variable:PSNativeCommandUseErrorActionPreference) {
    $PSNativeCommandUseErrorActionPreference = $false
}
$ErrorActionPreference = "Continue"

$RootDir = $PSScriptRoot
if (-not $RootDir) {
    $RootDir = Split-Path -Parent $MyInvocation.MyCommand.Path
}
$BackendDir = Join-Path $RootDir "backend"
$FrontendDir = Join-Path $RootDir "frontend"
$BackendScript = Join-Path $BackendDir "scripts\musicshare.ps1"
$InfraDir = Join-Path $BackendDir "infrastructure"
$DistDir = Join-Path $BackendDir "dist"
$FrontDistDir = Join-Path $FrontendDir "dist"
$LogFile = Join-Path $RootDir "musicshare-full.log"

try {
    Start-Transcript -Path $LogFile -Append -Force -ErrorAction SilentlyContinue | Out-Null
} catch {}

function Write-Step {
    param ([string]$Msg)
    Write-Host "`n========================================================" -ForegroundColor Cyan
    Write-Host ">>> $Msg" -ForegroundColor Cyan
    Write-Host "========================================================" -ForegroundColor Cyan
}

function Write-Success {
    param ([string]$Msg)
    Write-Host "[OK] $Msg" -ForegroundColor Green
}

function Write-Fail {
    param ([string]$Msg)
    Write-Host "[ERROR] $Msg" -ForegroundColor Red
}

function Check-Command {
    param ([string]$CommandName, [string]$HelpMsg = "")
    if (-not (Get-Command $CommandName -ErrorAction SilentlyContinue)) {
        Write-Fail "El comando requerido '$CommandName' no está instalado o no se encuentra en el PATH."
        if ($HelpMsg) {
            Write-Host $HelpMsg -ForegroundColor Yellow
        }
        exit 1
    }
}

function Invoke-BackendScript {
    param ([string]$SubAction)
    if (-not (Test-Path $BackendScript)) {
        Write-Fail "No se encontró el script de backend en: $BackendScript"
        exit 1
    }
    & powershell -ExecutionPolicy Bypass -File $BackendScript $SubAction
    if ($LASTEXITCODE -ne 0) {
        Write-Fail "La acción '$SubAction' del backend finalizó con error (código: $LASTEXITCODE)."
        exit $LASTEXITCODE
    }
}

function Sync-FrontendConfig {
    Write-Step "Sincronizando configuración Frontend con Backend"
    Push-Location $InfraDir
    try {
        $apiId = (terraform output -raw api_id 2>$null)
        $invokeUrl = (terraform output -raw api_gateway_invoke_url 2>$null)
        if (-not $invokeUrl -and $apiId) {
            $invokeUrl = "http://localhost:4566/restapis/$apiId/local/_user_request_"
        }
        if (-not $invokeUrl) {
            $invokeUrl = "http://localhost:4566"
        } else {
            $invokeUrl = $invokeUrl.Trim()
        }

        $frontEnv = Join-Path $FrontendDir ".env"
        $lines = @(
            "# Configuración generada por MusicShare",
            "VITE_USE_MOCKS=false",
            "VITE_API_BASE_URL=$invokeUrl",
            "VITE_S3_IMAGES_BASE_URL=http://localhost:4566/musicshare-instrument-images"
        )
        [System.IO.File]::WriteAllLines($frontEnv, $lines, [System.Text.UTF8Encoding]::new($false))
        Write-Success "Frontend conectado a: $invokeUrl"
    } finally {
        Pop-Location
    }
}

function Install-FrontendDependencies {
    Write-Step "Verificando dependencias del Frontend (npm)"
    Check-Command "npm" "Instala Node.js (v18+) desde https://nodejs.org/"
    
    $nodeModules = Join-Path $FrontendDir "node_modules"
    if (-not (Test-Path $nodeModules)) {
        Write-Host "Instalando paquetes npm del frontend..." -ForegroundColor Yellow
        Push-Location $FrontendDir
        try {
            npm install
            if ($LASTEXITCODE -ne 0) { throw "npm install falló" }
        } finally {
            Pop-Location
        }
        Write-Success "Dependencias npm instaladas correctamente."
    } else {
        Write-Success "node_modules ya existente en frontend."
    }
}

function Build-Frontend {
    Write-Step "Compilando Frontend (React + Vite + Tailwind)"
    Install-FrontendDependencies
    Push-Location $FrontendDir
    try {
        Write-Host "Verificando tipos con TypeScript..."
        npm run typecheck
        if ($LASTEXITCODE -ne 0) { throw "Fallo en la verificación de tipos de TypeScript" }

        Write-Host "Compilando aplicación para producción con Vite..."
        npx vite build
        if ($LASTEXITCODE -ne 0) { throw "Fallo en vite build" }
    } finally {
        Pop-Location
    }
    Write-Success "Frontend compilado exitosamente en frontend/dist."
}

function Run-All-Tests {
    Write-Step "Ejecutando Suite Completa de Pruebas (Backend + Frontend)"
    
    # 1. Pruebas de Backend
    Invoke-BackendScript "test"
    
    # 2. Pruebas de Frontend
    Push-Location $FrontendDir
    try {
        Write-Host "`nEjecutando typecheck del Frontend..."
        npm run typecheck
        if ($LASTEXITCODE -ne 0) { throw "Fallo en typecheck de frontend" }
        Write-Success "Typecheck del Frontend aprobado."

        if (Test-Path "src/services/__tests__") {
            Write-Host "Ejecutando pruebas unitarias de Frontend con Vitest..."
            npx vitest run
            if ($LASTEXITCODE -ne 0) {
                throw "Fallaron las pruebas unitarias de Frontend (Vitest)"
            }
            Write-Success "Pruebas de Frontend aprobadas."
        }
    } finally {
        Pop-Location
    }
}

function Start-Dev-Environment {
    Write-Step "Iniciando Entorno de Desarrollo MusicShare"
    
    # Asegurar que Floci, Lambdas y DynamoDB estén listos
    Invoke-BackendScript "start"
    Invoke-BackendScript "infra"
    Sync-FrontendConfig
    Invoke-BackendScript "seed"
    Install-FrontendDependencies

    Write-Host "`n========================================================" -ForegroundColor Green
    Write-Host ">>> SERVICIOS LISTOS:" -ForegroundColor Green
    Write-Host "    - Emulador AWS Floci:  http://localhost:4566" -ForegroundColor Green
    Write-Host "    - DynamoDB / S3 / SQS: Operando en Floci" -ForegroundColor Green
    Write-Host "    - Frontend URL:        http://localhost:5173" -ForegroundColor Green
    Write-Host "========================================================`n" -ForegroundColor Green

    Push-Location $FrontendDir
    try {
        Write-Host "Iniciando servidor de desarrollo Vite (Ctrl+C para salir)..." -ForegroundColor Cyan
        npm run dev
    } finally {
        Pop-Location
    }
}

function Deploy-Frontend-S3 {
    Write-Step "Desplegando Frontend al Bucket S3 (Static Website Hosting)"
    Build-Frontend
    $deployScript = Join-Path $BackendDir "scripts\deploy_frontend_s3.py"
    python $deployScript
    if ($LASTEXITCODE -ne 0) {
        Write-Fail "Error durante el despliegue del Frontend a S3."
        exit $LASTEXITCODE
    }
    Write-Success "Frontend desplegado y operativo en Amazon S3."
}

function Clean-Project {
    Write-Step "Limpieza de artefactos del Proyecto Completo"
    Invoke-BackendScript "clean"
    if (Test-Path $FrontDistDir) {
        Remove-Item -Recurse -Force $FrontDistDir
    }
    Write-Success "Proyecto limpio."
}

# --- Router de acciones ---
switch ($Action) {
    "start" {
        Invoke-BackendScript "start"
    }
    "infra" {
        Invoke-BackendScript "infra"
        Sync-FrontendConfig
    }
    "seed" {
        Invoke-BackendScript "seed"
    }
    "test" {
        Run-All-Tests
    }
    "build" {
        Invoke-BackendScript "infra"
        Sync-FrontendConfig
        Deploy-Frontend-S3
    }
    "s3" {
        Invoke-BackendScript "infra"
        Sync-FrontendConfig
        Deploy-Frontend-S3
    }
    "dev" {
        Start-Dev-Environment
    }
    "stop" {
        Invoke-BackendScript "stop"
    }
    "clean" {
        Clean-Project
    }
    "all" {
        $startTime = Get-Date
        Write-Host "`n========================================================" -ForegroundColor Magenta
        Write-Host ">>> EJECUCIÓN INTEGRAL DE MUSICSHARE (BACKEND + FRONTEND)" -ForegroundColor Magenta
        Write-Host "========================================================" -ForegroundColor Magenta

        # 1. Backend: Iniciar Floci y dependencias
        Invoke-BackendScript "start"
        
        # 2. Frontend: Validar dependencias
        Install-FrontendDependencies
        
        # 3. Backend: Infraestructura y Lambdas
        Invoke-BackendScript "infra"
        
        # 4. Conexión Backend ↔ Frontend
        Sync-FrontendConfig
        
        # 5. Carga de datos de prueba
        Invoke-BackendScript "seed"
        
        # 6. Pruebas
        Run-All-Tests
        
        # 7. Compilación y despliegue del frontend a S3
        Deploy-Frontend-S3

        $elapsed = (Get-Date) - $startTime
        Write-Host "`n========================================================" -ForegroundColor Green
        Write-Host ">>> PROYECTO MUSICSHARE COMPLETAMENTE VALIDADO Y LISTO" -ForegroundColor Green
        Write-Host ">>> Tiempo total: $($elapsed.TotalSeconds.ToString('F1'))s" -ForegroundColor Green
        Write-Host ">>> URLs de Acceso:" -ForegroundColor Cyan
        Write-Host "    - Frontend en S3 (Hosting):   http://localhost:4566/musicshare-frontend/index.html" -ForegroundColor Yellow
        Write-Host "    - Servidor Dev (Vite en vivo): .\musicshare.ps1 dev (http://localhost:5173)" -ForegroundColor Yellow
        Write-Host "========================================================`n" -ForegroundColor Green
    }
}

try {
    Stop-Transcript -ErrorAction SilentlyContinue | Out-Null
} catch {}

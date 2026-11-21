<#
.SYNOPSIS
    Script de gestión y validación completa del backend de MusicShare.
.DESCRIPTION
    Permite iniciar Floci, aprovisionar infraestructura con Terraform, empaquetar lambdas,
    ejecutar pruebas unitarias, de integración, contrato y E2E, y sembrar datos.
.PARAMETER Action
    start, infra, test, seed, stop, clean, all
#>

param (
    [Parameter(Position=0)]
    [ValidateSet("start", "infra", "test", "seed", "stop", "clean", "all")]
    [string]$Action = "all"
)

# Evitar que advertencias de stderr en herramientas nativas (docker, terraform, pip) aborten el script
if (Test-Path variable:PSNativeCommandUseErrorActionPreference) {
    $PSNativeCommandUseErrorActionPreference = $false
}
$ErrorActionPreference = "Continue"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$BackendDir = Split-Path -Parent $ScriptDir
$RootDir = Split-Path -Parent $BackendDir
$InfraDir = Join-Path $BackendDir "infrastructure"
$DistDir = Join-Path $BackendDir "dist"
$LogFile = Join-Path $BackendDir "musicshare.log"

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
    param ([string]$CommandName)
    if (-not (Get-Command $CommandName -ErrorAction SilentlyContinue)) {
        Write-Fail "El comando requerido '$CommandName' no está instalado o no está en el PATH."
        exit 1
    }
}

function Invoke-DockerCompose {
    param ([string[]]$ComposeArgs)
    if (Get-Command "docker-compose" -ErrorAction SilentlyContinue) {
        & docker-compose $ComposeArgs
        return $LASTEXITCODE
    } elseif (Get-Command "docker" -ErrorAction SilentlyContinue) {
        & docker compose $ComposeArgs
        return $LASTEXITCODE
    } else {
        Write-Fail "Ni 'docker-compose' ni 'docker' fueron encontrados en el sistema."
        exit 1
    }
}

function Start-Floci {
    Write-Step "1. Verificando Docker e iniciando Floci"
    Check-Command "docker"

    # Verificar si el demonio de Docker está respondiendo
    $dockerInfo = docker info 2>$null
    if ($LASTEXITCODE -ne 0) {
        $desktopExe = "C:\Program Files\Docker\Docker\Docker Desktop.exe"
        if (Test-Path $desktopExe) {
            Write-Host "Iniciando Docker Desktop automáticamente..." -ForegroundColor Yellow
            Start-Process $desktopExe
            Write-Host "Esperando a que el motor de Docker esté listo (hasta 60s)..."
            $dockerReady = $false
            for ($i = 1; $i -le 30; $i++) {
                Start-Sleep -Seconds 2
                docker info 2>$null | Out-Null
                if ($LASTEXITCODE -eq 0) {
                    $dockerReady = $true
                    Write-Success "Motor de Docker iniciado y listo."
                    break
                }
                Write-Host "Esperando inicio de Docker... ($($i*2)s)"
            }
            if (-not $dockerReady) {
                Write-Fail "Tiempo de espera agotado para el inicio de Docker Desktop."
                Write-Host "Por favor verifica que Docker Desktop abra correctamente en tu barra de tareas y vuelve a ejecutar el comando." -ForegroundColor Yellow
                exit 1
            }
        } else {
            Write-Fail "Docker no está en ejecución o el demonio no responde."
            Write-Host "Asegúrate de tener Docker Desktop abierto y en estado 'Engine running'." -ForegroundColor Yellow
            exit 1
        }
    }

    $composeFile = Join-Path $BackendDir "docker-compose.yml"
    Invoke-DockerCompose @("-f", $composeFile, "up", "-d")
    if ($LASTEXITCODE -ne 0) {
        Write-Fail "Error al levantar contenedor Floci con docker-compose."
        exit $LASTEXITCODE
    }

    Write-Host "Esperando disponibilidad de Floci en localhost:4566..."
    python "$ScriptDir\wait_for_floci.py"
    if ($LASTEXITCODE -ne 0) {
        Write-Fail "Floci no respondió en el tiempo límite."
        exit $LASTEXITCODE
    }
    Write-Success "Floci iniciado y listo."
}

function Stop-Floci {
    Write-Step "Deteniendo contenedores Floci"
    $composeFile = Join-Path $BackendDir "docker-compose.yml"
    Invoke-DockerCompose @("-f", $composeFile, "down")
    Write-Success "Floci detenido."
}

function Install-Dependencies {
    Write-Step "Instalando dependencias de Python"
    $reqFile = Join-Path $BackendDir "requirements-dev.txt"
    if (Test-Path $reqFile) {
        python -m pip install -q -r $reqFile
        if ($LASTEXITCODE -ne 0) {
            Write-Host "Reintentando instalación con flag --user..." -ForegroundColor Yellow
            python -m pip install -q --user -r $reqFile
        }
    }

    # Instalar paquete backend en modo editable
    python -m pip install -q -e "$BackendDir"
    if ($LASTEXITCODE -ne 0) {
        python -m pip install -q --user -e "$BackendDir"
        if ($LASTEXITCODE -ne 0) {
            Write-Fail "Error al instalar dependencias de Python."
            exit $LASTEXITCODE
        }
    }
    Write-Success "Dependencias de Python listas."
}

function Package-Lambdas {
    Write-Step "Empaquetando funciones Lambda"
    python "$ScriptDir\package_lambdas.py"
    if ($LASTEXITCODE -ne 0) {
        Write-Fail "Error en el empaquetado de Lambdas."
        exit $LASTEXITCODE
    }
    Write-Success "Lambdas empaquetadas en $DistDir."
}

function Apply-Infra {
    Write-Step "Aprovisionando infraestructura con Terraform"
    Check-Command "terraform"

    Package-Lambdas

    Push-Location $InfraDir
    try {
        Write-Host "Terraform Init..."
        terraform init -input=false
        if ($LASTEXITCODE -ne 0) { throw "terraform init falló" }

        Write-Host "Terraform Validate..."
        terraform validate
        if ($LASTEXITCODE -ne 0) { throw "terraform validate falló" }

        Write-Host "Terraform Plan..."
        terraform plan -var-file="environments/local.tfvars" -out=tfplan -input=false
        if ($LASTEXITCODE -ne 0) { throw "terraform plan falló" }

        Write-Host "Terraform Apply..."
        terraform apply -input=false tfplan
        if ($LASTEXITCODE -ne 0) { throw "terraform apply falló" }

        # Sincronizar endpoint de API Gateway al archivo .env del frontend
        $apiId = (terraform output -raw api_id 2>$null)
        $invokeUrl = (terraform output -raw api_gateway_invoke_url 2>$null)
        if (-not $invokeUrl -and $apiId) {
            $invokeUrl = "http://localhost:4566/restapis/$apiId/local/_user_request_"
        }
        if ($invokeUrl) {
            $invokeUrl = $invokeUrl.Trim()
            $frontEnv = Join-Path $RootDir "frontend\.env"
            $envLines = @(
                "# Generado automáticamente por MusicShare",
                "VITE_USE_MOCKS=false",
                "VITE_API_BASE_URL=$invokeUrl",
                "VITE_S3_IMAGES_BASE_URL=http://localhost:4566/musicshare-instrument-images"
            )
            $envLines | Set-Content -Path $frontEnv -Force
            Write-Success "Frontend sincronizado con API Gateway en $frontEnv"
        }
    }
    finally {
        Pop-Location
    }
    Write-Success "Infraestructura aprovisionada exitosamente."
}

function Run-Tests {
    Write-Step "Ejecutando suite de pruebas con Pytest"
    Push-Location $BackendDir
    try {
        # Check linting if ruff is available
        if (Get-Command ruff -ErrorAction SilentlyContinue) {
            Write-Host "Ejecutando linter (ruff)..."
            ruff check .
            if ($LASTEXITCODE -ne 0) { throw "Fallo en verificación de lint con ruff" }
        }

        Write-Host "Ejecutando pruebas unitarias..."
        python -m pytest tests/unit -v --tb=short
        if ($LASTEXITCODE -ne 0) { throw "Fallaron las pruebas unitarias" }

        Write-Host "Ejecutando pruebas de contrato..."
        python -m pytest tests/contract -v --tb=short
        if ($LASTEXITCODE -ne 0) { throw "Fallaron las pruebas de contrato" }

        Write-Host "Ejecutando pruebas de integración..."
        python -m pytest tests/integration -v --tb=short
        if ($LASTEXITCODE -ne 0) { throw "Fallaron las pruebas de integración" }

        Write-Host "Ejecutando pruebas end-to-end..."
        python -m pytest tests/e2e -v --tb=short
        if ($LASTEXITCODE -ne 0) { throw "Fallaron las pruebas end-to-end" }
    }
    finally {
        Pop-Location
    }
    Write-Success "Todas las pruebas pasaron satisfactoriamente."
}

function Seed-Data {
    Write-Step "Cargando datos de prueba (Seed Data)"
    python "$ScriptDir\seed_data.py"
    if ($LASTEXITCODE -ne 0) {
        Write-Fail "Error durante la carga de datos."
        exit $LASTEXITCODE
    }
    Write-Success "Datos de prueba cargados correctamente."
}

function Clean-All {
    Write-Step "Limpieza de artefactos y contenedores"
    Stop-Floci
    if (Test-Path $DistDir) {
        Remove-Item -Recurse -Force $DistDir
    }
    $tfState = Join-Path $InfraDir "terraform.tfstate*"
    if (Test-Path $tfState) {
        Remove-Item -Force $tfState
    }
    $tfPlan = Join-Path $InfraDir "tfplan"
    if (Test-Path $tfPlan) {
        Remove-Item -Force $tfPlan
    }
    Write-Success "Limpieza completada."
}

# --- Router de acciones ---
switch ($Action) {
    "start" {
        Start-Floci
    }
    "infra" {
        Apply-Infra
    }
    "test" {
        Run-Tests
    }
    "seed" {
        Seed-Data
    }
    "stop" {
        Stop-Floci
    }
    "clean" {
        Clean-All
    }
    "all" {
        $startTime = Get-Date
        Write-Host ">>> Iniciando ejecución completa de MusicShare Backend..." -ForegroundColor Magenta

        Start-Floci
        Install-Dependencies
        Package-Lambdas
        Apply-Infra
        Seed-Data
        Run-Tests

        $elapsed = (Get-Date) - $startTime
        Write-Host "`n========================================================" -ForegroundColor Green
        Write-Host ">>> VALIDACIÓN COMPLETA EXITOSA (Tiempo: $($elapsed.TotalSeconds.ToString('F1'))s)" -ForegroundColor Green
        Write-Host ">>> El backend está listo y operando en Floci." -ForegroundColor Green
        Write-Host "========================================================`n" -ForegroundColor Green
    }
}

try {
    Stop-Transcript -ErrorAction SilentlyContinue | Out-Null
} catch {}

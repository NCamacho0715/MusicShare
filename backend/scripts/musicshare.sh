#!/usr/bin/env bash
set -euo pipefail

ACTION="${1:-all}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(dirname "$SCRIPT_DIR")"
INFRA_DIR="$BACKEND_DIR/infrastructure"
DIST_DIR="$BACKEND_DIR/dist"

write_step() {
  echo -e "\n\033[1;36m========================================================\033[0m"
  echo -e "\033[1;36m>>> $1\033[0m"
  echo -e "\033[1;36m========================================================\033[0m"
}

invoke_compose() {
  if command -v docker-compose &> /dev/null; then
    docker-compose "$@"
  else
    docker compose "$@"
  fi
}

start_floci() {
  write_step "1. Iniciando Floci con Docker Compose"
  invoke_compose -f "$BACKEND_DIR/docker-compose.yml" up -d
  python3 "$SCRIPT_DIR/wait_for_floci.py"
}

stop_floci() {
  write_step "Deteniendo Floci"
  invoke_compose -f "$BACKEND_DIR/docker-compose.yml" down
}

install_dependencies() {
  write_step "Instalando dependencias de Python"
  if [ -f "$BACKEND_DIR/requirements-dev.txt" ]; then
    python3 -m pip install -q -r "$BACKEND_DIR/requirements-dev.txt"
  fi
  python3 -m pip install -q -e "$BACKEND_DIR"
}

package_lambdas() {
  write_step "Empaquetando Lambdas"
  python3 "$SCRIPT_DIR/package_lambdas.py"
}

apply_infra() {
  write_step "Aprovisionando infraestructura con Terraform"
  package_lambdas
  cd "$INFRA_DIR"
  terraform init -input=false
  terraform validate
  terraform plan -var-file="environments/local.tfvars" -out=tfplan -input=false
  terraform apply -input=false tfplan
  cd "$BACKEND_DIR"
}

run_tests() {
  write_step "Ejecutando pruebas"
  cd "$BACKEND_DIR"
  if command -v ruff &> /dev/null; then
    ruff check .
  fi
  python3 -m pytest tests/unit -v --tb=short
  python3 -m pytest tests/contract -v --tb=short
  python3 -m pytest tests/integration -v --tb=short
  python3 -m pytest tests/e2e -v --tb=short
}

seed_data() {
  write_step "Cargando datos de prueba"
  python3 "$SCRIPT_DIR/seed_data.py"
}

clean_all() {
  write_step "Limpieza"
  stop_floci || true
  rm -rf "$DIST_DIR" "$INFRA_DIR/terraform.tfstate"* "$INFRA_DIR/tfplan"
}

case "$ACTION" in
  start)
    start_floci
    ;;
  infra)
    apply_infra
    ;;
  test)
    run_tests
    ;;
  seed)
    seed_data
    ;;
  stop)
    stop_floci
    ;;
  clean)
    clean_all
    ;;
  all)
    start_floci
    install_dependencies
    package_lambdas
    apply_infra
    seed_data
    run_tests
    echo -e "\n\033[1;32m>>> VALIDACIÓN COMPLETA EXITOSA\033[0m\n"
    ;;
  *)
    echo "Uso: $0 {start|infra|test|seed|stop|clean|all}"
    exit 1
    ;;
esac

#!/usr/bin/env bash
# Script maestro de MusicShare para Linux/macOS/WSL/Git Bash
set -euo pipefail

ACTION="${1:-all}"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"
INFRA_DIR="$BACKEND_DIR/infrastructure"
BACKEND_SCRIPT="$BACKEND_DIR/scripts/musicshare.sh"

write_step() {
  echo -e "\n\033[1;36m========================================================\033[0m"
  echo -e "\033[1;36m>>> $1\033[0m"
  echo -e "\033[1;36m========================================================\033[0m"
}

write_success() {
  echo -e "\033[1;32m[OK] $1\033[0m"
}

sync_frontend_config() {
  write_step "Sincronizando configuración Frontend con Backend"
  cd "$INFRA_DIR"
  INVOKE_URL="$(terraform output -raw api_gateway_invoke_url 2>/dev/null || echo "")"
  API_ID="$(terraform output -raw api_id 2>/dev/null || echo "")"
  if [ -z "$INVOKE_URL" ] && [ -n "$API_ID" ]; then
    INVOKE_URL="http://localhost:4566/restapis/$API_ID/local/_user_request_"
  fi
  if [ -z "$INVOKE_URL" ]; then
    INVOKE_URL="http://localhost:4566"
  fi

  cat <<EOF > "$FRONTEND_DIR/.env"
# Configuración generada automáticamente por MusicShare
VITE_USE_MOCKS=false
VITE_API_BASE_URL=$INVOKE_URL
VITE_S3_IMAGES_BASE_URL=http://localhost:4566/musicshare-instrument-images
EOF
  write_success "Frontend conectado a: $INVOKE_URL"
  cd "$ROOT_DIR"
}

install_frontend_deps() {
  write_step "Verificando dependencias npm del Frontend"
  if [ ! -d "$FRONTEND_DIR/node_modules" ]; then
    cd "$FRONTEND_DIR"
    npm install
    cd "$ROOT_DIR"
  fi
}

build_frontend() {
  write_step "Compilando Frontend (React + Vite + Tailwind)"
  install_frontend_deps
  cd "$FRONTEND_DIR"
  npm run typecheck
  npx vite build
  cd "$ROOT_DIR"
  write_success "Frontend compilado en frontend/dist"
}

run_all_tests() {
  write_step "Ejecutando Suite Completa de Pruebas (Backend + Frontend)"
  bash "$BACKEND_SCRIPT" test
  cd "$FRONTEND_DIR"
  npm run typecheck
  write_success "Typecheck del Frontend aprobado"
  cd "$ROOT_DIR"
}

start_dev() {
  write_step "Iniciando Entorno de Desarrollo MusicShare"
  bash "$BACKEND_SCRIPT" start
  bash "$BACKEND_SCRIPT" infra
  sync_frontend_config
  bash "$BACKEND_SCRIPT" seed
  install_frontend_deps

  echo -e "\n\033[1;32m========================================================\033[0m"
  echo -e "\033[1;32m>>> SERVICIOS LISTOS:\033[0m"
  echo -e "\033[1;32m    - Backend Floci:  http://localhost:4566\033[0m"
  echo -e "\033[1;32m    - Frontend URL:   http://localhost:5173\033[0m"
  echo -e "\033[1;32m========================================================\n\033[0m"

  cd "$FRONTEND_DIR"
  npm run dev
}

clean_project() {
  write_step "Limpieza integral del Proyecto"
  bash "$BACKEND_SCRIPT" clean
  rm -rf "$FRONTEND_DIR/dist"
  write_success "Proyecto limpio"
}

deploy_frontend_s3() {
  write_step "Desplegando Frontend al Bucket S3 (Static Website Hosting)"
  build_frontend
  python3 "$BACKEND_DIR/scripts/deploy_frontend_s3.py"
  write_success "Frontend desplegado y operativo en Amazon S3"
}

case "$ACTION" in
  start)
    bash "$BACKEND_SCRIPT" start
    ;;
  infra)
    bash "$BACKEND_SCRIPT" infra
    sync_frontend_config
    ;;
  seed)
    bash "$BACKEND_SCRIPT" seed
    ;;
  test)
    run_all_tests
    ;;
  build)
    bash "$BACKEND_SCRIPT" infra
    sync_frontend_config
    deploy_frontend_s3
    ;;
  s3)
    bash "$BACKEND_SCRIPT" infra
    sync_frontend_config
    deploy_frontend_s3
    ;;
  dev)
    start_dev
    ;;
  stop)
    bash "$BACKEND_SCRIPT" stop
    ;;
  clean)
    clean_project
    ;;
  all)
    bash "$BACKEND_SCRIPT" start
    install_frontend_deps
    bash "$BACKEND_SCRIPT" infra
    sync_frontend_config
    bash "$BACKEND_SCRIPT" seed
    run_all_tests
    deploy_frontend_s3
    echo -e "\n\033[1;32m========================================================\033[0m"
    echo -e "\033[1;32m>>> PROYECTO MUSICSHARE COMPLETAMENTE VALIDADO Y LISTO\033[0m"
    echo -e "\033[1;36m>>> Frontend en S3: http://localhost:4566/musicshare-frontend/index.html\033[0m"
    echo -e "\033[1;36m>>> Modo dev en vivo: ./musicshare.sh dev\033[0m"
    echo -e "\033[1;32m========================================================\n\033[0m"
    ;;
  *)
    echo "Uso: $0 {all|dev|start|infra|seed|test|build|s3|stop|clean}"
    exit 1
    ;;
esac

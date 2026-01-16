#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRONTEND_DIR="${SCRIPT_DIR}/../frontend"
STATIC_DIR="${SCRIPT_DIR}/staticfiles"

if [ -d "${FRONTEND_DIR}" ]; then
  echo "[INFO] Construindo frontend..."
  (
    cd "${FRONTEND_DIR}"
    npm install
    npm run build
  )

  echo "[INFO] Atualizando arquivos estáticos..."
  rm -rf "${STATIC_DIR}"
  mkdir -p "${STATIC_DIR}"
  cp -R "${FRONTEND_DIR}/dist/." "${STATIC_DIR}/"
else
  echo "[WARN] Diretório do frontend não encontrado: ${FRONTEND_DIR}"
fi

echo "[INFO] Gerando executável (Linux onedir)..."
pyinstaller --clean --noconfirm "${SCRIPT_DIR}/marmitaria_desktop_onedir.spec"

echo "[INFO] Build concluído. Verifique a pasta dist/Marmitaria."

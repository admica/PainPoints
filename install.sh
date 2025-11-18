#!/bin/bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WEB_DIR="${ROOT_DIR}/web"
ENV_FILE="${WEB_DIR}/.env"
ENV_EXAMPLE="${WEB_DIR}/.env.example"
SCHEMA_FILE="${WEB_DIR}/prisma/schema.prisma"
DEFAULT_DATABASE_URL="file:${WEB_DIR}/dev.db"
LMS_CLI_PATH="${HOME}/.lmstudio/bin/lms"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() { echo -e "${BLUE}[INFO]${NC} $1"; }
print_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
print_error() { echo -e "${RED}[ERROR]${NC} $1"; }

if [ ! -d "${WEB_DIR}" ]; then
  print_error "web/ directory not found from ${ROOT_DIR}. Run this script from repo root."
  exit 1
fi

print_status "Ensuring environment file exists..."
if [ ! -f "${ENV_FILE}" ]; then
  if [ -f "${ENV_EXAMPLE}" ]; then
    cp "${ENV_EXAMPLE}" "${ENV_FILE}"
    print_success "Created .env from .env.example"
  else
    print_error "Missing ${ENV_EXAMPLE}. Cannot proceed."
    exit 1
  fi
fi

print_status "Loading environment variables from ${ENV_FILE}"
set -a && source "${ENV_FILE}" && set +a

# Normalize DATABASE_URL: expand ~ and ensure absolute path
if [ -z "${DATABASE_URL:-}" ]; then
  print_warning "DATABASE_URL not set. Using default ${DEFAULT_DATABASE_URL}"
  DATABASE_URL="${DEFAULT_DATABASE_URL}"
else
  # Expand ~ in DATABASE_URL if present
  if [[ "${DATABASE_URL}" == *"~"* ]]; then
    print_status "Expanding ~ in DATABASE_URL to absolute path"
    DATABASE_URL="${DATABASE_URL//\~/${HOME}}"
  fi
  # If it's a file: URL, ensure the path part is absolute
  if [[ "${DATABASE_URL}" =~ ^file:(.*)$ ]]; then
    DB_PATH="${BASH_REMATCH[1]}"
    # Expand ~ if still present
    if [[ "${DB_PATH}" == *"~"* ]]; then
      DB_PATH="${DB_PATH//\~/${HOME}}"
    fi
    # Convert to absolute path if relative
    if [[ ! "${DB_PATH}" = /* ]]; then
      DB_PATH="$(cd "$(dirname "${DB_PATH}")" && pwd)/$(basename "${DB_PATH}")"
    fi
    DATABASE_URL="file:${DB_PATH}"
  fi
fi

# Update .env file with normalized DATABASE_URL
if grep -q '^DATABASE_URL=' "${ENV_FILE}"; then
  sed -i.bak "s|^DATABASE_URL=.*|DATABASE_URL=\"${DATABASE_URL}\"|" "${ENV_FILE}"
else
  printf '\nDATABASE_URL="%s"\n' "${DATABASE_URL}" >>"${ENV_FILE}"
fi
print_status "Using DATABASE_URL: ${DATABASE_URL}"

print_status "Installing npm dependencies in web/"
npm --prefix "${WEB_DIR}" install

print_status "Running Prisma migrations"
DATABASE_URL="${DATABASE_URL}" npx prisma migrate dev --schema "${SCHEMA_FILE}"

print_status "Generating Prisma Client"
DATABASE_URL="${DATABASE_URL}" npx prisma generate --schema "${SCHEMA_FILE}"

print_status "Checking LM Studio AppImage and CLI"
LM_STUDIO_DIR="${LM_STUDIO_DIR:-"${HOME}/Downloads"}"
LM_STUDIO_APPIMAGE_NAME="${LM_STUDIO_APPIMAGE_NAME:-}" 
APPIMAGE_PATH=""
if [ -n "${LM_STUDIO_APPIMAGE_NAME}" ]; then
  APPIMAGE_PATH="${LM_STUDIO_DIR}/${LM_STUDIO_APPIMAGE_NAME}"
else
  APPIMAGE_PATH=$(find "${LM_STUDIO_DIR}" -maxdepth 1 -name 'LM-Studio-*.appimage' -type f -print -quit || true)
fi
if [ -n "${APPIMAGE_PATH}" ] && [ -f "${APPIMAGE_PATH}" ]; then
  print_success "LM Studio AppImage found at ${APPIMAGE_PATH}"
else
  print_warning "LM Studio AppImage not found. Update LM_STUDIO_DIR/LM_STUDIO_APPIMAGE_NAME in .env"
fi

if [ -x "${LMS_CLI_PATH}" ]; then
  print_success "LM Studio CLI found at ${LMS_CLI_PATH}"
else
  print_warning "LM Studio CLI not found at ${LMS_CLI_PATH}. Some automation may not work."
fi

print_success "Install complete. Run ./start.sh to launch services."

#!/bin/bash

# PainPoints Startup Script
# This script starts LM Studio in headless mode and the Next.js app server

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
  echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
  echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
  echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
  echo -e "${RED}[ERROR]${NC} $1"
}

echo "Starting PainPoints services..."

# Check if we're in the right directory
if [ ! -d "web" ]; then
  print_error "Not in the correct directory. Please run this script from the painPoints project root."
  exit 1
fi

# Get the absolute path of the script
SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
PROJECT_ROOT="$SCRIPT_DIR"
# Path to the lms CLI tool
LMS_CLI_PATH="${HOME}/.lmstudio/bin/lms"

# Load environment variables from web/.env if present
ENV_FILE="${PROJECT_ROOT}/web/.env"
ENV_EXAMPLE="${PROJECT_ROOT}/web/.env.example"
if [ ! -f "$ENV_FILE" ] && [ -f "$ENV_EXAMPLE" ]; then
  print_warning "Environment file ${ENV_FILE} not found. Copying from .env.example."
  cp "$ENV_EXAMPLE" "$ENV_FILE"
fi

if [ -f "$ENV_FILE" ]; then
  print_status "Loading environment variables from ${ENV_FILE}"
  # shellcheck disable=SC1090
  set -a && source "$ENV_FILE" && set +a
else
  print_warning "Environment file ${ENV_FILE} not found. Using built-in defaults."
fi

# Provide defaults if not set
: "${LM_STUDIO_PORT:=1234}"
: "${NEXTJS_PORT:=3000}"
: "${MODEL_CONTEXT_LENGTH:=50000}"
: "${MODEL_TO_LOAD:=}"
: "${LM_STUDIO_APPIMAGE_NAME:=}"
: "${LM_STUDIO_DIR:=${HOME}/Downloads}"
: "${LLM_MODEL:=}"
: "${NEXTJS_MODE:=prod}"  # Default to production mode

# Auto-detect AppImage if name is not set
if [ -z "$LM_STUDIO_APPIMAGE_NAME" ]; then
  print_status "LM_STUDIO_APPIMAGE_NAME is not set. Searching for LM Studio AppImage in $LM_STUDIO_DIR..."
  # Find the first file matching the pattern
  LM_STUDIO_APPIMAGE_NAME=$(find "$LM_STUDIO_DIR" -name "LM-Studio-*.appimage" -type f -print -quit)
  if [ -n "$LM_STUDIO_APPIMAGE_NAME" ]; then
    # Extract just the filename from the full path
    LM_STUDIO_APPIMAGE_NAME=$(basename "$LM_STUDIO_APPIMAGE_NAME")
    print_success "Found AppImage: $LM_STUDIO_APPIMAGE_NAME"
  else
    print_error "Could not find any LM-Studio-*.appimage file in $LM_STUDIO_DIR"
    print_error "Please specify the exact name in the LM_STUDIO_APPIMAGE_NAME variable in this script."
    exit 1
  fi
fi

# Check if LM Studio AppImage exists
LM_STUDIO_PATH="${LM_STUDIO_DIR}/${LM_STUDIO_APPIMAGE_NAME}"
if [ ! -f "$LM_STUDIO_PATH" ]; then
  print_error "LM Studio AppImage not found at $LM_STUDIO_PATH"
  print_error "Please ensure LM Studio is downloaded to the correct folder and the script variables are set."
  exit 1
fi

# Start LM Studio in headless mode
print_status "Starting LM Studio in headless mode..."
cd "$LM_STUDIO_DIR" || exit
./"$LM_STUDIO_APPIMAGE_NAME" --hidden --disable-gpu --no-sandbox >/dev/null 2>&1 &
LM_STUDIO_PID=$!

# Wait for LM Studio to initialize
print_status "Waiting for LM Studio to initialize..."
sleep 10

# Check if LM Studio is running
if kill -0 $LM_STUDIO_PID 2>/dev/null; then
  print_success "LM Studio started successfully (PID: $LM_STUDIO_PID)"
fi

# Determine model to load (prefer LLM_MODEL)
MODEL_TO_LOAD="$LLM_MODEL"

if [ -n "$MODEL_TO_LOAD" ]; then
  print_status "Attempting to load specified model: $MODEL_TO_LOAD..."
else
  print_status "LLM_MODEL is not set. Finding the last model in the list..."
  if [ -f "$LMS_CLI_PATH" ]; then
    MODEL_TO_LOAD=$("$LMS_CLI_PATH" ls | grep -v '^$' | awk '/^LLM/,/^EMBEDDING/' | sed '1d;$d' | tail -n 1 | awk '{print $1}')
    if [ -n "$MODEL_TO_LOAD" ]; then
      print_success "Found last model: $MODEL_TO_LOAD"
      LLM_MODEL="$MODEL_TO_LOAD"
      if [ -w "$ENV_FILE" ]; then
        print_status "Updating LLM_MODEL in ${ENV_FILE}"
        if grep -q "^LLM_MODEL=" "$ENV_FILE"; then
          sed -i.bak "s|^LLM_MODEL=.*|LLM_MODEL=\"$LLM_MODEL\"|" "$ENV_FILE"
        else
          echo "LLM_MODEL=\"$LLM_MODEL\"" >>"$ENV_FILE"
        fi
      else
        print_warning "Cannot update ${ENV_FILE}; file not writable."
      fi
    else
      print_error "Could not find any models to load."
    fi
  else
    print_warning "lms CLI not found at $LMS_CLI_PATH. Cannot load model."
  fi
fi

if [ -n "$MODEL_TO_LOAD" ]; then
  print_status "Checking if model '$MODEL_TO_LOAD' is available..."
  if [ -f "$LMS_CLI_PATH" ]; then
    if "$LMS_CLI_PATH" ls | grep -q "$MODEL_TO_LOAD"; then
      print_success "Model '$MODEL_TO_LOAD' is available. Loading..."

      # Build the load command with optional context length
      LOAD_OPTS=("--gpu" "max")
      if [ -n "$MODEL_CONTEXT_LENGTH" ]; then
        print_status "Using custom context length: $MODEL_CONTEXT_LENGTH"
        LOAD_OPTS+=("--context-length" "$MODEL_CONTEXT_LENGTH")
      fi

      "$LMS_CLI_PATH" load "$MODEL_TO_LOAD" "${LOAD_OPTS[@]}"

      if [ $? -eq 0 ]; then
        print_success "Model '$MODEL_TO_LOAD' loaded successfully."
      else
        print_error "Failed to load model '$MODEL_TO_LOAD'."
      fi
    else
      print_error "Model '$MODEL_TO_LOAD' is not available. Please check the model name."
    fi
  else
    print_warning "lms CLI not found at $LMS_CLI_PATH. Cannot load model."
  fi
fi

# Test LM Studio API
print_status "Testing LM Studio API..."
if curl -s "http://localhost:${LM_STUDIO_PORT}/v1/models" >/dev/null 2>&1; then
  print_success "LM Studio API is responding on port ${LM_STUDIO_PORT}"
else
  print_warning "LM Studio API not responding yet, but continuing..."
fi

# Start the Next.js app server
if [ "$NEXTJS_MODE" = "prod" ]; then
  print_status "Starting Next.js in PRODUCTION mode..."
  cd "${PROJECT_ROOT}" || exit

  # Check if node_modules exists
  if [ ! -d "web/node_modules" ]; then
    print_warning "node_modules not found. Installing dependencies..."
    npm --prefix web install
  fi

  # Build the app for production
  print_status "Building Next.js application for production..."
  if npm --prefix web run build >nextjs-build.log 2>&1; then
    print_success "Production build completed successfully"
  else
    print_error "Production build failed. Check nextjs-build.log for details."
    exit 1
  fi

  # Start the production server
  print_status "Starting Next.js production server..."
  npm --prefix web run start >nextjs.log 2>&1 &
  NEXTJS_PID=$!
else
  print_status "Starting Next.js in DEVELOPMENT mode..."
  cd "${PROJECT_ROOT}" || exit

  # Remove lock file to prevent startup errors
  if [ -f "web/.next/dev/lock" ]; then
    print_warning "Removing stale Next.js lock file."
    rm web/.next/dev/lock
  fi

  # Check if node_modules exists
  if [ ! -d "web/node_modules" ]; then
    print_warning "node_modules not found. Installing dependencies..."
    npm --prefix web install
  fi

  # Start the dev server
  npm --prefix web run dev >nextjs.log 2>&1 &
  NEXTJS_PID=$!
fi

# Wait for Next.js to start
print_status "Waiting for Next.js server to start..."
sleep 5

# Check if Next.js is running
if kill -0 $NEXTJS_PID 2>/dev/null; then
  print_success "Next.js development server started successfully (PID: $NEXTJS_PID)"
else
  print_error "Failed to start Next.js development server"
  print_status "Check nextjs.log for error details"
fi

# Test Next.js server
print_status "Testing Next.js server..."
if curl -s "http://localhost:${NEXTJS_PORT}" >/dev/null 2>&1; then
  print_success "Next.js server is responding on port ${NEXTJS_PORT}"
else
  print_warning "Next.js server not responding yet, but continuing..."
fi

print_success "All services started!"
echo ""
echo "Services running:"
echo "  - LM Studio API: http://localhost:${LM_STUDIO_PORT}"
echo "  - Next.js App:   http://localhost:${NEXTJS_PORT}"
echo ""
echo "To stop services, run: ./stop.sh"
echo "Or manually kill processes:"
echo "  LM Studio: kill $LM_STUDIO_PID"
echo "  Next.js:   kill $NEXTJS_PID"

# Keep PIDs for potential stop script
PID_DIR="${PROJECT_ROOT}/.pids"
mkdir -p "$PID_DIR"
echo "$LM_STUDIO_PID" >"${PID_DIR}/painpoints_lmstudio.pid"
echo "$NEXTJS_PID" >"${PID_DIR}/painpoints_nextjs.pid"

#!/bin/bash

# PainPoints Status Script
# This script checks the status of the services started by start.sh

### --- Configurable variables -- ###

# Network Ports
LM_STUDIO_PORT="1234"
NEXTJS_PORT="3000"

### --- You should not need to edit below this line --- ###

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

print_error() {
  echo -e "${RED}[ERROR]${NC} $1"
}

# Get the absolute path of the script
SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
PROJECT_ROOT="$SCRIPT_DIR"
PID_DIR="${PROJECT_ROOT}/.pids"

LM_STUDIO_PID_FILE="${PID_DIR}/painpoints_lmstudio.pid"
NEXTJS_PID_FILE="${PID_DIR}/painpoints_nextjs.pid"

echo "Checking PainPoints services status..."
echo ""

# --- Check LM Studio ---
print_status "Checking LM Studio..."
if [ -f "$LM_STUDIO_PID_FILE" ]; then
  LM_STUDIO_PID=$(cat "$LM_STUDIO_PID_FILE")
  if kill -0 "$LM_STUDIO_PID" >/dev/null 2>&1; then
    print_success "  - Process is RUNNING (PID: $LM_STUDIO_PID)"
    
    # Check API and loaded model
    if curl -s "http://localhost:${LM_STUDIO_PORT}/v1/models" >/dev/null 2>&1; then
      print_success "  - API is RESPONDING on http://localhost:${LM_STUDIO_PORT}"
      
      # Check for loaded model
      if command -v jq >/dev/null 2>&1; then
        MODEL_ID=$(curl -s "http://localhost:${LM_STUDIO_PORT}/v1/models" | jq -r '.data[0].id')
        if [ -n "$MODEL_ID" ] && [ "$MODEL_ID" != "null" ]; then
          print_success "  - Loaded Model: $MODEL_ID"
        else
          print_error "  - No model appears to be loaded."
        fi
      else
        # Fallback if jq is not installed
        MODEL_ID=$(curl -s "http://localhost:${LM_STUDIO_PORT}/v1/models" | grep -o '"id": *"[^"]*"' | head -n 1 | cut -d '"' -f 4)
        if [ -n "$MODEL_ID" ]; then
          print_success "  - Loaded Model: $MODEL_ID"
        else
          print_error "  - No model appears to be loaded. (jq not installed, could not parse reliably)"
        fi
      fi
    else
      print_error "  - API is NOT RESPONDING on http://localhost:${LM_STUDIO_PORT}"
    fi
  else
    print_error "  - Process is NOT RUNNING (stale PID file found)"
  fi
else
  print_error "  - Process is NOT RUNNING (no PID file found)"
fi
echo ""

# --- Check Next.js ---
print_status "Checking Next.js development server..."
if [ -f "$NEXTJS_PID_FILE" ]; then
  NEXTJS_PID=$(cat "$NEXTJS_PID_FILE")
  if kill -0 "$NEXTJS_PID" >/dev/null 2>&1; then
    print_success "  - Process is RUNNING (PID: $NEXTJS_PID)"
    
    # Check server
    if curl -s "http://localhost:${NEXTJS_PORT}" >/dev/null 2>&1; then
      print_success "  - Server is RESPONDING on http://localhost:${NEXTJS_PORT}"
    else
      print_error "  - Server is NOT RESPONDING on http://localhost:${NEXTJS_PORT}"
    fi
  else
    print_error "  - Process is NOT RUNNING (stale PID file found)"
  fi
else
  print_error "  - Process is NOT RUNNING (no PID file found)"
fi
echo ""

print_status "Status check complete."
#!/bin/bash

# PainPoints Stop Script
# This script stops LM Studio and the Next.js app server

echo "Stopping PainPoints services..."

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

# Read PIDs from temp files
SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
PROJECT_ROOT="$SCRIPT_DIR"
PID_DIR="${PROJECT_ROOT}/.pids"
LM_STUDIO_PID_FILE="${PID_DIR}/painpoints_lmstudio.pid"
NEXTJS_PID_FILE="${PID_DIR}/painpoints_nextjs.pid"

# Stop LM Studio
if [ -f "$LM_STUDIO_PID_FILE" ]; then
  LM_STUDIO_PID=$(cat "$LM_STUDIO_PID_FILE")
  if kill -0 "$LM_STUDIO_PID" 2>/dev/null; then
    print_status "Stopping LM Studio (PID: $LM_STUDIO_PID)..."
    kill "$LM_STUDIO_PID" 2>/dev/null
    # Wait a bit for graceful shutdown
    sleep 2
    # Force kill if still running
    if kill -0 "$LM_STUDIO_PID" 2>/dev/null; then
      kill -9 "$LM_STUDIO_PID" 2>/dev/null
      print_warning "Force killed LM Studio"
    else
      print_success "LM Studio stopped successfully"
    fi
    rm -f "$LM_STUDIO_PID_FILE"
  else
    print_warning "LM Studio process not found (PID: $LM_STUDIO_PID)"
    rm -f "$LM_STUDIO_PID_FILE"
  fi
else
  print_warning "LM Studio PID file not found. Process may not be running."
fi

# Stop Next.js
if [ -f "$NEXTJS_PID_FILE" ]; then
  NEXTJS_PID=$(cat "$NEXTJS_PID_FILE")
  if kill -0 "$NEXTJS_PID" 2>/dev/null; then
    print_status "Stopping Next.js server (PID: $NEXTJS_PID)..."
    kill "$NEXTJS_PID" 2>/dev/null
    # Wait a bit for graceful shutdown
    sleep 2
    # Force kill if still running
    if kill -0 "$NEXTJS_PID" 2>/dev/null; then
      kill -9 "$NEXTJS_PID" 2>/dev/null
      print_warning "Force killed Next.js server"
    else
      print_success "Next.js server stopped successfully"
    fi
    rm -f "$NEXTJS_PID_FILE"
  else
    print_warning "Next.js process not found (PID: $NEXTJS_PID)"
    rm -f "$NEXTJS_PID_FILE"
  fi
else
  print_warning "Next.js PID file not found. Process may not be running."
fi

# Alternative: Try to find and kill processes by name/port if PID files don't exist
if ! [ -f "$LM_STUDIO_PID_FILE" ] && ! [ -f "$NEXTJS_PID_FILE" ]; then
  print_status "Attempting to find processes by port..."

  # Find process on port 1234 (LM Studio)
  LM_PORT_PID=$(lsof -ti:1234 2>/dev/null)
  if [ -n "$LM_PORT_PID" ]; then
    print_status "Found process on port 1234 (PID: $LM_PORT_PID), stopping..."
    kill "$LM_PORT_PID" 2>/dev/null
    print_success "Stopped process on port 1234"
  fi

  # Find process on port 3000 (Next.js)
  NEXTJS_PORT_PID=$(lsof -ti:3000 2>/dev/null)
  if [ -n "$NEXTJS_PORT_PID" ]; then
    print_status "Found process on port 3000 (PID: $NEXTJS_PORT_PID), stopping..."
    kill "$NEXTJS_PORT_PID" 2>/dev/null
    print_success "Stopped process on port 3000"
  fi
fi

print_success "All services stopped!"
echo ""

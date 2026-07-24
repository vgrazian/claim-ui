#!/bin/bash
# Claim UI — double-clickable macOS launcher
# Starts the Express API server + Vite dev server, then opens the browser

cd "$(dirname "$0")"

# ---- cleanup on exit ----
cleanup() {
    echo ""
    echo "Shutting down Claim UI..."
    [[ -n "$CONCURRENTLY_PID" ]] && kill -TERM "$CONCURRENTLY_PID" 2>/dev/null
    wait "$CONCURRENTLY_PID" 2>/dev/null
    lsof -ti:3001 | xargs kill -9 2>/dev/null
    lsof -ti:5173 | xargs kill -9 2>/dev/null
    echo "Claim UI stopped."
    exit 0
}
trap cleanup SIGINT SIGTERM SIGHUP EXIT

echo "Starting Claim UI..."
echo ""

# Start both servers concurrently in the background
npx concurrently \
  --names "API,WEB" \
  --prefix-colors "cyan,green" \
  "node server/index.mjs" \
  "npx vite --host" &
CONCURRENTLY_PID=$!

# Wait for Vite to be ready, then open the browser
VITE_URL="http://localhost:5173"
for i in $(seq 1 30); do
  if curl -s -o /dev/null -w "%{http_code}" "$VITE_URL" 2>/dev/null | grep -q "200\|302\|304"; then
    echo ""
    echo "✓ Claim UI ready at $VITE_URL"
    open "$VITE_URL"
    break
  fi
  sleep 1
done

# Keep the terminal open and handle Ctrl+C gracefully
echo ""
echo "Claim UI is running. Press Ctrl+C to stop."
echo ""
wait "$CONCURRENTLY_PID"

#!/bin/bash
# Claim UI — double-clickable macOS launcher (production mode)
# Builds the frontend if needed, then starts Express server + opens browser

cd "$(dirname "$0")"

# ---- cleanup on exit ----
cleanup() {
    echo ""
    echo "Shutting down Claim UI..."
    [[ -n "$SERVER_PID" ]] && kill "$SERVER_PID" 2>/dev/null
    wait "$SERVER_PID" 2>/dev/null
    echo "Claim UI stopped."
    exit 0
}
trap cleanup SIGINT SIGTERM SIGHUP EXIT

echo "Starting Claim UI..."
echo ""

# ---- kill any existing server on our port ----
lsof -ti:3001 | xargs kill -9 2>/dev/null
sleep 0.5

# ---- ensure dist/ is built ----
if [[ ! -f dist/index.html ]] || [[ src -nt dist/index.html ]]; then
    echo "Building frontend..."
    npx vite build
fi

# ---- start Express server (serves dist/ on port 3001) ----
PORT=3001
URL="http://127.0.0.1:${PORT}"

node server/index.mjs &
SERVER_PID=$!

# Wait for server, then open browser
for i in $(seq 1 30); do
    if curl -s -o /dev/null -w "%{http_code}" "$URL/api/health" 2>/dev/null | grep -q "200"; then
        echo ""
        echo "✓ Claim UI ready at $URL"
        open "$URL"
        break
    fi
    sleep 1
done

# Keep the terminal open and handle Ctrl+C gracefully
echo ""
echo "Claim UI is running. Press Ctrl+C to stop."
echo ""
wait "$SERVER_PID"

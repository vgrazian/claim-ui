#!/bin/bash
# Update the Claim UI.app bundle in /Applications
# Run this after making code changes to refresh the app

set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
APP_PATH="/Applications/Claim UI.app"
NODE="/opt/homebrew/bin/node"

echo "🔨 Building Claim UI..."
cd "$PROJECT_DIR"
npx vite build

echo ""
echo "📦 Updating app bundle at $APP_PATH..."

# Ensure app bundle structure exists
mkdir -p "$APP_PATH/Contents/MacOS"
mkdir -p "$APP_PATH/Contents/Resources"

# Copy icon if available
if [[ -f "$PROJECT_DIR/ClaimUI.icns" ]]; then
    cp "$PROJECT_DIR/ClaimUI.icns" "$APP_PATH/Contents/Resources/AppIcon.icns"
    echo "  ✓ Icon updated"
fi

# Write Info.plist
cat > "$APP_PATH/Contents/Info.plist" << 'PLIST'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleExecutable</key>
    <string>Claim UI</string>
    <key>CFBundleIdentifier</key>
    <string>com.vgrazian.claim-ui</string>
    <key>CFBundleName</key>
    <string>Claim UI</string>
    <key>CFBundleVersion</key>
    <string>0.1.0</string>
    <key>CFBundleShortVersionString</key>
    <string>0.1.0</string>
    <key>CFBundlePackageType</key>
    <string>APPL</string>
    <key>LSMinimumSystemVersion</key>
    <string>13.0</string>
    <key>CFBundleIconFile</key>
    <string>AppIcon</string>
    <key>LSUIElement</key>
    <false/>
</dict>
</plist>
PLIST
echo "  ✓ Info.plist updated"

# Write launch script
cat > "$APP_PATH/Contents/MacOS/Claim UI" << LAUNCHER
#!/bin/bash
# Claim UI Launcher — production mode
NODE="$NODE"
PROJECT_DIR="$PROJECT_DIR"
PORT=3001
URL="http://localhost:\${PORT}"

cd "\$PROJECT_DIR" || exit 1

# ---- if server already running, just re-open browser and exit ----
if curl -s -o /dev/null -w "%{http_code}" "\$URL/api/health" 2>/dev/null | grep -q "200"; then
    open "\$URL"
    exit 0
fi

# ---- kill any stale process on our port ----
lsof -ti:\${PORT} | xargs kill -9 2>/dev/null
sleep 0.5

# ---- cleanup on exit ----
cleanup() {
    echo ""
    echo "Shutting down Claim UI..."
    [[ -n "\$SERVER_PID" ]] && kill "\$SERVER_PID" 2>/dev/null
    wait "\$SERVER_PID" 2>/dev/null
    echo "Claim UI stopped."
    exit 0
}
trap cleanup SIGINT SIGTERM SIGHUP EXIT

# ---- start Express server (serves dist/ on port 3001) ----
"\$NODE" server/index.mjs &
SERVER_PID=\$!

# ---- wait for server, then open browser ----
for i in \$(seq 1 30); do
    if curl -s -o /dev/null -w "%{http_code}" "\$URL/api/health" 2>/dev/null | grep -q "200"; then
        open "\$URL"
        break
    fi
    sleep 1
done

# ---- keep alive until server exits (poll, don't block) ----
while kill -0 "\$SERVER_PID" 2>/dev/null; do
    sleep 2
done
LAUNCHER
chmod +x "$APP_PATH/Contents/MacOS/Claim UI"
echo "  ✓ Launch script updated"

# Set custom icon if set-mac-icon.py available
if [[ -f "$SCRIPT_DIR/set-mac-icon.py" ]] && [[ -f "$PROJECT_DIR/ClaimUI.icns" ]]; then
    python3 "$SCRIPT_DIR/set-mac-icon.py" "$APP_PATH" "$PROJECT_DIR/ClaimUI.icns" 2>/dev/null || true
    echo "  ✓ Custom icon set"
fi

# Touch to refresh Finder
touch "$APP_PATH"
echo ""
echo "✅ Claim UI.app updated successfully!"
echo "   You can now launch it from /Applications or Spotlight."

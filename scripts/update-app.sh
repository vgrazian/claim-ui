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

echo "🔨 Compiling native launcher..."
swiftc "$SCRIPT_DIR/launcher.swift" -o "$SCRIPT_DIR/ClaimUILauncher" -O

echo ""
echo "📦 Updating app bundle at $APP_PATH..."

# Ensure app bundle structure exists
mkdir -p "$APP_PATH/Contents/MacOS"
mkdir -p "$APP_PATH/Contents/Resources"

# Copy native launcher binary
cp "$SCRIPT_DIR/ClaimUILauncher" "$APP_PATH/Contents/MacOS/Claim UI"
chmod +x "$APP_PATH/Contents/MacOS/Claim UI"
echo "  ✓ Native launcher installed"

# Copy icon if available
if [[ -f "$PROJECT_DIR/ClaimUI.icns" ]]; then
    cp "$PROJECT_DIR/ClaimUI.icns" "$APP_PATH/Contents/Resources/AppIcon.icns"
    echo "  ✓ Icon updated"
fi

# Write Info.plist (native app — no shell script needed)
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
    <key>NSHighResolutionCapable</key>
    <true/>
    <key>NSPrincipalClass</key>
    <string>NSApplication</string>
</dict>
</plist>
PLIST
echo "  ✓ Info.plist updated"
# Ad-hoc sign the app bundle (required by macOS Taskgated)
codesign --force --deep --sign - "$APP_PATH" 2>/dev/null
echo "  ✓ Code signed"
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

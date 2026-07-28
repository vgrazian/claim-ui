# Claim UI

Web-based [Monday.com](https://monday.com) claim management tool with **IBM Carbon Design System**. A browser-based alternative to the [claim TUI](https://github.com/vgrazian/claim) with the same features plus a settings panel.

## Features

- **Calendar view** — Week and month views with drag-free navigation
- **Add/Edit/Delete** — Entry form with quick-select, autocomplete, and one-click presets (Vacation, L.104, Holiday)
- **Report** — Pivot table with daily columns, customer/work-item/opportunity breakdown, totals footer, copy-to-clipboard
- **Presales** — Opportunity tracking grouped by comment, >24h error flags, sorted by most recent
- **Settings** — API key management, user name/email, language (EN/IT), dark theme, weekend defaults
- **Keyboard shortcuts** — `←`/`→` navigate, `a` add, `t` today
- **i18n** — English and Italian, auto-detected from browser settings
- **L.104 & Vacation tracking** — Monthly totals shown in the summary bar

## Quick Start

```bash
git clone https://github.com/vgrazian/claim-ui.git
cd claim-ui
npm install
npm run build
npm run launch
```

`npm run launch` starts the server and opens the app in your default browser.

### macOS App Bundle

A native-feeling `.app` bundle is provided for macOS. Build it with:

```bash
npm run update-app
```

This creates (or updates) `Claim UI.app` in `/Applications`. You can then launch it from **Finder**, **Spotlight**, or the **Dock** — it starts the Express server and opens your browser automatically. The launch script uses absolute paths so it works regardless of shell PATH.

The `Claim UI.command` file in the project root is an alternative double-clickable launcher that opens a Terminal window with visible output.

## Requirements

- **Node.js** 18+
- A Monday.com [API key](https://support.monday.com/hc/en-us/articles/360005144659-API-tokens) configured via the [claim TUI](https://github.com/vgrazian/claim) or placed in the config file (see below).

## Config File

The app reads the API key from the same config file used by the `claim` TUI:

| Platform | Config Path |
| --- | --- |
| **macOS** | `~/Library/Application Support/com.vgrazian.claim/config.json` |
| **Linux** | `~/.config/com.vgrazian.claim/config.json` |
| **Windows** | `%APPDATA%\com.vgrazian.claim\config.json` |

Format:

```json
{
  "api_key": "your-monday-api-key"
}
```

The easiest way to set this up is to run `claim` TUI once — it prompts for the key on first launch.

## Development

```bash
npm install
npm run dev        # Backend on :3001, frontend on :5173 (with HMR)
npm test           # 43 tests across 6 test files
```

### Project Structure

```
claim-ui/
├── server/index.mjs      # Express backend (config, GraphQL proxy, static serve)
├── src/
│   ├── pages/            # Calendar, Report, Presales, Settings
│   ├── components/       # EntryFormModal, ErrorBoundary, ApiKeySetup
│   ├── hooks/            # useData, useEntryForm
│   ├── services/         # API client, claims logic
│   ├── context/          # SettingsContext
│   ├── i18n/locales/     # en.json, it.json
│   └── __tests__/        # 43 tests
├── scripts/
│   ├── update-app.sh     # Build + refresh macOS .app bundle
│   ├── generate-icons.py # Generate PWA icon sizes
│   └── set-mac-icon.py   # Set custom icon on macOS bundle
├── Claim UI.command      # macOS double-clickable launcher (Terminal)
├── launcher.js           # Cross-platform launcher
└── vite.config.ts        # Vite + proxy config
```

### Tech Stack

- **Frontend**: React 18, Vite, IBM Carbon Design System (`@carbon/react`)
- **Backend**: Express.js (GraphQL proxy to Monday.com API)
- **i18n**: i18next with browser language detection
- **Testing**: Vitest + React Testing Library

## Security

- The API key is never stored in the repository or bundled in the frontend
- All Monday.com API calls are proxied through the local Express backend
- The key is read from the OS-native config directory (same file used by the claim TUI)
- The Settings page shows "OK" — the key itself is never exposed in the UI

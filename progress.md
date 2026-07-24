# Claim UI — Progress Log

**Last updated:** 2026-07-24  
**Repo:** <https://github.com/vgrazian/claim-ui>  
**Tests:** 43 passing, 6 test files, 0 failures  

---

## Completed Features

### Views

- [x] **Calendar** — Week/month views with grid/list toggle, weekend hide/show, quick date picker
- [x] **Report** — Pivot table with daily columns, customer/work-item/opp breakdown, totals footer, month view
- [x] **Presales** — Opportunity list grouped by comment, sorted by most recent, >24h error flag, search/filter
- [x] **Settings** — Language (EN/IT), API key management, user name/email, dark theme, weekend defaults

### Data & API

- [x] Monday.com GraphQL proxy through Express backend
- [x] User filtering via `person` column (matches TUI behavior)
- [x] Activity type mapping (vacation=0, billable=1 — matches TUI)
- [x] Comment column: `text2__1` / `long_text`
- [x] Cross-platform config paths (macOS/Linux/Windows)

### UX

- [x] IBM Carbon Design System (`@carbon/react`)
- [x] Keyboard shortcuts: ←/→ nav, a=add, t=today
- [x] Quick-select pills + autocomplete in entry form
- [x] Quick-action buttons: Vacation, L.104, Holiday
- [x] Auto-fill M.00556 for vacation/l104/work_reduction
- [x] L.104 monthly total + vacation hours in summary bar
- [x] Dark theme wired to Carbon (g10/g100)
- [x] Error boundary with reload button
- [x] Entries show comments below activity/customer/hours

### Deployment

- [x] PWA: manifest.json + service worker + install prompt
- [x] Cross-platform launcher (`npm run launch`)
- [x] README with full deployment instructions

---

## Future Ideas

- [ ] Bulk delete from report (checkbox + action)
- [ ] Month navigation presets (jump to specific month)
- [ ] Export report to CSV/PDF
- [ ] Multiple year groups in presales
- [ ] Notification when L.104 limit approached
- [ ] Electron/Tauri desktop wrapper for native experience

---

## Running the App

```bash
# Development
npm run dev          # Vite HMR on :5173 + backend on :3001

# Production
npm run build
npm start            # Express on :3001, serves built frontend

# Or auto-launch browser
npm run launch
```

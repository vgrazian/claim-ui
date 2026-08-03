# Changelog

## [0.2.7] - 2025-08-03

### Fixed

- Entry form date pre-population: when clicking "Add" on a specific day tile,
  the form now correctly shows that day's date instead of always defaulting to
  today. Added a `useEffect` in `useEntryForm` to sync `initialDate` changes
  into form state, and fixed `reset()` to respect the initial date.

## [0.2.6] - 2025-07-25

### Fixed

- Hook-order bug in WeekView: `onFormSuccess` previously referenced `values` and `formMode`
  before `useEntryForm` was called. Refactored to pass submitted values as a parameter to
  the callback instead. `formMode` and `editEntry` are now captured via refs so the callback
  always reads the latest state without stale-closure issues.
- Missing imports in WeekView: `ClaimEntry` (from `../services/api`) and `getWeekStart`
  (from `../services/claims`) were used but not imported.

### Added

- Optimistic UI for delete: clicking Delete now removes the entry from the calendar
  immediately without waiting for the Monday.com round-trip. A background refresh after
  1500ms reconciles the displayed state.
- Optimistic UI for add/edit was wired in the previous release but is now correctly
  threaded through the `onFormSuccess(submitted)` parameter.
- Auto-set `customer='PRESALES'` and `workItem='M.00556'` in the entry form when
  activity type is changed to presales; fields are cleared when switching away.
- Presales opportunity picker: two-step flow in the entry form — the Presales button
  opens a separate picker modal where the user selects from existing opportunities
  (with hours remaining) or types a custom one.

## [0.2.1] - 2025-07-24

### Fixed

- Calendar header "Add" button now pre-selects today only when today is visible in
  the current view. When navigating to a past or future week/month, it defaults to
  the first visible day instead of always using today's date. Per-day tile "Add"
  buttons were already correct and unchanged.

### Added

- Presales quick-preset button in the entry form (alongside Vacation / L.104 / Holiday).
  Clicking it sets activity type to Presales, work item to M.00556, hours to 8h.
- When activity type is Presales, a list of available opportunity numbers (derived from
  recent templates, showing those with >= 8h remaining before the 24h limit) appears
  below the comment field as one-click chips. Clicking a chip fills the comment/opportunity
  field. If only one opportunity is available it is auto-filled when the preset is clicked.
- New i18n keys: entry.presalesAvailable (EN + IT).

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - 2025-07-24

### Security

- Bind Express server to 127.0.0.1 (loopback only) instead of 0.0.0.0 — prevents
  the Monday.com API proxy from being reachable by other devices on the LAN.
- Restrict CORS to localhost origins only (ports 3001 and 5173); previously all
  origins were allowed, which could expose the proxy to any page on the network.
- Validate userId as a positive integer and dateFilter entries as YYYY-MM-DD strings
  before interpolating them into GraphQL query strings, closing a GraphQL injection
  vector in POST /api/items/query and GET /api/items/recent.

### Fixed

- useEntryForm: form values no longer remain stale when switching between entries
  without closing the modal. A useEffect now re-syncs values whenever editEntry.id
  changes.
- EntryFormModal: the X button on the error InlineNotification now correctly clears
  the error (was a no-op before). A new onClearError prop is threaded from the hook
  through WeekView into the modal.
- PWA install button in SettingsView now correctly defers and replays the browser
  beforeinstallprompt event. Previously it dispatched a synthetic event that had no
  effect. The button is hidden when the prompt is not available and replaced with
  manual installation instructions.
- useMonthlyL104: errors are now logged to console instead of silently swallowed.
- All catch blocks in useData.ts and useEntryForm.ts: replaced catch (e: any) with
  the safe e instanceof Error ? e.message : String(e) pattern.

### Changed

- ACTIVITY_TYPES constant extracted to src/shared/activityTypes.mjs and shared
  between server/index.mjs and src/services/claims.ts, eliminating the previous
  duplication that could cause the two copies to diverge.
- getMonthGridDates() extracted to src/services/claims.ts and used in both WeekView
  and ReportView, replacing verbatim-duplicated month-grid date calculation logic.
- editEntry state in WeekView typed explicitly instead of using any.
- i18n: all previously hard-coded English strings in WeekView (week/month/list/grid
  view toggles, show/hide weekends, close button), PresalesView (search placeholder,
  filter toggle labels, no-match message, column header), ReportView (view toggle,
  clear marks button), and SettingsView (user section, weekend default, quick-fill
  lookback, install app, API key form) now use t() translation calls.
- New translation keys added to both en.json and it.json for all of the above.
- Month-view day tiles in WeekView are now keyboard-accessible: role="button",
  tabIndex=0, and onKeyDown (Enter/Space) handlers added.

# WanderMark Lock-Screen + Home-Screen Widget — Build & Setup Runbook

> **Last updated**: May 2026 — added with Build 86. iOS-only feature.

## Overview
Super-admins (and moderators) get a live "moderation queue" widget on their
iPhone. Six families supported:

| Family              | Surface          | Content |
|---------------------|------------------|---------|
| `accessoryInline`   | Lock-screen 1-line | "WM • N reports • M tickets" |
| `accessoryCircular` | Lock-screen circle | flag icon + pending count |
| `accessoryRectangular` | Lock-screen widget | counts + last admin action |
| `systemSmall`       | Home-screen      | big number for reports + tickets |
| `systemMedium`      | Home-screen      | counts + last 2 actions |
| `systemLarge`       | Home-screen      | full dashboard + last 3 actions |

Refresh: every 15 minutes via `BackgroundTasks`. iOS throttles based on app
usage — typically lands within 5–20 minutes of changes.

## Architecture

```
┌──────────────┐    /api/admin/widget/summary    ┌──────────────┐
│   FastAPI    │ ◄──────────────────────────────  │ React Native │
│ admin_widget │   (cached 30s server-side)       │     App      │
└──────────────┘                                  └──────┬───────┘
                                                         │ writes JSON
                                                         ▼
                                       UserDefaults(suite: group.com.wandermark.app.adminwidget)
                                                         ▲
                                                         │ reads JSON
                                                  ┌──────┴───────┐
                                                  │ WidgetKit    │
                                                  │ Extension    │
                                                  │ (Swift+SwiftUI) │
                                                  └──────────────┘
```

## Files

- `backend/routes/admin_widget.py` — `/api/admin/widget/summary` (admin/mod auth)
- `frontend/utils/widgetBridge.ts` — JS bridge: API call + UserDefaults write + 15-min `expo-background-fetch` task
- `frontend/targets/wandermarkadminwidget/Widget.swift` — SwiftUI widget views (6 families)
- `frontend/targets/wandermarkadminwidget/expo-target.config.json` — `@bacons/apple-targets` config
- `frontend/targets/wandermarkadminwidget/Info.plist` — widget extension Info.plist
- `frontend/app.json` — App-Group entitlement, `BGTaskSchedulerPermittedIdentifiers`, `@bacons/apple-targets` plugin
- `frontend/app/admin/index.tsx` — calls `setupWidgetBackgroundFetch()` + `refreshWidgetSnapshot()` on mount for super-admins

## App Group
- ID: `group.com.wandermark.app.adminwidget`
- Used by: main app (writer) + widget extension (reader)
- Apple Developer portal: must be created and assigned to BOTH app IDs:
  - `com.wandermark.app`
  - `com.wandermark.app.wandermarkadminwidget` (auto-created by `@bacons/apple-targets`)

## EAS Build steps (one-time setup)

1. **Apple Developer Portal**
   - Identifiers → "+" → App Groups → register `group.com.wandermark.app.adminwidget`
   - Edit `com.wandermark.app` App ID → Capabilities → enable "App Groups" → check the new group.
   - The widget App ID will be auto-registered on first EAS build with a matching capability check.

2. **Local prebuild** (verifies Swift compiles):
   ```bash
   cd /app/frontend
   npx expo prebuild --platform ios --clean
   open ios/WanderMark.xcworkspace   # optional sanity check in Xcode
   ```

3. **Run on simulator/device**:
   ```bash
   npx expo run:ios
   ```
   Then long-press home or lock screen → Add Widget → search "WanderMark Admin".

4. **EAS Build (preview/TestFlight)**:
   ```bash
   eas build --platform ios --profile preview --clear-cache
   ```

5. **Test background fetch in Simulator**:
   - Run app once as super-admin → wait 30s → quit app
   - Xcode → Debug → Simulate Background Fetch
   - Re-add the widget → numbers should update

## Troubleshooting

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| Widget shows "—" / placeholder | App not yet opened by an admin | Open admin home once while logged in as `role==='admin'` |
| Numbers stale > 1 hour | iOS suspended bg fetch (low usage) | Use the app more, or rely on the foreground refresh |
| Widget disappears after build | App Group not enabled in capabilities | Re-check provisioning profile in App Store Connect |
| Build fails: "duplicate symbol _main" | Multiple `@main` in WidgetBundle | Make sure only `WanderMarkAdminWidgetBundle` is `@main` |
| Widget colors wrong on real device | Color asset names mismatch | Names in `expo-target.config.json` must match `Color("…")` calls in `Widget.swift` |

## Privacy / App Store note

The widget surfaces only **counts and recent actor names** — never user PII or
content. App Store Review explicitly tolerates moderation-queue summaries on
admin/operator-only widgets. If reviewers ask, point them at the
`role === 'admin'` gating in `app/admin/index.tsx` (line ~83).

## Backend test

```bash
BASE_URL=https://wandermark-legal.preview.emergentagent.com python -m pytest \
  /app/backend/tests/test_admin_widget.py -v
```

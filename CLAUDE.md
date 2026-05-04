# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development
```bash
# Start all apps simultaneously (recommended)
npm run dev

# Start a single app
cd apps/eagle-dev-console-frontend && npm run dev   # http://localhost:5176
cd apps/eagle-end-user-panel && npm run dev         # http://localhost:5178
cd packages/eagle-widget-library && npm run dev     # http://localhost:5200
```

### Build & Lint
```bash
npm run build          # Build all packages via Turbo (widget library builds first)
npm run lint           # Lint all packages via Turbo

# Per-package (run from the package directory)
npm run build          # tsc -b && vite build  (apps) or tsc (widget library)
npm run lint           # eslint .
```

### Type-check only
```bash
cd apps/eagle-dev-console-frontend && npx tsc --noEmit
cd apps/eagle-end-user-panel && npx tsc --noEmit
cd packages/eagle-widget-library && npx tsc --noEmit
```

### Widget Library Storybook
```bash
cd packages/eagle-widget-library
npm run storybook      # http://localhost:6006
```

## Architecture

This is a **Turbo monorepo** with two React SPAs and one shared widget library:

```
apps/eagle-dev-console-frontend/   → Admin/developer UI (port 5176)
apps/eagle-end-user-panel/         → End-user dashboard UI (port 5178)
packages/eagle-widget-library/     → Shared widget components (published as @gsc-tech/eagle-widget-library)
```

**Turbo build order:** `eagle-widget-library` must build before apps. `turbo run build` handles this via `"dependsOn": ["^build"]`.

**Local HMR shortcut:** Both apps alias `@gsc-tech/eagle-widget-library` directly to the library's TypeScript source (`packages/eagle-widget-library/src/index.ts`) in their `vite.config.ts`. This means edits to the widget library are reflected immediately in both apps without a rebuild step.

---

## Widget System

### Adding a new widget

1. Create `packages/eagle-widget-library/src/widgets/MyWidget.tsx` exporting a `MyWidgetDef` object:
   ```ts
   export const MyWidgetDef = {
     component: MyWidget,       // React component
     name: "My Widget",
     description: "...",
     defaultProps: { ... },
   };
   ```
2. Register it in `widgetLibrary.ts` — add `MyWidget: MyWidgetDef` to the `widgetLibrary` object.
3. Re-export it from `index.ts`.

### `BaseWidgetProps` (all widgets must accept these)
Defined in `packages/eagle-widget-library/src/types.ts`:
- `id` — unique instance ID (injected by `WidgetRenderer`)
- `apiUrl` — backend endpoint for data fetching
- `parameters` — `ParameterDefinition[]` for the auto-generated `ParameterForm`
- `darkMode` — boolean, driven by user's theme toggle
- `groupedParametersValues` / `onGroupedParametersChange` — cross-widget shared parameter groups
- `sheetDependency` — subscribe to a `SheetWidget`'s cell data
- `eventSubscriptions` — subscribe to `widgetEventBus` events to trigger refetch
- `getFirebaseToken` — injected when `isTokenRequired: true`; returns a Firebase ID token

### ParameterForm
`packages/eagle-widget-library/src/components/ParameterForm.tsx` auto-generates form UI from `ParameterDefinition[]`. Parameter types: `text | number | date | select | multiselect | checkbox`. Use `optionsApiUrl` to fetch select options dynamically. Use `groupId` to share a parameter value across multiple widgets on the same dashboard.

---

## Cross-Widget Communication

Two patterns exist for widgets to react to each other:

### 1. Event Bus (`widgetEventBus`)
`packages/eagle-widget-library/src/store/widgetEventBus.ts`

```ts
// Emit (producer widget)
widgetEventBus.emit(WIDGET_EVENTS.LIMIT_REQUEST_SUBMITTED, payload);

// Subscribe (consumer widget, via BaseWidgetProps)
eventSubscriptions: [{ eventType: 'trader-limits:request-submitted', action: 'refetch' }]
```

Standard event types are in `WIDGET_EVENTS`. Add new event types there when introducing new cross-widget flows.

### 2. Sheet Dependency (`sheetStore`)
`packages/eagle-widget-library/src/store/sheetStore.ts`

A `SheetWidget` writes cell data into `useSheetStore` keyed by `workbookId`. Other widgets declare a `sheetDependency` config and receive debounced callbacks (1 second) when the sheet data changes. `extractSheetAsGrid` and `extractRangeData` are utility functions for reading raw cell values.

---

## State Management

### Dashboard Layout State (end-user panel)
`apps/eagle-end-user-panel/src/store/dashboardStateStore.ts` — Zustand store persisted to `localStorage` under key `eagle-dashboard-state`.

Keying structure: `dashboardId → tabId → LayoutItem[]`. Also stores per-widget state (`widgetStates`) and the active tab per dashboard.

### Grouped Parameters State (end-user panel)
`apps/eagle-end-user-panel/src/store/groupedParamsStore.ts` — Zustand store (not persisted). When a `ParameterForm` field has a `groupId`, its value is written here so all widgets with the same `groupId` on the same dashboard share and re-render from one source of truth.

### Sheet Store (widget library)
`useSheetStore` (Zustand, not persisted) — in-memory workbook data for `SheetWidget` instances. Ephemeral; workbook snapshots for persistence are passed through `onSave` / `initialWorkbookData` props, which the host app (end-user panel) is responsible for storing to its backend.

---

## Dashboard Rendering Flow (End-User Panel)

1. `home.tsx` — fetches dashboard list from backend API using a Firebase auth token. Renders a sidebar of dashboards/tabs.
2. `Canvas.tsx` — receives `LayoutItem[]` (the published layout) and renders `react-grid-layout`. Handles drag/resize and persists updated layouts to `dashboardStateStore`.
3. `WidgetRenderer.tsx` — looks up `widgetLibrary[componentName]`, injects all standard props (theme, grouped params, widget state, Firebase token), and renders the component.

---

## Dev Console Flow

1. **Backends page** — operators register backend services by URL. The console calls `GET /widget` on each backend to retrieve widget configurations.
2. **Dash Builder** (`/dash-builder`) — drag widgets from sidebar onto a `react-grid-layout` canvas. Built with `react-dnd` (sidebar → canvas) and `react-grid-layout` (resize/reorder on canvas). Uses a 12-column grid, 60px row height, 16px margin.
3. **Publish** — saves the layout to the backend so the end-user panel can fetch and render it.

Widget configs returned by backends follow:
```json
{
  "name": "Order Book",
  "componentName": "MarketDepthWidget",
  "defaultProps": { "wsUrl": "...", "parameters": [...], "fetchMode": "manual" }
}
```

---

## Key Conventions

- **Path alias:** `@/` maps to `./src/` in all apps. Widget library has no alias.
- **Theme:** Dark/light is toggled by adding/removing a class on `<html>`. Theme is read from `localStorage` key `"theme"`. Widgets receive `darkMode: boolean` as a prop.
- **Firebase auth:** Both apps use Firebase Auth. `getToken()` / `getFirebaseToken()` returns an ID token. Widgets that call authenticated endpoints should use `isTokenRequired: true` in their definition so `WidgetRenderer` injects `getFirebaseToken`.
- **No tests exist** — the `test` script in each app just starts a dev server on a different port (8282/8283), not a test runner.
- **ESLint** is the only static analysis tool. Run `npm run lint` from root.
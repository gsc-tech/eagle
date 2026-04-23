# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Root (runs all workspaces via Turbo)
```bash
npm run dev      # start all apps in dev mode
npm run build    # build all packages and apps
npm run lint     # lint all packages and apps
```

### Individual apps (run from their directory)
```bash
# apps/eagle-dev-console-frontend  — port 5176 (dev), 8283 (test)
# apps/eagle-end-user-panel        — port 5178 (dev), 8282 (test)
npm run dev
npm run build    # tsc -b && vite build
npm run lint     # eslint .
npm run preview
```

### Widget library (packages/eagle-widget-library)
```bash
npm run build          # tsc
npm run storybook      # storybook dev -p 6006
npm run build-storybook
```

## Architecture

Eagle is a **financial dashboard platform** structured as a Turbo monorepo with two apps and one shared package.

### Workspaces

| Workspace | Path | Purpose |
|-----------|------|---------|
| `eagle-dev-console-frontend` | `apps/eagle-dev-console-frontend` | Admin/developer UI: configure backends, design dashboards, manage widgets and users. Firebase auth. Routes: `/backends`, `/widgets`, `/dashboards`, `/dashboard-builder`, `/users`, `/login` |
| `eagle-end-user-panel` | `apps/eagle-end-user-panel` | Trader-facing dashboard viewer. localStorage auth. Routes: `/login`, `/home` |
| `eagle-widget-library` | `packages/eagle-widget-library` | Shared React component library — all widgets, hooks, Zustand stores, and utilities |

### Data flow

Both apps import widgets from the shared library. During development, Vite path aliases point directly at the library source (`packages/eagle-widget-library/src`) so HMR works without rebuilding the package. Turbo ensures the library is compiled before apps in production builds.

### Widget library internals

Widgets live in `packages/eagle-widget-library/src/widgets/`. Each widget:
- Accepts a typed config (parameters driven by `ParameterForm.tsx`)
- Supports `fetchMode`: `auto` (live WebSocket/polling) or `manual` (on-demand HTTP)
- Is rendered inside a resizable/draggable `WidgetContainer`

Widget categories:
- **Charts**: AmBarChart, AmCandlestick, AreaChart, BarChart, LineChart, HeatMap, PieChart, ScatterPlot, TvCandlestick, TvLineChart, and live variants
- **Data**: DataTable, RealtimeDataTable, WatchList, WorldMap
- **Domain**: MarketDepthWidget, MetricWidget, NewsWidget, TextWidget
- **Advanced**: EconomicCalendarWidget, ExpiryCalendarWidget, SheetWidget, PdfViewerWidget

Zustand stores in the library manage cross-widget state: `positionsStore`, `alertsStore`, `realtimeStore`, `sheetStore`.

### Dashboard builder

The dev console uses React Grid Layout + React DnD to let users drag widgets onto a canvas and configure them. Saved dashboard configs (widget types + positions + parameters) are consumed by the end-user panel at runtime.

## Tech stack

- **React 19**, **TypeScript 5.9** (strict), **Vite 7**, **Tailwind CSS 4**
- **React Router v7** for routing in both apps
- **Zustand** for state; **Firebase** for auth in dev console; localStorage auth in end-user panel
- **Charting**: recharts, echarts, ag-grid-react, @amcharts/amcharts5, Lightweight Charts (TradingView)
- **UI**: Radix UI (headless), Lucide React (icons), Framer Motion (animation)
- **Advanced**: @tiptap (rich text), Univerjs (spreadsheet), MarkerJS2 (image annotation), PDFMake, ExcelJS
- **Turbo 2.8** orchestrates builds with dependency caching

# Eagle Widget Library Documentation

This document describes all the widgets available in the Eagle Widget Library, their purpose, usage, and expected properties.

## Table of Contents

1. [Common Configuration Props](#common-configuration-props)
2. [AmBarChartWidget](#ambarchartwidget)
3. [AmCandlestickChartWidget](#amcandlestickchartwidget)
4. [AreaChartWidget](#areachartwidget)
5. [BarChartWidget](#barchartwidget)
6. [DataTableWidget](#datatablewidget)
7. [EconomicCalendarWidget](#economiccalendarwidget)
8. [HeatMapWidget](#heatmapwidget)
9. [HorizontalBarChartWidget](#horizontalbarchartwidget)
10. [LineChartWidget](#linechartwidget)
11. [LiveBarChartWidget](#livebarchartwidget)
12. [MarketDepthWidget](#marketdepthwidget)
13. [MetricWidget](#metricwidget)
14. [NewsWidget](#newswidget)
15. [PieChartWidget](#piechartwidget)
16. [RealtimeDataTableWidget](#realtimedatatablewidget)
17. [ScatterPlotWidget](#scatterplotwidget)
18. [SunburstChartWidget](#sunburstchartwidget)
19. [TextWidget](#textwidget)
20. [TvCandlestickChartWidget](#tvcandlestickchartwidget)
21. [TvLineChartWidget](#tvlinechartwidget)
22. [TvLiveCandlestickChartWidget](#tvlivecandlestickchartwidget)
23. [TvLiveLineChartWidget](#tvlivelinechartwidget)

---

## Common Configuration Props

All widgets share a set of common properties that control data fetching, appearance, and interactivity. These properties are omitted from individual widget tables for brevity but are supported unless otherwise noted.

| Prop | Type | Default | Description |
|---|---|---|---|
| `darkMode` | `boolean` | `false` | Toggles between light and dark themes. |
| `apiUrl` | `string` | optional | The primary endpoint for fetching historical or initial data. |
| `fetchMode` | `'manual' \| 'auto'` | `'manual'` | `auto` triggers a fetch on component mount; `manual` requires user action. |
| `wsUrl` | `string` | optional | WebSocket URL for real-time updates (used by live widgets). |
| `parameters` | `Parameter[]` | `[]` | Dynamic inputs for the widget (see below for details). |

### Using the `parameters` Prop in Depth

The `parameters` prop is a powerful feature that allows you to define dynamic inputs for your widget. These inputs are rendered in the UI (usually in a configuration sidebar or modal) and allow users to customize the data being displayed.

#### Parameter Object Structure
Each object in the `parameters` array should follow this structure:

| Field | Type | Description |
|---|---|---|
| `name` | `string` | The parameter key. This name is used in the API request query string. |
| `label` | `string` | The human-readable label shown in the UI next to the input field. |
| `type` | `string` | The input type. Supported: `'text'`, `'number'`, `'select'`, `'boolean'`, `'date'`. |
| `defaultValue` | `any` | The initial value for the parameter. |
| `required` | `boolean` | If true, the widget will ensure this value is present before fetching. |
| `options` | `array` | Required if `type` is `'select'`. Format: `[{ label: "Display", value: "actual_value" }]`. |

#### How Parameters Affect Data Fetching
When a widget makes a request to its `apiUrl`, it automatically appends all defined `parameters` as query string arguments.

**Example Scenario:**
- **apiUrl:** `http://localhost:8080/api/prices`
- **parameters:**
  ```json
  [
    { "name": "symbol", "label": "Asset", "type": "text", "defaultValue": "BTC" },
    { "name": "interval", "label": "Timeframe", "type": "select", "defaultValue": "1h", "options": [{"label": "1 Hour", "value": "1h"}, {"label": "4 Hours", "value": "4h"}] }
  ]
  ```
- **Resulting Request:** `http://localhost:8080/api/prices?symbol=BTC&interval=1h`

#### Real-time Integration
For widgets using WebSockets (`wsUrl`), parameters are often used to define the "topic" or "subscription" criteria. The specific implementation depends on how the frontend component handles the WebSocket handshake or subscription messages using these parameters.

---

### AmBarChartWidget
A bar chart widget powered by AmCharts. Supports vertical, horizontal, and stacked configurations.

**Props:**
| detailed prop | type | default | description |
|---|---|---|---|
| `categoryField` | `string` | `"category"` | Field name for the category (x-axis typically). |
| `seriesConfig` | `AmBarSeriesConfig[]` | `[{name: "Series 1", valueField: "value", color: "#6366f1"}]` | Configuration for each series (bars). |
| `orientation` | `"vertical" \| "horizontal"` | `"vertical"` | Orientation of the bars. |
| `stacked` | `boolean` | `false` | Whether to stack the bars. |

**Expected Data Format:**
An array of objects. Each object should contain a category field and one or more value fields corresponding to the `seriesConfig`.

**Example Data:**
```json
[
  { "month": "Jan", "sales": 400, "profit": 200 },
  { "month": "Feb", "sales": 300, "profit": 150 },
  { "month": "Mar", "sales": 600, "profit": 400 }
]
```

**Important Notes:**
*   Ensure the `categoryField` and `valueField` in `seriesConfig` exactly match the keys in your JSON.
*   Colors in `seriesConfig` support hex codes (e.g., `#6366f1`).
*   The `orientation` can be dynamically switched without changing the data structure.

**Usage Example (Config format):**
```json
{
  "name": "Bar Chart",
  "componentName": "AmBarChartWidget",
  "defaultProps": {
    "apiUrl": "http://localhost:8080/api/data",
    "categoryField": "month",
    "seriesConfig": [
      { "name": "Sales", "valueField": "sales", "color": "#0ea5e9" },
      { "name": "Profit", "valueField": "profit", "color": "#10b981" }
    ],
    "orientation": "vertical",
    "stacked": true,
    "darkMode": false,
    "fetchMode": "manual",
    "parameters": []
  }
}
```

---

### AmCandlestickChartWidget
A candlestick chart widget powered by AmCharts, suitable for financial data.

**Props:**
*Note: This widget relies primarily on common props (`apiUrl`, `parameters`).*

**Expected Data Format:**
An array of objects representing OHLC (Open, High, Low, Close) data.

**Example Data:**
```json
[
  { "date": "2023-01-01", "open": 150, "high": 160, "low": 145, "close": 155 },
  { "date": "2023-01-02", "open": 155, "high": 158, "low": 150, "close": 152 }
]
```

**Important Notes:**
*   `date` can be a timestamp or a standard date string.
*   The widget automatically handles rendering the typical red/green candlestick colors.
*   Best used with financial time-series data.

**Usage Example (Config format):**
```json
{
  "name": "Candlestick Chart",
  "componentName": "AmCandlestickChartWidget",
  "defaultProps": {
    "apiUrl": "http://localhost:8080/api/ohlc",
    "darkMode": true,
    "fetchMode": "manual",
    "parameters": [
       { "name": "symbol", "label": "Symbol", "type": "text", "defaultValue": "AAPL", "required": true }
    ]
  }
}
```

---

### AreaChartWidget
An area chart widget powered by AmCharts 5.

**Props:**
| detailed prop | type | default | description |
|---|---|---|---|
| `valueField` | `string` | `"value"` | Field for the numeric value. |
| `dateField` | `string` | `"date"` | Field for the date/time. |
| `lineColor` | `string` | `"#6366f1"` | Color of the line stroke. |
| `fillColor` | `string` | `"#6366f1"` | Color of the area fill. |
| `fillOpacity` | `number` | `0.3` | Opacity of the fill. |
| `strokeWidth` | `number` | `2` | Width of the line stroke. |

**Expected Data Format:**
An array of objects containing a date field and a numeric value field.

**Example Data:**
```json
[
  { "date": "2023-10-01", "value": 1200 },
  { "date": "2023-10-02", "value": 1500 }
]
```

**Important Notes:**
*   The `fillOpacity` prop controls the "area" part of the chart. Set to `0` for a simple line chart.
*   Dates should be in a format recognized by JavaScript's `Date` constructor or AmCharts date parser.

**Usage Example (Config format):**
```json
{
  "name": "Area Chart",
  "componentName": "AreaChartWidget",
  "defaultProps": {
    "apiUrl": "http://localhost:8080/api/metrics",
    "valueField": "visitors",
    "dateField": "date",
    "fillColor": "#f43f5e",
    "lineColor": "#e11d48",
    "fillOpacity": 0.3,
    "strokeWidth": 2,
    "darkMode": false,
    "fetchMode": "manual",
    "parameters": []
  }
}
```

---

### BarChartWidget
A lightweight bar chart widget using `lightweight-charts`.

**Props:**
| detailed prop | type | default | description |
|---|---|---|---|
| `upColor` | `string` | `"#26a69a"` | Color for bars when close >= open (if price-based). |
| `downColor` | `string` | `"#ef5350"` | Color for bars when close < open (if price-based). |
| `backgroundColor` | `string` | `"#ffffff"` | Background color of the chart. |
| `textColor` | `string` | `"#191919"` | Text color for axes. |
| `valueField` | `string` | `"volume"` | Field to map to bar height. |
| `colorMode` | `"static" \| "price-based" \| "custom"` | `"price-based"` | Strategy for coloring bars. |
| `staticColor` | `string` | `"#2962FF"` | Color used when mode is static. |
| `showYAxis` | `boolean` | `true` | Whether to show the right price scale. |

**Expected Data Format:**
An array of objects representing time-series bar data (e.g., volume).

**Example Data:**
```json
[
  { "time": "2023-01-01", "volume": 1000, "open": 10, "close": 12 },
  { "time": "2023-01-02", "volume": 1200, "open": 12, "close": 11 }
]
```

**Important Notes:**
*   `colorMode` set to `price-based` requires `open` and `close` fields to determine bar color (red/green).
*   Uses `lightweight-charts` for high performance scrolling/zooming.

**Usage Example (Config format):**
```json
{
  "name": "Volume Chart",
  "componentName": "BarChartWidget",
  "defaultProps": {
    "apiUrl": "http://localhost:8080/api/volume",
    "valueField": "volume",
    "colorMode": "static",
    "staticColor": "#3b82f6",
    "upColor": "#26a69a",
    "downColor": "#ef5350",
    "showYAxis": true,
    "darkMode": false,
    "fetchMode": "manual",
    "parameters": []
  }
}
```

---

### DataTableWidget
A data table widget using `@tanstack/react-table`.

**Props:**
*Note: This widget relies primarily on common props (`apiUrl`, `parameters`).*

**Expected Data Format:**
An array of objects. The table automatically generates columns based on the keys found in the first object of the array.

**Example Data:**
```json
[
  { "id": 1, "name": "John Doe", "role": "Admin", "status": "Active" },
  { "id": 2, "name": "Jane Smith", "role": "User", "status": "Inactive" }
]
```

**Important Notes:**
*   The widget is "headless" regarding columns—it will show everything it receives.
*   Supports sorting and filtering out-of-the-box.

**Usage Example (Config format):**
```json
{
  "name": "Transactions Table",
  "componentName": "DataTableWidget",
  "defaultProps": {
    "apiUrl": "http://localhost:8080/api/transactions",
    "darkMode": false,
    "fetchMode": "manual",
    "parameters": []
  }
}
```

---

### EconomicCalendarWidget
A widget to display economic calendar events.

**Props:**
| detailed prop | type | default | description |
|---|---|---|---|
| `defaultCountry` | `string` | `undefined` | Filter by country (optional). |
| `defaultImportance` | `"low" \| "medium" \| "high"` | `undefined` | Filter by importance (optional). |
| `timezone` | `"local" \| "utc"` | `"local"` | Timezone for display. |

**Expected Data Format:**
An array of objects (or an object with a `data` array) representing economic events.

**Example Data:**
```json
[
  {
    "datetime": "2023-10-25T14:00:00Z",
    "country": "USA",
    "event": "Fed Interest Rate Decision",
    "importance": "high",
    "actual": "5.50%",
    "forecast": "5.50%",
    "previous": "5.50%"
  }
]
```

**Important Notes:**
*   `importance` supports `low`, `medium`, and `high` for color-coded impact badges.
*   Field aliases are supported (e.g., `iso_country` for `country`, `impact` for `importance`).

**Usage Example (Config format):**
```json
{
  "name": "Economic Calendar",
  "componentName": "EconomicCalendarWidget",
  "defaultProps": {
    "apiUrl": "http://localhost:8080/api/calendar",
    "timezone": "utc",
    "defaultCountry": "USA",
    "defaultImportance": "high",
    "darkMode": true,
    "fetchMode": "auto",
    "parameters": []
  }
}
```

---

### HeatMapWidget
A calendar heatmap widget using `cal-heatmap`.

**Props:**
| detailed prop | type | default | description |
|---|---|---|---|
| `range` | `number` | `12` | Number of domain units to show. |
| `domainType` | `'year' \| 'month' ...` | `'month'` | Larger time unit (container). |
| `subDomainType` | `'day' \| 'hour' ...` | `'day'` | Smaller time unit (cells). |
| `domainSort` | `'asc' \| 'desc'` | `'asc'` | Sort order of domains. |
| `startDate` | `Date \| string` | `undefined` | Start date for the heatmap. |
| `colorSchemeLight` | `string` | `'Greens'` | D3 color scheme for light mode. |
| `colorSchemeDark` | `string` | `'Blues'` | D3 color scheme for dark mode. |
| `dateField` | `string` | `'date'` | Field for date in data. |
| `valueField` | `string` | `'value'` | Field for value in data. |

**Expected Data Format:**
An array of objects containing date/timestamp and a numeric value.

**Example Data:**
```json
[
  { "date": "2023-10-01", "value": 5 },
  { "date": "2023-10-02", "value": 12 }
]
```

**Important Notes:**
*   Uses `cal-heatmap` library.
*   `range` and `domainType` control the overall time span shown (e.g., 12 months).
*   Color schemes use D3 color scale names (e.g., `Greens`, `YlOrRd`).

**Usage Example (Config format):**
```json
{
  "name": "Activity Heatmap",
  "componentName": "HeatMapWidget",
  "defaultProps": {
    "apiUrl": "http://localhost:8080/api/commits",
    "range": 12,
    "domainType": "year",
    "subDomainType": "month",
    "colorSchemeLight": "Greens",
    "colorSchemeDark": "Blues",
    "dateField": "date",
    "valueField": "count"
  }
}
```

---

### HorizontalBarChartWidget
A horizontal bar chart using `recharts`.

**Props:**
| detailed prop | type | default | description |
|---|---|---|---|
| `nameField` | `string` | `"name"` | Field for category names. |
| `valueField` | `string` | `"value"` | Field for values. |
| `colorMode` | `"value-based" \| "static" \| "custom"` | `"value-based"` | Coloring strategy. |
| `positiveColor` | `string` | `"#26a69a"` | Color for positive values. |
| `negativeColor` | `string` | `"#ef5350"` | Color for negative values. |
| `staticColor` | `string` | `"#2962FF"` | Color for static mode. |
| `sortBy` | `"value" \| "name" \| "none"` | `"none"` | Sorting key. |
| `sortOrder` | `"ascending" \| "descending"` | `"descending"` | Sorting order. |
| `diverging` | `boolean` | `false` | If true, renders a diverging bar chart (bidirectional). |
| `showZeroLine` | `boolean` | `true` | Show line at 0 for diverging charts. |
| `barHeight` | `number` | `32` | Height of bars in pixels. |
| `maxBars` | `number` | `20` | Max items to show. |
| `showValues` | `boolean` | `true` | Show value labels. |

**Expected Data Format:**
An array of objects with a name (label) and a value.

**Example Data:**
```json
[
  { "name": "Apple", "value": 150 },
  { "name": "Samsung", "value": -20 },
  { "name": "Google", "value": 100 }
]
```

**Important Notes:**
*   `diverging` mode is excellent for showing gains/losses with a center zero line.
*   `sortBy` can be `value` to automatically rank items by performance.

**Usage Example (Config format):**
```json
{
  "name": "Market Movers",
  "componentName": "HorizontalBarChartWidget",
  "defaultProps": {
    "apiUrl": "http://localhost:8080/api/market-movers",
    "nameField": "name",
    "valueField": "change",
    "diverging": true,
    "showZeroLine": true,
    "sortBy": "value"
  }
}
```

---

### LineChartWidget
A line chart widget powered by AmCharts. Supports multiple series.

**Props:**
| detailed prop | type | default | description |
|---|---|---|---|
| `dateField` | `string` | `"date"` | Field for x-axis dates. |
| `seriesConfig` | `SeriesConfig[]` | `[{name: "Series", valueField: "value" ...}]` | Config for lines. |

**Expected Data Format:**
An array of objects with a date/timestamp and numeric values for each series.

**Example Data:**
```json
[
  { "date": "2023-10-01", "btc": 27000, "eth": 1600 },
  { "date": "2023-10-02", "btc": 27500, "eth": 1650 }
]
```

**Important Notes:**
*   You can define as many series as you want in `seriesConfig`.
*   Each series in `seriesConfig` must point to a unique `valueField` in the data.

**Usage Example (Config format):**
```json
{
  "name": "Price Trends",
  "componentName": "LineChartWidget",
  "defaultProps": {
    "apiUrl": "http://localhost:8080/api/trends",
    "dateField": "date",
    "seriesConfig": [
      { "name": "Bitcoin", "valueField": "btc", "color": "#f7931a" },
      { "name": "Ethereum", "valueField": "eth", "color": "#627eea" }
    ],
    "darkMode": false,
    "fetchMode": "manual",
    "parameters": []
  }
}
```

---

### LiveBarChartWidget
A real-time bar chart using `lightweight-charts` + WebSockets.

**Props:**
| detailed prop | type | default | description |
|---|---|---|---|
| `timeFormat` | `'date' \| 'time' \| 'datetime'` | `'date'` | Format for x-axis time labels. |
| `upColor` | `string` | `"#26a69a"` | Color for up bars. |
| `downColor` | `string` | `"#ef5350"` | Color for down bars. |
| `valueField` | `string` | `"volume"` | Field for bar value. |
| `colorMode` | `"static" \| "price-based"` | `"price-based"` | Coloring mode. |
| `staticColor` | `string` | `"#2962FF"` | Color for static mode. |

**Expected Data Format:**
- **REST (Initialization):** Array of objects with `time`, `value`, and optionally `open`/`close` for price-based coloring.
- **WebSocket (Updates):** A message with `{ type: "update", data: { time, value, ... } }`.

**Example Data:**
```json
// REST Initial Data
[
  { "time": "2023-10-25T14:00:00Z", "volume": 500, "open": 100, "close": 105 },
  { "time": "2023-10-25T14:01:00Z", "volume": 300, "open": 105, "close": 102 }
]

// WebSocket Message
{
  "type": "update",
  "data": { "time": "2023-10-25T14:02:00Z", "volume": 450, "open": 102, "close": 104 }
}
```

**Important Notes:**
*   Combines historical data (via `apiUrl`) with live spikes (via `wsUrl`).
*   The `time` field in WebSocket must be a format parseable by `new Date()`.

**Usage Example (Config format):**
```json
{
  "name": "Live Volume",
  "componentName": "LiveBarChartWidget",
  "defaultProps": {
    "apiUrl": "http://localhost:8080/api/hist/volume",
    "wsUrl": "wss://stream.example.com/volume",
    "timeFormat": "time",
    "valueField": "volume",
    "darkMode": false,
    "fetchMode": "manual",
    "parameters": [
       { "name": "symbol", "label": "Symbol", "type": "text", "defaultValue": "BTCUSD", "required": true }
    ]
  }
}
```

---

### MarketDepthWidget
A widget to display market depth (L1 data: Bid/Ask) via WebSockets.

**Props:**
*Note: This widget relies primarily on common props (`wsUrl`, `parameters`).*

**Expected Data Format:**
Requires a WebSocket message with `type: "update"` and a `data` object containing bid/ask info.

**Example WebSocket Message:**
```json
{
  "type": "update",
  "data": {
    "bid": 27150.50,
    "bidSize": 1.25,
    "ask": 27152.00,
    "askSize": 0.85
  }
}
```

**Important Notes:**
*   Designed for Level 1 (Top of Book) data.
*   The widget automatically calculates the spread and spread percentage.

**Usage Example (Config format):**
```json
{
  "name": "Order Book",
  "componentName": "MarketDepthWidget",
  "defaultProps": {
    "wsUrl": "wss://stream.example.com/orderbook",
    "darkMode": true,
    "fetchMode": "manual",
    "parameters": [
       { "name": "symbol", "label": "Symbol", "type": "text", "defaultValue": "BTCUSD", "required": true }
    ]
  }
}
```

---

### MetricWidget
A simple metric display (value, label, delta).

**Props:**
| detailed prop | type | default | description |
|---|---|---|---|
| `labelField` | `string` | `"label"` | Field for label text. |
| `valueField` | `string` | `"value"` | Field for main metric value. |
| `deltaField` | `string` | `"delta"` | Field for percentage change/delta. |
| `itemsPerRow` | `number` | `3` | Number of metrics per row grid. |
| `showDelta` | `boolean` | `true` | Whether to show the delta badge. |
| `positiveColor` | `string` | `"#00C853"` | Color for positive delta. |
| `negativeColor` | `string` | `"#FF1744"` | Color for negative delta. |

**Expected Data Format:**
An array of objects representing metrics. Each item is rendered as a separate card in a grid.

**Example Data:**
```json
[
  { "label": "Revenue", "value": "$12,400", "delta": "+5.2%" },
  { "label": "Active Users", "value": "1,042", "delta": "-1.5%" }
]
```

**Important Notes:**
*   `itemsPerRow` controls the grid layout.
*   Delta values starting with `+` are automatically colored with `positiveColor`, and `-` with `negativeColor`.

**Usage Example (Config format):**
```json
{
  "name": "KPI Dashboard",
  "componentName": "MetricWidget",
  "defaultProps": {
    "apiUrl": "http://localhost:8080/api/kpi",
    "itemsPerRow": 4,
    "labelField": "label",
    "valueField": "value",
    "deltaField": "delta",
    "showDelta": true
  }
}
```

---

### NewsWidget
A widget to feed and display news items.

**Props:**
*Note: This widget relies primarily on common props (`apiUrl`, `parameters`).*

**Expected Data Format:**
An array of news objects.

**Example Data:**
```json
[
  {
    "id": "news-1",
    "headline": "Bitcoin Hits New High",
    "summary": "The leading cryptocurrency has surged past previous resistance levels...",
    "category": "Crypto",
    "timestamp": 1698240000000,
    "url": "https://example.com/news/1"
  }
]
```

**Important Notes:**
*   `category` values like `Crypto`, `Stocks`, `Macro` have predefined colors.
*   `timestamp` should be in milliseconds.

**Usage Example (Config format):**
```json
{
  "name": "Crypto News",
  "componentName": "NewsWidget",
  "defaultProps": {
    "apiUrl": "http://localhost:8080/api/news/crypto",
    "darkMode": false,
    "fetchMode": "manual",
    "parameters": []
  }
}
```

---

### PieChartWidget
A pie or donut chart widget using AmCharts.

**Props:**
| detailed prop | type | default | description |
|---|---|---|---|
| `valueField` | `string` | `"value"` | Field for slice size. |
| `categoryField` | `string` | `"category"` | Field for slice label. |
| `donut` | `boolean` | `false` | If true, renders as a donut chart. |
| `innerRadius` | `number` | `50` | Inner radius percent for donut. |

**Expected Data Format:**
An array of objects with a category (label) and a numeric value.

**Example Data:**
```json
[
  { "category": "Equity", "value": 60 },
  { "category": "Bonds", "value": 30 },
  { "category": "Cash", "value": 10 }
]
```

**Important Notes:**
*   Setting `donut` to `true` renders a hole in the middle.
*   `innerRadius` controls the size of the hole (0-100).

**Usage Example (Config format):**
```json
{
  "name": "Asset Allocation",
  "componentName": "PieChartWidget",
  "defaultProps": {
    "apiUrl": "http://localhost:8080/api/distribution",
    "valueField": "amount",
    "categoryField": "asset",
    "donut": true,
    "innerRadius": 60
  }
}
```

---

### RealtimeDataTableWidget
A data table that supports real-time row updates via WebSocket.

**Props:**
| detailed prop | type | default | description |
|---|---|---|---|
| `wsUrl` | `string` | `""` | WebSocket URL. |
| `primaryKey` | `string` | `"id"` | Unique key to identify rows types. |

**Expected Data Format:**
An array of objects for initial load, and incremental updates via WebSocket.

**Example Data:**
```json
// REST / Initialization
[
  { "symbol": "BTC", "price": 27000, "change": "+1.2%" },
  { "symbol": "ETH", "price": 1600, "change": "-0.5%" }
]

// WebSocket Update
{
  "type": "update",
  "data": { "symbol": "BTC", "price": 27050, "change": "+1.4%" }
}
```

**Important Notes:**
*   The `primaryKey` is critical—the widget uses it to find and update the existing row in the table when a WebSocket message arrives.

**Usage Example (Config format):**
```json
{
  "name": "Live Positions",
  "componentName": "RealtimeDataTableWidget",
  "defaultProps": {
    "apiUrl": "http://localhost:8080/api/positions",
    "wsUrl": "wss://stream.example.com/positions",
    "primaryKey": "symbol",
    "darkMode": false,
    "fetchMode": "manual",
    "parameters": []
  }
}
```

---

### ScatterPlotWidget
A scatter plot chart using AmCharts.

**Props:**
| detailed prop | type | default | description |
|---|---|---|---|
| `xField` | `string` | `"x"` | Field for X value. |
| `yField` | `string` | `"y"` | Field for Y value. |
| `sizeField` | `string` | `"size"` | Field for dot size (optional). |
| `categoryField` | `string` | `"category"` | Field for grouping colors (optional). |
| `pointColor` | `string` | `"#6366f1"` | Fallback color. |
| `pointSize` | `number` | `10` | Base size of points. |
| `showTrendLine` | `boolean` | `false` | Calculate and show linear trend line. |
| `enableZoom` | `boolean` | `true` | Enable zooming. |

**Expected Data Format:**
An array of objects containing at least X and Y numeric values.

**Example Data:**
```json
[
  { "tvl": 1000000, "mcap": 5000000, "chain": "Ethereum", "volume": 200000 },
  { "tvl": 500000, "mcap": 1000000, "chain": "Solana", "volume": 50000 }
]
```

**Important Notes:**
*   `sizeField` can be used to create a "bubble chart" effect where the dot size represents a third dimension (e.g., volume).
*   `categoryField` allows you to color-code points by grouping (e.g., by blockchain network).

**Usage Example (Config format):**
```json
{
  "name": "Correlation Plot",
  "componentName": "ScatterPlotWidget",
  "defaultProps": {
    "apiUrl": "http://localhost:8080/api/correlation",
    "xField": "tvl",
    "yField": "mcap",
    "categoryField": "chain",
    "sizeField": "volume",
    "showTrendLine": true,
    "enableZoom": true
  }
}
```

---

### SunburstChartWidget
A sunburst chart for hierarchical data using AmCharts.

**Props:**
| detailed prop | type | default | description |
|---|---|---|---|
| `valueField` | `string` | `"value"` | Field for value. |
| `categoryField` | `string` | `"name"` | Field for category name. |
| `childField` | `string` | `"children"` | Field containing children array. |

**Expected Data Format:**
A hierarchical (nested) object or an array with a root object.

**Example Data:**
```json
{
  "name": "Portfolio",
  "children": [
    {
      "name": "Crypto",
      "children": [
        { "name": "BTC", "value": 50 },
        { "name": "ETH", "value": 30 }
      ]
    },
    { "name": "Cash", "value": 20 }
  ]
}
```

**Important Notes:**
*   The widget supports deep nesting.
*   Clicking a slice "drills down" into that category.

**Usage Example (Config format):**
```json
{
  "name": "Portfolio Breakdown",
  "componentName": "SunburstChartWidget",
  "defaultProps": {
    "apiUrl": "http://localhost:8080/api/portfolio",
    "valueField": "value",
    "categoryField": "name",
    "childField": "children"
  }
}
```

---

### TextWidget
A rich text editor/viewer widget using Tiptap.

**Props:**
| detailed prop | type | default | description |
|---|---|---|---|
| `text` | `string` | `"start editing..."` | Initial HTML content. |
| `onSync` | `function` | `(id, data) => {}` | Callback for content updates. |
| `id` | `string` | `undefined` | ID for sync. |

**Important Notes:**
*   Uses the Tiptap editor engine.
*   Data is stored as HTML strings.
*   `onSync` can be used to save the content to a backend.

**Usage Example (Config format):**
```json
{
  "name": "Notes",
  "componentName": "TextWidget",
  "defaultProps": {
    "text": "<h1>Welcome</h1><p>Edit this note...</p>",
    "id": "note-1"
  }
}
```

---

### TvCandlestickChartWidget
A static/historical candlestick chart using `lightweight-charts`.

**Props:**
*Note: This widget relies primarily on common props (`apiUrl`, `parameters`).*

**Expected Data Format:**
An array of OHLC objects compatible with `lightweight-charts`.

**Example Data:**
```json
[
  { "time": "2023-10-25", "open": 100, "high": 110, "low": 95, "close": 105 }
]
```

**Important Notes:**
*   `time` can be a string (`YYYY-MM-DD`) or a numeric timestamp in seconds.

**Usage Example (Config format):**
```json
{
  "name": "TradingView Candles",
  "componentName": "TvCandlestickChartWidget",
  "defaultProps": {
    "apiUrl": "http://localhost:8080/api/history/ohlc",
    "darkMode": false,
    "fetchMode": "manual",
    "parameters": [
      { "name": "symbol", "label": "Symbol", "type": "text", "defaultValue": "BTCUSD", "required": true }
    ]
  }
}
```

---

### TvLineChartWidget
A simple line chart using `lightweight-charts`.

**Props:**
| detailed prop | type | default | description |
|---|---|---|---|
| `lineColor` | `string` | `"#2962FF"` | Line color. |
| `lineWidth` | `number` | `2` | Line width. |

**Expected Data Format:**
An array of objects with `time` and `value`.

**Example Data:**
```json
[
  { "time": "2023-10-25", "value": 105.50 }
]
```

**Usage Example (Config format):**
```json
{
  "name": "TradingView Line",
  "componentName": "TvLineChartWidget",
  "defaultProps": {
    "apiUrl": "http://localhost:8080/api/price-history",
    "lineColor": "#FF9800",
    "lineWidth": 3,
    "darkMode": false,
    "fetchMode": "manual",
    "parameters": []
  }
}
```

---

### TvLiveCandlestickChartWidget
A real-time candlestick chart using `lightweight-charts`.

**Props:**
| detailed prop | type | default | description |
|---|---|---|---|
| `upColor` | `string` | `"#26a69a"` | Color for bullish candles. |
| `downColor` | `string` | `"#ef5350"` | Color for bearish candles. |
| `timeFormat` | `'date' \| 'time'` | `'date'` | Time axis format. |

**Expected Data Format:**
- **REST:** Array of OHLC objects compatible with `lightweight-charts`.
- **WebSocket:** `{ type: "update", data: { time, open, high, low, close } }`.

**Example WebSocket:**
```json
{
  "type": "update",
  "data": { "time": "2023-10-25T14:30:00Z", "open": 105, "high": 106, "low": 104, "close": 105.5 }
}
```

**Usage Example (Config format):**
```json
{
  "name": "Live TV Candles",
  "componentName": "TvLiveCandlestickChartWidget",
  "defaultProps": {
    "apiUrl": "http://localhost:8080/api/hist/ohlc",
    "wsUrl": "wss://stream.example.com/candles",
    "timeFormat": "time",
    "upColor": "#26a69a",
    "downColor": "#ef5350",
    "darkMode": true,
    "fetchMode": "manual",
    "parameters": [
      { "name": "symbol", "label": "Symbol", "type": "text", "defaultValue": "ETHUSD", "required": true }
    ]
  }
}
```

---

### TvLiveLineChartWidget
A real-time line chart using `lightweight-charts`.

**Props:**
| detailed prop | type | default | description |
|---|---|---|---|
| `lineColor` | `string` | `"#2962FF"` | Line color. |
| `timeFormat` | `'date' \| 'time'` | `'date'` | Time axis format. |

**Expected Data Format:**
- **REST:** Array of `{ time, value }`.
- **WebSocket:** `{ type: "update", data: { time, value } }`.

**Example WebSocket:**
```json
{
  "type": "update",
  "data": { "time": "2023-10-25T14:30:00Z", "value": 105.75 }
}
```

**Usage Example (Config format):**
```json
{
  "name": "Live TV Line",
  "componentName": "TvLiveLineChartWidget",
  "defaultProps": {
    "apiUrl": "http://localhost:8080/api/hist/price",
    "wsUrl": "wss://stream.example.com/price",
    "timeFormat": "time",
    "lineColor": "#00E5FF",
    "darkMode": true,
    "fetchMode": "manual",
    "parameters": [
      { "name": "symbol", "label": "Symbol", "type": "text", "defaultValue": "SOLUSD", "required": true }
    ]
  }
}
```

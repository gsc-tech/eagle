# Dashboard Builder Component

## Overview
The new dashboard builder (`dash-builder.tsx`) replaces the Puck-based implementation with a custom solution using `react-dnd` and `react-grid-layout`.

## Architecture

### Components

#### 1. `dash-builder.tsx` (Main Component)
- Entry point for the dashboard builder
- Fetches widgets from `/widget` endpoint
- Wraps the application in `DndProvider` for drag-and-drop functionality
- Contains the main layout with sidebar and canvas

#### 2. `Sidebar.tsx`
- Displays available widgets fetched from the backend
- Each widget is rendered as a draggable item
- Uses `react-dnd` for drag functionality
- Shows widget name, description, and component name

#### 3. `types.ts`
- Centralized type definitions for drag-and-drop
- Defines `DragItem`, `LayoutItem`, and `WIDGET_DRAG_TYPE`

## Features Implemented

### ✅ Widget Sidebar
- Fetches widgets from `/widget` endpoint
- Displays widgets as draggable boxes
- Shows widget metadata (name, description, component name)
- Visual feedback during dragging (opacity, scale, hover effects)
- Loading state and empty state handling

### ✅ Droppable Canvas
- Accepts widgets dragged from sidebar
- Widgets remain in sidebar after drop (can add multiple instances)
- Full-screen width, auto-expanding height
- Visual feedback during drag-over
- Empty state with instructions

### ✅ Resizable Widgets
- All widgets are resizable using react-grid-layout v2
- 4 resize handles (all corners: SE, SW, NE, NW)
- Minimum size: 2×2 grid units
- Default size: 4 columns × 3 rows (60px per row)
- Smooth resizing with real-time feedback

### ✅ Grid Layout
- 12-column responsive grid
- 60px row height
- 16px margins between widgets
- Vertical compaction (widgets stack automatically)
- No overlapping (unless manually placed)

### ✅ Widget Management
- Remove widgets with hover button (X)
- Multiple instances of same widget
- Unique ID for each instance
- Layout state tracking

### 🚧 To Be Implemented
- Widget configuration editor (edit props on canvas)
- Save/Publish functionality with backend integration
- Load existing dashboards
- Undo/Redo functionality
- Keyboard shortcuts
- Widget duplication
- Widget configuration

## Libraries Used

- **react-dnd**: Drag and drop functionality
- **react-dnd-html5-backend**: HTML5 backend for react-dnd
- **react-grid-layout**: Grid layout with resizable widgets (v2)

## API Integration

The component calls the `/widget` endpoint which returns:
```typescript
type widgetGroup = Record<string, widgetInfo[]>

type widgetInfo = {
  widgetId: string;
  config: BackendWidgetConfig;
}

type BackendWidgetConfig = {
  name: string;
  componentName: string;
  defaultProps: Record<string, any>;
  description?: string;
  [key: string]: any;
}
```

## Next Steps

1. **Create DroppableCanvas Component**
   - Use `useDrop` from react-dnd
   - Integrate react-grid-layout
   - Handle widget drops and positioning

2. **Create WidgetRenderer Component**
   - Render actual widget components on canvas
   - Handle resizing with react-grid-layout
   - Manage widget state

3. **Implement Save/Publish**
   - Save layout to backend
   - Publish dashboard

## Usage

To use the new dashboard builder, navigate to the route that renders `DashBuilder`:

```tsx
import DashBuilder from "@/pages/dash-builder";

// In your router
<Route path="/dash-builder" element={<DashBuilder />} />
```

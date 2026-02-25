import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import type { LayoutItem } from "./types";
interface DroppableCanvasProps {
    onLayoutChange?: (layout: LayoutItem[]) => void;
    initialLayout?: LayoutItem[];
    isReadOnly?: boolean;
}
export default function DroppableCanvas({ onLayoutChange, initialLayout, isReadOnly }: DroppableCanvasProps): import("react/jsx-runtime").JSX.Element;
export {};

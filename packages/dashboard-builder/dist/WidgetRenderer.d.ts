import type { LayoutItem } from "./types";
interface WidgetRendererProps {
    layoutItem: LayoutItem;
    onRemove: (id: string) => void;
    isReadOnly?: boolean;
}
export default function WidgetRenderer({ layoutItem, onRemove, isReadOnly }: WidgetRendererProps): import("react/jsx-runtime").JSX.Element;
export {};

import { type widgetGroupWithStatus } from "./types";
interface WidgetSidebarProps {
    widgetGroups: widgetGroupWithStatus;
    loading: boolean;
    onRefreshBackend?: (backendName: string) => void;
}
export default function WidgetSidebar({ widgetGroups, loading, onRefreshBackend }: WidgetSidebarProps): import("react/jsx-runtime").JSX.Element;
export {};

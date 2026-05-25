import {
    BarChart2,
    BarChart,
    Activity,
    TrendingUp,
    LayoutDashboard,
    Database,
    Bell,
    Search,
} from "lucide-react";

export interface FalconPropDef {
    key: string;
    label: string;
    type: "text" | "select";
    placeholder?: string;
    hint?: string;
    options?: string[];
    defaultValue?: string;
    required?: boolean;
}

export interface FalconWidgetDef {
    componentName: string;
    label: string;
    description: string;
    icon: React.ElementType;
    defaultWidth: number;
    defaultHeight: number;
    /** Props baked in regardless of user input (e.g. mode: "standalone") */
    staticProps?: Record<string, unknown>;
    props: FalconPropDef[];
}

const YEARS_OPTIONS = ["1", "2", "5", "10", "All"];

const GROUP_ID_PROP: FalconPropDef = {
    key: "groupId",
    label: "Group ID",
    type: "text",
    placeholder: "seasonality-expr",
    hint: "Widgets sharing the same Group ID sync their expression and cursor across the dashboard",
};

const YEARS_PROP: FalconPropDef = {
    key: "yearsBack",
    label: "Default Years Back",
    type: "select",
    options: YEARS_OPTIONS,
    defaultValue: "10",
};

const EXPRESSION_PROP: FalconPropDef = {
    key: "defaultExpression",
    label: "Expression",
    type: "text",
    placeholder: "e.g. RBH26 - RBJ26",
    hint: "Falcon expression to display. Can be changed inside the widget at any time.",
};

const MODE_PROP: FalconPropDef = {
    key: "mode",
    label: "Mode",
    type: "select",
    options: ["bound", "standalone"],
    defaultValue: "bound",
    hint: "\"bound\" — reads expression from the Group ID (link to a builder). \"standalone\" — has its own expression input.",
};

export const FALCON_WIDGETS: FalconWidgetDef[] = [
    // ── With-Builder composites (self-contained, recommended) ──────────────────
    {
        componentName: "SeasonalityStackedChartWithBuilderWidget",
        label: "Stacked + Builder",
        description: "Expression builder above a stacked year-over-year chart",
        icon: BarChart2,
        defaultWidth: 8,
        defaultHeight: 9,
        props: [GROUP_ID_PROP, YEARS_PROP],
    },
    {
        componentName: "SeasonalityMonthlyChartWithBuilderWidget",
        label: "Monthly + Builder",
        description: "Expression builder above a monthly step-band chart",
        icon: Activity,
        defaultWidth: 8,
        defaultHeight: 9,
        props: [GROUP_ID_PROP, YEARS_PROP],
    },
    {
        componentName: "SeasonalityAverageChartWithBuilderWidget",
        label: "Average + Builder",
        description: "Expression builder above an average overlay chart",
        icon: TrendingUp,
        defaultWidth: 8,
        defaultHeight: 9,
        props: [GROUP_ID_PROP, YEARS_PROP],
    },
    {
        componentName: "SeasonalityHeatmapWithBuilderWidget",
        label: "Heatmap + Builder",
        description: "Expression builder above a red/white/green heatmap",
        icon: LayoutDashboard,
        defaultWidth: 8,
        defaultHeight: 9,
        props: [GROUP_ID_PROP, YEARS_PROP],
    },
    // ── Chart-only (bound to a builder via groupId, or standalone with own input) ──
    {
        componentName: "SeasonalityStackedChartWidget",
        label: "Stacked Chart",
        description: "Chart only — bind to a builder via Group ID or use standalone",
        icon: BarChart,
        defaultWidth: 6,
        defaultHeight: 7,
        props: [MODE_PROP, GROUP_ID_PROP, EXPRESSION_PROP, YEARS_PROP],
    },
    {
        componentName: "SeasonalityMonthlyChartWidget",
        label: "Monthly Chart",
        description: "Chart only — bind to a builder via Group ID or use standalone",
        icon: Activity,
        defaultWidth: 6,
        defaultHeight: 7,
        props: [MODE_PROP, GROUP_ID_PROP, EXPRESSION_PROP, YEARS_PROP],
    },
    {
        componentName: "SeasonalityAverageChartWidget",
        label: "Average Chart",
        description: "Chart only — bind to a builder via Group ID or use standalone",
        icon: TrendingUp,
        defaultWidth: 6,
        defaultHeight: 7,
        props: [MODE_PROP, GROUP_ID_PROP, EXPRESSION_PROP, YEARS_PROP],
    },
    {
        componentName: "SeasonalityHeatmapWidget",
        label: "Heatmap Chart",
        description: "Chart only — bind to a builder via Group ID or use standalone",
        icon: LayoutDashboard,
        defaultWidth: 6,
        defaultHeight: 7,
        props: [MODE_PROP, GROUP_ID_PROP, EXPRESSION_PROP, YEARS_PROP],
    },
    // ── Utility widgets ────────────────────────────────────────────────────────
    {
        componentName: "SeasonalityExpressionBuilderWidget",
        label: "Expression Builder",
        description: "Search and compose Falcon market expressions",
        icon: Search,
        defaultWidth: 5,
        defaultHeight: 8,
        props: [GROUP_ID_PROP],
    },
    {
        componentName: "SeasonalityWatchlistWidget",
        label: "Watchlist",
        description: "Track favourite expressions with sparklines and alerts",
        icon: Database,
        defaultWidth: 4,
        defaultHeight: 8,
        props: [],
    },
    {
        componentName: "SeasonalityAlertsWidget",
        label: "Alerts",
        description: "Manage and review seasonality alert thresholds",
        icon: Bell,
        defaultWidth: 5,
        defaultHeight: 8,
        props: [],
    },
];

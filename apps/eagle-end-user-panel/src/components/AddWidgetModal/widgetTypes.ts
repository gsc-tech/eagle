import {
    BarChart2,
    TrendingUp,
    Activity,
    PieChart,
    ScatterChart,
    Table2,
    LayoutDashboard,
    BarChartHorizontal,
    BookOpen,
    TableProperties,
} from "lucide-react";

export interface CuratedWidget {
    componentName: string;
    label: string;
    description: string;
    icon: React.ElementType;
    /** If true: added directly without CSV upload steps. */
    isBackOffice?: boolean;
}

export const CURATED_WIDGETS: CuratedWidget[] = [
    {
        componentName: "BarChartWidget",
        label: "Bar Chart",
        description: "Compare values across categories",
        icon: BarChart2,
    },
    {
        componentName: "LineChartWidget",
        label: "Line Chart",
        description: "Visualize trends over time or categories",
        icon: TrendingUp,
    },
    {
        componentName: "AreaChartWidget",
        label: "Area Chart",
        description: "Show cumulative data over time",
        icon: Activity,
    },
    {
        componentName: "PieChartWidget",
        label: "Pie Chart",
        description: "Show proportions of a whole",
        icon: PieChart,
    },
    {
        componentName: "ScatterPlotWidget",
        label: "Scatter Plot",
        description: "Explore correlations between two numeric fields",
        icon: ScatterChart,
    },
    {
        componentName: "DataTableWidget",
        label: "Data Table",
        description: "Display all columns with sorting & filtering",
        icon: Table2,
    },
    {
        componentName: "MetricWidget",
        label: "Metric Cards",
        description: "Show key numbers with optional delta indicators",
        icon: LayoutDashboard,
    },
];

export const BACKOFFICE_WIDGETS: CuratedWidget[] = [
    {
        componentName: "BackOfficeTopbarWidget",
        label: "BO Topbar",
        description: "Account + date filter bar. Place at the top of a BackOffice dashboard.",
        icon: BarChartHorizontal,
        isBackOffice: true,
    },
    {
        componentName: "FinancialAnalysisWidget",
        label: "Financial Chart",
        description: "Configurable chart / table / KPI powered by BackOffice financial data.",
        icon: TrendingUp,
        isBackOffice: true,
    },
    {
        componentName: "StatementTabsWidget",
        label: "Statement Tabs",
        description: "Daily / Weekly / Monthly financial statement table.",
        icon: TableProperties,
        isBackOffice: true,
    }
];

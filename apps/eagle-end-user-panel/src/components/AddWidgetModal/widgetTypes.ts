import {
    BarChart2,
    TrendingUp,
    Activity,
    PieChart,
    ScatterChart,
    Table2,
    LayoutDashboard,
} from "lucide-react";

export interface CuratedWidget {
    componentName: string;
    label: string;
    description: string;
    icon: React.ElementType;
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

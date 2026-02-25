import type { Meta, StoryObj } from "@storybook/react";
import { DataTableWidget } from "../widgets/DataTableWidget";
import { mockTableData } from "./mocks/mockWidgetData";
import { useMemo, useState } from "react";
import {
    createColumnHelper,
    flexRender,
    getCoreRowModel,
    getSortedRowModel,
    useReactTable,
    type SortingState
} from "@tanstack/react-table";
import { WidgetContainer } from "../components/WidgetContainer";
import type { BaseWidgetProps } from "../types";

// Wrapper component that displays data table without API calls
const DataTableStoryWrapper: React.FC<BaseWidgetProps & { dummyData: any[] }> = ({
    parameters = [],
    fetchMode = 'manual',
    dummyData
}) => {
    const [sorting, setSorting] = useState<SortingState>([]);

    const columns = useMemo(() => {
        if (!dummyData || dummyData.length === 0) return [];

        const helper = createColumnHelper<any>();
        const keys = Object.keys(dummyData[0]);

        return keys.map((key) =>
            helper.accessor(key, {
                header: () => <span className="capitalize">{key.replace(/_/g, ' ')}</span>,
                cell: (info) => {
                    const val = info.getValue();
                    if (typeof val === 'number') {
                        return (
                            <span className="font-mono text-text-primary">
                                {val.toLocaleString()}
                            </span>
                        );
                    }
                    return <span className="text-text-secondary">{val}</span>;
                }
            })
        )
    }, [dummyData]);

    const table = useReactTable({
        data: dummyData,
        columns,
        state: {
            sorting,
        },
        onSortingChange: setSorting,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
    });

    return (
        <WidgetContainer
            parameters={parameters}
            onParametersChange={() => { }}
            fetchMode={fetchMode}
        >
            <div className="overflow-auto h-full scrollbar-thin scrollbar-thumb-border-light scrollbar-track-transparent">
                <table className="w-full border-collapse text-xs">
                    <thead className="bg-bg-light/80 backdrop-blur sticky top-0 z-10 border-b border-border-light">
                        {table.getHeaderGroups().map((headerGroup) => (
                            <tr key={headerGroup.id}>
                                {headerGroup.headers.map((header) => (
                                    <th
                                        key={header.id}
                                        className="px-4 py-2 text-left font-semibold text-text-secondary uppercase tracking-wider cursor-pointer hover:text-chart-primary transition-colors select-none"
                                        onClick={header.column.getToggleSortingHandler()}
                                    >
                                        <div className="flex items-center gap-1">
                                            {header.isPlaceholder
                                                ? null
                                                : flexRender(
                                                    header.column.columnDef.header,
                                                    header.getContext()
                                                )}
                                            {{
                                                asc: ' ↑',
                                                desc: ' ↓',
                                            }[header.column.getIsSorted() as string] ?? null}
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        ))}
                    </thead>
                    <tbody className="bg-white">
                        {table.getRowModel().rows.length === 0 ? (
                            <tr>
                                <td
                                    colSpan={columns.length}
                                    className="px-4 py-8 text-center text-text-muted"
                                >
                                    No data available
                                </td>
                            </tr>
                        ) : (
                            table.getRowModel().rows.map((row) => (
                                <tr
                                    key={row.id}
                                    className="border-b border-border-light hover:bg-bg-light transition-colors group"
                                >
                                    {row.getVisibleCells().map((cell) => (
                                        <td
                                            key={cell.id}
                                            className="px-4 py-2.5 text-left whitespace-nowrap"
                                        >
                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </td>
                                    ))}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </WidgetContainer>
    );
};

const meta: Meta<typeof DataTableStoryWrapper> = {
    title: "Widgets/DataTableWidget",
    component: DataTableStoryWrapper,
    args: {
        fetchMode: "manual",
        parameters: [],
        dummyData: mockTableData,
    },
};

export default meta;

type Story = StoryObj<typeof DataTableStoryWrapper>;

export const Default: Story = {
    args: {
        dummyData: mockTableData,
    },
};

export const EmptyState: Story = {
    args: {
        dummyData: [],
    },
};

export const LargeDataset: Story = {
    args: {
        dummyData: Array.from({ length: 50 }).map((_, i) => ({
            symbol: `STOCK_${i}`,
            price: Math.round(1000 + Math.random() * 1000),
            change: Math.round(-50 + Math.random() * 100),
            volume: Math.round(Math.random() * 1_000_000),
        })),
    },
};

export const CustomData: Story = {
    args: {
        dummyData: [
            {
                symbol: "RELIANCE",
                price: 2450,
                change: 35,
                volume: 2500000,
            },
            {
                symbol: "TCS",
                price: 3680,
                change: -15,
                volume: 1800000,
            },
            {
                symbol: "INFY",
                price: 1520,
                change: 22,
                volume: 3200000,
            },
            {
                symbol: "HDFC",
                price: 1680,
                change: -8,
                volume: 1950000,
            },
        ],
    },
};

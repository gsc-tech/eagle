import type { Meta, StoryObj } from "@storybook/react";
import { RealtimeDataTableWidget } from "../widgets/RealtimeDataTableWidget";
import { mockTableData } from "./mocks/mockWidgetData";
import { useMemo, useState, useEffect } from "react";
import {
    createColumnHelper,
    flexRender,
    getCoreRowModel,
    getSortedRowModel,
    useReactTable,
    type SortingState,
} from "@tanstack/react-table";
import { WidgetContainer } from "../components/WidgetContainer";
import type { BaseWidgetProps } from "../types";

interface RealtimeDataTableStoryProps extends BaseWidgetProps {
    dummyData: any[];
    primaryKey?: string;
}

const RealtimeDataTableStoryWrapper: React.FC<RealtimeDataTableStoryProps> = ({
    parameters = [],
    fetchMode = 'manual',
    dummyData,
    primaryKey = "id",
}) => {
    const [sorting, setSorting] = useState<SortingState>([]);
    const [data, setData] = useState<any[]>([]);

    useEffect(() => {
        if (dummyData && Array.isArray(dummyData)) {
            setData(dummyData);
        }
    }, [dummyData]);

    const columns = useMemo(() => {
        if (!data.length) return [];

        const helper = createColumnHelper<any>();
        const keys = Object.keys(data[0]);

        return keys.map((key) =>
            helper.accessor(key, {
                header: () => (
                    <span className="capitalize">{key.replace(/_/g, " ")}</span>
                ),
                cell: (info) => {
                    const val = info.getValue();
                    if (typeof val === "number") return val.toLocaleString();
                    return val ?? "-";
                },
            })
        );
    }, [data]);

    const table = useReactTable({
        data,
        columns,
        state: { sorting },
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
            <div className="relative w-full h-full overflow-auto">
                {/* Connection indicator (disconnected in storybook) */}
                <div className="absolute top-2 right-2 z-10">
                    <div
                        className="w-3 h-3 rounded-full bg-gray-400"
                        title="WebSocket not connected (Storybook mode)"
                    />
                </div>

                <table className="w-full border-collapse text-sm">
                    <thead className="bg-white sticky top-0 z-10">
                        {table.getHeaderGroups().map((headerGroup) => (
                            <tr key={headerGroup.id}>
                                {headerGroup.headers.map((header) => (
                                    <th
                                        key={header.id}
                                        className="px-4 py-3 text-center font-medium border cursor-pointer bg-gray-50"
                                        onClick={header.column.getToggleSortingHandler()}
                                    >
                                        {flexRender(
                                            header.column.columnDef.header,
                                            header.getContext()
                                        )}
                                        {{
                                            asc: " 🔼",
                                            desc: " 🔽",
                                        }[header.column.getIsSorted() as string] ?? null}
                                    </th>
                                ))}
                            </tr>
                        ))}
                    </thead>

                    <tbody>
                        {table.getRowModel().rows.length === 0 ? (
                            <tr>
                                <td
                                    colSpan={columns.length}
                                    className="px-4 py-3 text-center border"
                                >
                                    No data available
                                </td>
                            </tr>
                        ) : (
                            table.getRowModel().rows.map((row) => (
                                <tr key={row.id}>
                                    {row.getVisibleCells().map((cell) => (
                                        <td
                                            key={cell.id}
                                            className="px-4 py-3 text-center border"
                                        >
                                            {flexRender(
                                                cell.column.columnDef.cell,
                                                cell.getContext()
                                            )}
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

const meta: Meta<typeof RealtimeDataTableStoryWrapper> = {
    title: "Widgets/RealtimeDataTableWidget",
    component: RealtimeDataTableStoryWrapper,
    args: {
        fetchMode: "manual",
        parameters: [],
        dummyData: mockTableData,
        primaryKey: "symbol",
    },
    parameters: {
        layout: 'padded',
    },
};

export default meta;

type Story = StoryObj<typeof RealtimeDataTableStoryWrapper>;

export const Default: Story = {
    args: {
        dummyData: mockTableData,
    },
};

export const EmptyTable: Story = {
    args: {
        dummyData: [],
    },
};

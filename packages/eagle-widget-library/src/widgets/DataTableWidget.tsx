"use client"

import { useMemo, useState } from "react";
import {
    createColumnHelper,
    flexRender,
    getCoreRowModel,
    getSortedRowModel,
    useReactTable,
    type SortingState
} from "@tanstack/react-table"
import type { BaseWidgetProps, ParameterValues } from "../types";
import { useWidgetData } from "../hooks/useWidgetData";
import { useParameterDefaults } from "../hooks/useParameterDefaults";
import { WidgetContainer } from "../components/WidgetContainer";


export const DataTableWidget: React.FC<BaseWidgetProps & { darkMode?: boolean }> = ({
    apiUrl = "http://localhost:8080/api/data",
    title,
    parameters,
    darkMode = false,
    onGroupedParametersChange,
    groupedParametersValues
}) => {
    const [sorting, setSorting] = useState<SortingState>([]);

    const defaultParams = useParameterDefaults(parameters);
    const [currentParams, setCurrentParams] = useState<ParameterValues>(defaultParams);

    const { data } = useWidgetData(apiUrl as string, {
        pollInterval: 2000,
        parameters: currentParams,
    });

    const handleParametersChange = (values: ParameterValues) => {
        setCurrentParams(values);
    };

    const columns = useMemo(() => {
        if (!data || data.length === 0) return [];

        const helper = createColumnHelper<any>();
        const keys = Object.keys(data[0]);

        return keys.map((key) =>
            helper.accessor(key, {
                header: () => <span className="capitalize">{key.replace(/_/g, ' ')}</span>,
                cell: (info) => {
                    const val = info.getValue();
                    if (typeof val === 'number') {
                        return (
                            <span className={`font-mono ${darkMode ? 'text-gray-200' : 'text-text-primary'}`}>
                                {val.toLocaleString()}
                            </span>
                        );
                    }
                    return <span className={darkMode ? 'text-gray-400' : 'text-text-secondary'}>{val}</span>;
                }
            })
        )
    }, [data]);

    const table = useReactTable({
        data,
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
            title={title}
            parameters={parameters}
            onParametersChange={handleParametersChange}
            darkMode={darkMode}
            onGroupedParametersChange={onGroupedParametersChange}
            groupedParametersValues={groupedParametersValues}
        >
            <div className="overflow-auto h-full scrollbar-thin scrollbar-thumb-border-light scrollbar-track-transparent">
                <table className="w-full border-collapse text-xs">
                    <thead className={`backdrop-blur sticky top-0 z-10 border-b ${darkMode
                        ? 'bg-gray-900/90 border-gray-700'
                        : 'bg-bg-light/80 border-border-light'
                        }`}>
                        {table.getHeaderGroups().map((headerGroup) => (
                            <tr key={headerGroup.id}>
                                {headerGroup.headers.map((header) => (
                                    <th
                                        key={header.id}
                                        className={`px-4 py-2 text-left font-semibold uppercase tracking-wider cursor-pointer transition-colors select-none ${darkMode
                                            ? 'text-gray-400 hover:text-chart-primary'
                                            : 'text-text-secondary hover:text-chart-primary'
                                            }`}
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
                    <tbody className={darkMode ? 'bg-transparent' : 'bg-white'}>
                        {table.getRowModel().rows.length === 0 ? (
                            <tr>
                                <td
                                    colSpan={columns.length}
                                    className={`px-4 py-8 text-center ${darkMode ? 'text-gray-500' : 'text-text-muted'}`}
                                >
                                    No data available
                                </td>
                            </tr>
                        ) : (
                            table.getRowModel().rows.map((row) => (
                                <tr
                                    key={row.id}
                                    className={`border-b transition-colors group ${darkMode
                                        ? 'border-gray-800 hover:bg-white/5'
                                        : 'border-border-light hover:bg-bg-light'
                                        }`}
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


export const DataTableWidgetDef = {
    component: DataTableWidget,
}

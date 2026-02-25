"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useState } from "react";
import { createColumnHelper, flexRender, getCoreRowModel, getSortedRowModel, useReactTable } from "@tanstack/react-table";
import { useWidgetData } from "../hooks/useWidgetData";
import { useParameterDefaults } from "../hooks/useParameterDefaults";
import { WidgetContainer } from "../components/WidgetContainer";
export const DataTableWidget = ({ apiUrl = "http://localhost:8080/api/data", title, parameters, darkMode = false, onGroupedParametersChange, groupedParametersValues }) => {
    const [sorting, setSorting] = useState([]);
    const defaultParams = useParameterDefaults(parameters);
    const [currentParams, setCurrentParams] = useState(defaultParams);
    const { data } = useWidgetData(apiUrl, {
        pollInterval: 2000,
        parameters: currentParams,
    });
    const handleParametersChange = (values) => {
        setCurrentParams(values);
    };
    const columns = useMemo(() => {
        if (!data || data.length === 0)
            return [];
        const helper = createColumnHelper();
        const keys = Object.keys(data[0]);
        return keys.map((key) => helper.accessor(key, {
            header: () => _jsx("span", { className: "capitalize", children: key.replace(/_/g, ' ') }),
            cell: (info) => {
                const val = info.getValue();
                if (typeof val === 'number') {
                    return (_jsx("span", { className: `font-mono ${darkMode ? 'text-gray-200' : 'text-text-primary'}`, children: val.toLocaleString() }));
                }
                return _jsx("span", { className: darkMode ? 'text-gray-400' : 'text-text-secondary', children: val });
            }
        }));
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
    return (_jsx(WidgetContainer, { title: title, parameters: parameters, onParametersChange: handleParametersChange, darkMode: darkMode, onGroupedParametersChange: onGroupedParametersChange, groupedParametersValues: groupedParametersValues, children: _jsx("div", { className: "overflow-auto h-full scrollbar-thin scrollbar-thumb-border-light scrollbar-track-transparent", children: _jsxs("table", { className: "w-full border-collapse text-xs", children: [_jsx("thead", { className: `backdrop-blur sticky top-0 z-10 border-b ${darkMode
                            ? 'bg-gray-900/90 border-gray-700'
                            : 'bg-bg-light/80 border-border-light'}`, children: table.getHeaderGroups().map((headerGroup) => (_jsx("tr", { children: headerGroup.headers.map((header) => (_jsx("th", { className: `px-4 py-2 text-left font-semibold uppercase tracking-wider cursor-pointer transition-colors select-none ${darkMode
                                    ? 'text-gray-400 hover:text-chart-primary'
                                    : 'text-text-secondary hover:text-chart-primary'}`, onClick: header.column.getToggleSortingHandler(), children: _jsxs("div", { className: "flex items-center gap-1", children: [header.isPlaceholder
                                            ? null
                                            : flexRender(header.column.columnDef.header, header.getContext()), {
                                            asc: ' ↑',
                                            desc: ' ↓',
                                        }[header.column.getIsSorted()] ?? null] }) }, header.id))) }, headerGroup.id))) }), _jsx("tbody", { className: darkMode ? 'bg-transparent' : 'bg-white', children: table.getRowModel().rows.length === 0 ? (_jsx("tr", { children: _jsx("td", { colSpan: columns.length, className: `px-4 py-8 text-center ${darkMode ? 'text-gray-500' : 'text-text-muted'}`, children: "No data available" }) })) : (table.getRowModel().rows.map((row) => (_jsx("tr", { className: `border-b transition-colors group ${darkMode
                                ? 'border-gray-800 hover:bg-white/5'
                                : 'border-border-light hover:bg-bg-light'}`, children: row.getVisibleCells().map((cell) => (_jsx("td", { className: "px-4 py-2.5 text-left whitespace-nowrap", children: flexRender(cell.column.columnDef.cell, cell.getContext()) }, cell.id))) }, row.id)))) })] }) }) }));
};
export const DataTableWidgetDef = {
    component: DataTableWidget,
};

"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useState, useEffect, useRef } from "react";
import { createColumnHelper, flexRender, getCoreRowModel, getSortedRowModel, useReactTable, } from "@tanstack/react-table";
import { useWidgetData } from "../hooks/useWidgetData";
import { useParameterDefaults } from "../hooks/useParameterDefaults";
import { WidgetContainer } from "../components/WidgetContainer";
import { useRealtimeWidgetData, } from "../hooks/useRealtimeWidgetData";
export const RealtimeDataTableWidget = ({ apiUrl = "http://localhost:8080/api/data", title, wsUrl = "", primaryKey = "id", parameters, darkMode = false, groupedParametersValues, onGroupedParametersChange, }) => {
    const [sorting, setSorting] = useState([]);
    // ✅ Parameters
    const defaultParams = useParameterDefaults(parameters);
    const [currentParams, setCurrentParams] = useState(defaultParams);
    // ✅ REST API — Initial Data
    const { data: rawData } = useWidgetData(apiUrl, {
        parameters: currentParams,
    });
    // ✅ Local table state
    const [data, setData] = useState([]);
    // ✅ Blink State
    const [blinkMap, setBlinkMap] = useState({});
    const prevDataRef = useRef([]);
    // ✅ Load REST data into table
    useEffect(() => {
        if (rawData && Array.isArray(rawData)) {
            setData(rawData);
            prevDataRef.current = rawData;
        }
    }, [rawData]);
    // ✅ WebSocket Realtime Updates
    const { isConnected } = useRealtimeWidgetData({
        wsUrl,
        currentParams,
        messageParser: (message) => {
            if (message.type === "update" && message.data) {
                return message.data; // ✅ full updated row
            }
            return null;
        },
        onUpdate: (updateRow) => {
            setData((prev) => {
                const index = prev.findIndex((row) => row?.[primaryKey] === updateRow?.[primaryKey]);
                // ✅ New row
                if (index === -1) {
                    return [updateRow, ...prev];
                }
                // ✅ Existing row update
                const updated = [...prev];
                updated[index] = updateRow;
                return updated;
            });
        },
    });
    // ✅ Blink Detection Logic
    useEffect(() => {
        if (!data.length)
            return;
        const prevData = prevDataRef.current;
        const newBlinkMap = {};
        data.forEach((row) => {
            const rowId = row?.[primaryKey];
            const prevRow = prevData.find((r) => r?.[primaryKey] === rowId);
            if (!prevRow)
                return;
            Object.keys(row).forEach((key) => {
                const currVal = row[key];
                const prevVal = prevRow[key];
                if (typeof currVal === "number" && currVal !== prevVal) {
                    const direction = currVal > prevVal ? "up" : "down";
                    if (!newBlinkMap[rowId]) {
                        newBlinkMap[rowId] = {};
                    }
                    newBlinkMap[rowId][key] = direction;
                    // ✅ Clear blink after 300ms
                    setTimeout(() => {
                        setBlinkMap((prev) => ({
                            ...prev,
                            [rowId]: {
                                ...prev[rowId],
                                [key]: null,
                            },
                        }));
                    }, 300);
                }
            });
        });
        if (Object.keys(newBlinkMap).length > 0) {
            setBlinkMap((prev) => ({
                ...prev,
                ...newBlinkMap,
            }));
        }
        prevDataRef.current = data;
    }, [data, primaryKey]);
    const handleParametersChange = (values) => {
        setCurrentParams(values);
    };
    // ✅ Dynamic Columns
    const columns = useMemo(() => {
        if (!data.length)
            return [];
        const helper = createColumnHelper();
        const keys = Object.keys(data[0]);
        return keys.map((key) => helper.accessor(key, {
            header: () => (_jsx("span", { className: "capitalize", children: key.replace(/_/g, " ") })),
            cell: (info) => {
                const val = info.getValue();
                if (typeof val === "number")
                    return val.toLocaleString();
                return val ?? "-";
            },
        }));
    }, [data]);
    const table = useReactTable({
        data,
        columns,
        state: { sorting },
        onSortingChange: setSorting,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
    });
    return (_jsx(WidgetContainer, { title: title, parameters: parameters, onParametersChange: handleParametersChange, darkMode: darkMode, onGroupedParametersChange: onGroupedParametersChange, groupedParametersValues: groupedParametersValues, children: _jsxs("div", { className: "relative w-full h-full overflow-auto", children: [wsUrl && (_jsx("div", { className: "absolute top-2 right-2 z-10", children: _jsx("div", { className: `w-3 h-3 rounded-full ${isConnected ? "bg-green-500" : "bg-red-500"}`, title: isConnected ? "Connected" : "Disconnected" }) })), _jsxs("table", { className: "w-full border-collapse text-sm", children: [_jsx("thead", { className: `${darkMode ? 'bg-gray-900' : 'bg-white'} sticky top-0 z-10`, children: table.getHeaderGroups().map((headerGroup) => (_jsx("tr", { children: headerGroup.headers.map((header) => (_jsxs("th", { className: `px-4 py-3 text-center font-medium border cursor-pointer ${darkMode ? 'bg-gray-800 border-gray-700 text-gray-200' : 'bg-bg-light'}`, onClick: header.column.getToggleSortingHandler(), children: [flexRender(header.column.columnDef.header, header.getContext()), {
                                            asc: " 🔼",
                                            desc: " 🔽",
                                        }[header.column.getIsSorted()] ?? null] }, header.id))) }, headerGroup.id))) }), _jsx("tbody", { children: table.getRowModel().rows.length === 0 ? (_jsx("tr", { children: _jsx("td", { colSpan: columns.length, className: `px-4 py-3 text-center border ${darkMode ? 'border-gray-700 text-gray-400' : ''}`, children: "No data available" }) })) : (table.getRowModel().rows.map((row) => {
                                const rowId = row.original?.[primaryKey];
                                return (_jsx("tr", { className: darkMode ? 'hover:bg-gray-800/50' : 'hover:bg-gray-50', children: row.getVisibleCells().map((cell) => {
                                        const colKey = cell.column.id;
                                        const blink = blinkMap[rowId]?.[colKey] ?? null;
                                        return (_jsx("td", { className: `px-4 py-3 text-center border transition-all duration-200
                            ${darkMode ? 'border-gray-700 text-gray-200' : ''}
                            ${blink === "up"
                                                ? "bg-green-300 text-green-900"
                                                : blink === "down"
                                                    ? "bg-red-300 text-red-900"
                                                    : ""}
                          `, children: flexRender(cell.column.columnDef.cell, cell.getContext()) }, cell.id));
                                    }) }, row.id));
                            })) })] })] }) }));
};
export const RealtimeDataTableWidgetDef = {
    component: RealtimeDataTableWidget,
};

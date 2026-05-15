"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
} from "@tanstack/react-table";

import type { BaseWidgetProps, ParameterValues } from "../types";
import { useWidgetData } from "../hooks/useWidgetData";
import { useParameterDefaults } from "../hooks/useParameterDefaults";
import { WidgetContainer } from "../components/WidgetContainer";
import {
  useRealtimeWidgetData,
  type WebSocketMessage,
} from "../hooks/useRealtimeWidgetData";

export interface RealtimeWidgetProps extends BaseWidgetProps {
  wsUrl?: string;
  primaryKey?: string;
}

export const RealtimeDataTableWidget: React.FC<RealtimeWidgetProps & { darkMode?: boolean }> = ({
  apiUrl = "http://localhost:8080/api/data",
  title,
  wsUrl = "",
  primaryKey = "id",
  parameters,
  darkMode = false,
  groupedParametersValues,
  onGroupedParametersChange,
  initialWidgetState,
  onWidgetStateChange,
}) => {
  const [sorting, setSorting] = useState<SortingState>([]);

  const defaultParams = useParameterDefaults(parameters);
  const [currentParams, setCurrentParams] = useState<ParameterValues>(() => {
    return initialWidgetState?.parameters || defaultParams;
  });

  useEffect(() => {
    if (onWidgetStateChange) {
      onWidgetStateChange({ parameters: currentParams });
    }
  }, [currentParams, onWidgetStateChange]);

  const { data: rawData } = useWidgetData(apiUrl as string, {
    parameters: currentParams,
  });

  const [data, setData] = useState<any[]>([]);
  const [blinkMap, setBlinkMap] = useState<Record<string, Record<string, "up" | "down" | null>>>({});
  const prevDataRef = useRef<any[]>([]);

  useEffect(() => {
    if (rawData && Array.isArray(rawData)) {
      setData(rawData);
      prevDataRef.current = rawData;
    }
  }, [rawData]);

  const { isConnected } = useRealtimeWidgetData<any>({
    wsUrl,
    currentParams,
    messageParser: (message: WebSocketMessage) => {
      if (message.type === "update" && message.data) return message.data;
      return null;
    },
    onUpdate: (updateRow) => {
      setData((prev) => {
        const index = prev.findIndex((row) => row?.[primaryKey] === updateRow?.[primaryKey]);
        if (index === -1) return [updateRow, ...prev];
        const updated = [...prev];
        updated[index] = updateRow;
        return updated;
      });
    },
  });

  useEffect(() => {
    if (!data.length) return;
    const prevData = prevDataRef.current;
    const newBlinkMap: typeof blinkMap = {};

    data.forEach((row) => {
      const rowId = row?.[primaryKey];
      const prevRow = prevData.find((r) => r?.[primaryKey] === rowId);
      if (!prevRow) return;

      Object.keys(row).forEach((key) => {
        const currVal = row[key];
        const prevVal = prevRow[key];
        if (typeof currVal === "number" && currVal !== prevVal) {
          const direction = currVal > prevVal ? "up" : "down";
          if (!newBlinkMap[rowId]) newBlinkMap[rowId] = {};
          newBlinkMap[rowId][key] = direction;
          setTimeout(() => {
            setBlinkMap((prev) => ({ ...prev, [rowId]: { ...prev[rowId], [key]: null } }));
          }, 300);
        }
      });
    });

    if (Object.keys(newBlinkMap).length > 0) {
      setBlinkMap((prev) => ({ ...prev, ...newBlinkMap }));
    }
    prevDataRef.current = data;
  }, [data, primaryKey]);

  const handleParametersChange = (values: ParameterValues) => {
    setCurrentParams(values);
  };

  const columns = useMemo(() => {
    if (!data.length) return [];
    const helper = createColumnHelper<any>();
    return Object.keys(data[0]).map((key) =>
      helper.accessor(key, {
        header: () => <span className="capitalize">{key.replace(/_/g, " ")}</span>,
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
      title={title}
      parameters={parameters}
      onParametersChange={handleParametersChange}
      darkMode={darkMode}
      initialParameterValues={currentParams}
      onGroupedParametersChange={onGroupedParametersChange}
      groupedParametersValues={groupedParametersValues}
    >
      <div className="relative w-full h-full overflow-auto">
        {wsUrl && (
          <div className="absolute top-2 right-2 z-10">
            <div
              className={`w-3 h-3 rounded-full ${isConnected ? "bg-green-500" : "bg-red-500"}`}
              title={isConnected ? "Connected" : "Disconnected"}
            />
          </div>
        )}

        <table className="w-full border-collapse text-sm">
          <thead className="bg-white dark:bg-[#141414] sticky top-0 z-10">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="px-4 py-3 text-center font-medium border cursor-pointer bg-bg-light dark:bg-[#1a1a1a] dark:border-[#2e2e2e] dark:text-[#f0f0f0]"
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    {flexRender(header.column.columnDef.header, header.getContext())}
                    {{ asc: " 🔼", desc: " 🔽" }[header.column.getIsSorted() as string] ?? null}
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
                  className="px-4 py-3 text-center border dark:border-[#2e2e2e] dark:text-[#909090]"
                >
                  No data available
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => {
                const rowId = row.original?.[primaryKey];
                return (
                  <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-[#222222]/50">
                    {row.getVisibleCells().map((cell) => {
                      const colKey = cell.column.id;
                      const blink = blinkMap[rowId]?.[colKey] ?? null;
                      return (
                        <td
                          key={cell.id}
                          className={`px-4 py-3 text-center border transition-all duration-200 dark:border-[#2e2e2e] dark:text-[#f0f0f0]
                            ${blink === "up" ? "bg-green-300 text-green-900" : blink === "down" ? "bg-red-300 text-red-900" : ""}
                          `}
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </WidgetContainer>
  );
};

export const RealtimeDataTableWidgetDef = {
  component: RealtimeDataTableWidget,
};

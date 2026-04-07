"use client";

import React, { useEffect, useState } from "react";
import type { BaseWidgetProps, ParameterValues } from "../types";
import { useWidgetData } from "../hooks/useWidgetData";
import { useParameterDefaults } from "../hooks/useParameterDefaults";
import { WidgetContainer } from "../components/WidgetContainer";

/** Types */
interface CalendarEvent {
  id: string;
  datetime: string; // ISO string
  country: string;
  currency?: string;
  event: string;
  importance?: "low" | "medium" | "high";
  actual?: number | string | null;
  forecast?: number | string | null;
  previous?: number | string | null;
}

export interface EconomicCalendarWidgetProps extends BaseWidgetProps {
  defaultCountry?: string;
  defaultImportance?: "low" | "medium" | "high";
  timezone?: "local" | "utc";
}

export const EconomicCalendarWidget: React.FC<EconomicCalendarWidgetProps & { darkMode?: boolean }> = ({
  apiUrl = "http://localhost:8080/api/data",
  title,
  parameters,
  darkMode = false,
  onGroupedParametersChange,
  groupedParametersValues,
  initialWidgetState,
  onWidgetStateChange,
}) => {
  const defaultParams = useParameterDefaults(parameters);
  const [currentParams, setCurrentParams] = useState<ParameterValues>(() => {
    return initialWidgetState?.parameters || defaultParams;
  });

  useEffect(() => {
    if (onWidgetStateChange) {
      onWidgetStateChange({ parameters: currentParams });
    }
  }, [currentParams, onWidgetStateChange]);

  // useWidgetData might return either: [] OR { data: [] }
  const raw = useWidgetData(apiUrl as string, { parameters: currentParams }).data;

  // Normalize to CalendarEvent[]
  const [events, setEvents] = useState<CalendarEvent[]>([]);

  useEffect(() => {
    if (!raw) {
      setEvents([]);
      return;
    }

    // raw can be: any[]  OR { data: any[] }
    let normalized: any[] = [];

    if (Array.isArray(raw)) {
      normalized = raw;
    } else if (raw && Array.isArray((raw as any).data)) {
      normalized = (raw as any).data;
    } else {
      // If the API sometimes returns { data: { events: [] } } or other nesting,
      // you can add more normalization rules here.
      normalized = [];
    }

    // Map & sanitize
    const parsed: CalendarEvent[] = normalized.map((item: any, idx: number) => ({
      id: item.id ?? item.event?.toString() + "_" + idx,
      datetime: item.datetime ?? item.date ?? item.time ?? new Date().toISOString(),
      country: item.country ?? item.iso_country ?? item.country_code ?? "—",
      currency: item.currency ?? item.ccy ?? undefined,
      event: item.event ?? item.title ?? "Unknown",
      importance: item.importance ?? item.impact ?? "low",
      actual: item.actual ?? item.value ?? item.release ?? null,
      forecast: item.forecast ?? item.estimate ?? null,
      previous: item.previous ?? item.prev ?? null,
    }));

    setEvents(parsed);
  }, [raw]);

  const handleParametersChange = (values: ParameterValues) => {
    setCurrentParams(values);
  };

  const formatTime = (iso: string, tz: "local" | "utc" = "local") => {
    try {
      const d = new Date(iso);
      if (tz === "utc") {
        return d.toISOString().replace("T", " ").replace("Z", " UTC");
      }
      return d.toLocaleString();
    } catch {
      return iso;
    }
  };

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
      <div className="overflow-auto h-full">
        {events.length === 0 ? (
          <div className={`p-4 text-center text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>No events</div>
        ) : (
          <table className="w-full text-sm border-collapse">
            <thead className={`sticky top-0 ${darkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
              <tr>
                <th className={`p-2 border text-left ${darkMode ? 'border-gray-700' : ''}`}>Time</th>
                <th className={`p-2 border text-left ${darkMode ? 'border-gray-700' : ''}`}>Country</th>
                <th className={`p-2 border text-left ${darkMode ? 'border-gray-700' : ''}`}>Event</th>
                <th className={`p-2 border text-right ${darkMode ? 'border-gray-700' : ''}`}>Actual</th>
                <th className={`p-2 border text-right ${darkMode ? 'border-gray-700' : ''}`}>Forecast</th>
                <th className={`p-2 border text-right ${darkMode ? 'border-gray-700' : ''}`}>Previous</th>
                <th className={`p-2 border text-center ${darkMode ? 'border-gray-700' : ''}`}>Impact</th>
              </tr>
            </thead>

            <tbody>
              {events.map((e) => (
                <tr key={e.id} className={darkMode ? 'odd:bg-gray-900 even:bg-gray-800' : 'odd:bg-white even:bg-gray-50'}>
                  <td className={`p-2 border w-36 ${darkMode ? 'border-gray-700' : ''}`}>{formatTime(e.datetime)}</td>
                  <td className={`p-2 border w-18 ${darkMode ? 'border-gray-700' : ''}`}>{e.country}</td>
                  <td className={`p-2 border ${darkMode ? 'border-gray-700' : ''}`}>{e.event}</td>
                  <td className={`p-2 border text-right ${darkMode ? 'border-gray-700' : ''}`}>{e.actual ?? "-"}</td>
                  <td className={`p-2 border text-right ${darkMode ? 'border-gray-700' : ''}`}>{e.forecast ?? "-"}</td>
                  <td className={`p-2 border text-right ${darkMode ? 'border-gray-700' : ''}`}>{e.previous ?? "-"}</td>
                  <td
                    className={`p-2 border text-center font-semibold ${darkMode ? 'border-gray-700' : ''} ${e.importance === "high"
                      ? "text-red-500"
                      : e.importance === "medium"
                        ? "text-orange-500"
                        : "text-green-500"
                      }`}
                  >
                    {(e.importance || "low").toUpperCase()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </WidgetContainer>
  );
};

export const EconomicCalendarWidgetDef = {
  component: EconomicCalendarWidget,
};

export default EconomicCalendarWidget;

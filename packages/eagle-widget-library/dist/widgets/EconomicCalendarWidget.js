"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { useWidgetData } from "../hooks/useWidgetData";
import { useParameterDefaults } from "../hooks/useParameterDefaults";
import { WidgetContainer } from "../components/WidgetContainer";
export const EconomicCalendarWidget = ({ apiUrl = "http://localhost:8080/api/data", title, parameters, darkMode = false, onGroupedParametersChange, groupedParametersValues, }) => {
    const defaultParams = useParameterDefaults(parameters);
    const [currentParams, setCurrentParams] = useState(defaultParams);
    // useWidgetData might return either: [] OR { data: [] }
    const raw = useWidgetData(apiUrl, { parameters: currentParams }).data;
    // Normalize to CalendarEvent[]
    const [events, setEvents] = useState([]);
    useEffect(() => {
        if (!raw) {
            setEvents([]);
            return;
        }
        // raw can be: any[]  OR { data: any[] }
        let normalized = [];
        if (Array.isArray(raw)) {
            normalized = raw;
        }
        else if (raw && Array.isArray(raw.data)) {
            normalized = raw.data;
        }
        else {
            // If the API sometimes returns { data: { events: [] } } or other nesting,
            // you can add more normalization rules here.
            normalized = [];
        }
        // Map & sanitize
        const parsed = normalized.map((item, idx) => ({
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
    const handleParametersChange = (values) => {
        setCurrentParams(values);
    };
    const formatTime = (iso, tz = "local") => {
        try {
            const d = new Date(iso);
            if (tz === "utc") {
                return d.toISOString().replace("T", " ").replace("Z", " UTC");
            }
            return d.toLocaleString();
        }
        catch {
            return iso;
        }
    };
    return (_jsx(WidgetContainer, { title: title, parameters: parameters, onParametersChange: handleParametersChange, darkMode: darkMode, onGroupedParametersChange: onGroupedParametersChange, groupedParametersValues: groupedParametersValues, children: _jsx("div", { className: "overflow-auto h-full", children: events.length === 0 ? (_jsx("div", { className: `p-4 text-center text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`, children: "No events" })) : (_jsxs("table", { className: "w-full text-sm border-collapse", children: [_jsx("thead", { className: `sticky top-0 ${darkMode ? 'bg-gray-800' : 'bg-gray-50'}`, children: _jsxs("tr", { children: [_jsx("th", { className: `p-2 border text-left ${darkMode ? 'border-gray-700' : ''}`, children: "Time" }), _jsx("th", { className: `p-2 border text-left ${darkMode ? 'border-gray-700' : ''}`, children: "Country" }), _jsx("th", { className: `p-2 border text-left ${darkMode ? 'border-gray-700' : ''}`, children: "Event" }), _jsx("th", { className: `p-2 border text-right ${darkMode ? 'border-gray-700' : ''}`, children: "Actual" }), _jsx("th", { className: `p-2 border text-right ${darkMode ? 'border-gray-700' : ''}`, children: "Forecast" }), _jsx("th", { className: `p-2 border text-right ${darkMode ? 'border-gray-700' : ''}`, children: "Previous" }), _jsx("th", { className: `p-2 border text-center ${darkMode ? 'border-gray-700' : ''}`, children: "Impact" })] }) }), _jsx("tbody", { children: events.map((e) => (_jsxs("tr", { className: darkMode ? 'odd:bg-gray-900 even:bg-gray-800' : 'odd:bg-white even:bg-gray-50', children: [_jsx("td", { className: `p-2 border w-36 ${darkMode ? 'border-gray-700' : ''}`, children: formatTime(e.datetime) }), _jsx("td", { className: `p-2 border w-18 ${darkMode ? 'border-gray-700' : ''}`, children: e.country }), _jsx("td", { className: `p-2 border ${darkMode ? 'border-gray-700' : ''}`, children: e.event }), _jsx("td", { className: `p-2 border text-right ${darkMode ? 'border-gray-700' : ''}`, children: e.actual ?? "-" }), _jsx("td", { className: `p-2 border text-right ${darkMode ? 'border-gray-700' : ''}`, children: e.forecast ?? "-" }), _jsx("td", { className: `p-2 border text-right ${darkMode ? 'border-gray-700' : ''}`, children: e.previous ?? "-" }), _jsx("td", { className: `p-2 border text-center font-semibold ${darkMode ? 'border-gray-700' : ''} ${e.importance === "high"
                                        ? "text-red-500"
                                        : e.importance === "medium"
                                            ? "text-orange-500"
                                            : "text-green-500"}`, children: (e.importance || "low").toUpperCase() })] }, e.id))) })] })) }) }));
};
export const EconomicCalendarWidgetDef = {
    component: EconomicCalendarWidget,
};
export default EconomicCalendarWidget;

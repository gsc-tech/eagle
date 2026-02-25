import type { Meta, StoryObj } from "@storybook/react";
import { EconomicCalendarWidget } from "../widgets/EconomicCalendarWidget";
import { mockEconomicCalendarData, mockLargeEconomicCalendarData } from "./mocks/mockWidgetData";
import { useEffect, useState } from "react";
import { WidgetContainer } from "../components/WidgetContainer";
import type { BaseWidgetProps } from "../types";

interface CalendarEvent {
    id: string;
    datetime: string;
    country: string;
    currency?: string;
    event: string;
    importance?: "low" | "medium" | "high";
    actual?: number | string | null;
    forecast?: number | string | null;
    previous?: number | string | null;
}

interface EconomicCalendarStoryProps extends BaseWidgetProps {
    dummyData: CalendarEvent[];
    timezone?: "local" | "utc";
}

const EconomicCalendarStoryWrapper: React.FC<EconomicCalendarStoryProps> = ({
    parameters = [],
    fetchMode = 'auto',
    dummyData,
    timezone = "local",
}) => {
    const [events, setEvents] = useState<CalendarEvent[]>([]);

    useEffect(() => {
        if (!dummyData) {
            setEvents([]);
            return;
        }

        const normalized = Array.isArray(dummyData) ? dummyData : [];
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
    }, [dummyData]);

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
            parameters={parameters}
            onParametersChange={() => { }}
            fetchMode={fetchMode}
        >
            <div className="overflow-auto h-full">
                {events.length === 0 ? (
                    <div className="p-4 text-center text-sm text-gray-500">No events</div>
                ) : (
                    <table className="w-full text-sm border-collapse">
                        <thead className="sticky top-0 bg-gray-50">
                            <tr>
                                <th className="p-2 border text-left">Time</th>
                                <th className="p-2 border text-left">Country</th>
                                <th className="p-2 border text-left">Event</th>
                                <th className="p-2 border text-right">Actual</th>
                                <th className="p-2 border text-right">Forecast</th>
                                <th className="p-2 border text-right">Previous</th>
                                <th className="p-2 border text-center">Impact</th>
                            </tr>
                        </thead>

                        <tbody>
                            {events.map((e) => (
                                <tr key={e.id} className="odd:bg-white even:bg-gray-50">
                                    <td className="p-2 border w-36">{formatTime(e.datetime, timezone)}</td>
                                    <td className="p-2 border w-18">{e.country}</td>
                                    <td className="p-2 border">{e.event}</td>
                                    <td className="p-2 border text-right">{e.actual ?? "-"}</td>
                                    <td className="p-2 border text-right">{e.forecast ?? "-"}</td>
                                    <td className="p-2 border text-right">{e.previous ?? "-"}</td>
                                    <td
                                        className={`p-2 border text-center font-semibold ${e.importance === "high"
                                                ? "text-red-600"
                                                : e.importance === "medium"
                                                    ? "text-orange-500"
                                                    : "text-green-600"
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

const meta: Meta<typeof EconomicCalendarStoryWrapper> = {
    title: "Widgets/EconomicCalendarWidget",
    component: EconomicCalendarStoryWrapper,
    args: {
        fetchMode: "auto",
        parameters: [],
        dummyData: mockEconomicCalendarData,
        timezone: "local",
    },
    parameters: {
        layout: 'padded',
    },
};

export default meta;

type Story = StoryObj<typeof EconomicCalendarStoryWrapper>;

export const Default: Story = {
    args: {
        dummyData: mockEconomicCalendarData,
    },
};

export const LargeCalendar: Story = {
    args: {
        dummyData: mockLargeEconomicCalendarData,
    },
};

export const UTCTimezone: Story = {
    args: {
        dummyData: mockEconomicCalendarData,
        timezone: "utc",
    },
};

export const HighImportanceOnly: Story = {
    args: {
        dummyData: mockEconomicCalendarData.filter(e => e.importance === "high"),
    },
};

export const EmptyCalendar: Story = {
    args: {
        dummyData: [],
    },
};

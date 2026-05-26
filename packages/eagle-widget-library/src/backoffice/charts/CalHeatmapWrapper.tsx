import React, { useEffect, useMemo, useRef, useState } from "react";
//@ts-ignore
import CalHeatmap from "cal-heatmap";
//@ts-ignore
import Tooltip from "cal-heatmap/plugins/Tooltip";
//@ts-ignore
import CalendarLabel from "cal-heatmap/plugins/CalendarLabel";
import "cal-heatmap/cal-heatmap.css";
import dayjs from "dayjs";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "../table/primitives/Button";

export type HeatmapScaleType = "symlog" | "linear" | "sqrt" | "quantile";

interface CalHeatmapProps {
  data: { date: string; value: number }[];
  domainRangeLowerLimit: number;
  domainRangeUpperLimit: number;
  /** Unique DOM id for the CalHeatmap container. Must be unique per rendered instance. */
  containerId: string;
  /** CalHeatmap color scale algorithm. Defaults to "symlog". */
  scaleType?: HeatmapScaleType;
  /**
   * Pre-computed 9-color range array for CalHeatmap.
   * Use buildHeatmapColorRange() from heatmap-colors.ts to generate this.
   */
  colorRange: string[];
  /** Optional group label shown above the heatmap (e.g. "Group A"). */
  groupLabel?: string;
  /** Dark mode flag — passed from the host widget. */
  darkMode?: boolean;
}

export default function CalendarHeatmap({
  data,
  domainRangeLowerLimit,
  domainRangeUpperLimit,
  containerId,
  scaleType = "symlog",
  colorRange,
  groupLabel,
  darkMode = false,
}: CalHeatmapProps) {
  const resolvedTheme = darkMode ? "dark" : "light";
  const [displayRange] = useState<number>(4);

  const decimalFormatter = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const calRef = useRef<CalHeatmap | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const startDate = useMemo(() => {
    if (!data.length) return new Date();
    const lastDate = new Date(data.reduce((max, d) => (d.date > max ? d.date : max), data[0].date));
    return new Date(lastDate.getFullYear(), lastDate.getMonth() - (displayRange - 2), 1);
  }, [data, displayRange]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Always destroy any pre-existing instance before creating a new one.
    // This prevents CalHeatmap from appending a second SVG when dependencies
    // change or React Strict Mode mounts the component twice.
    if (calRef.current) {
      calRef.current.destroy();
      calRef.current = null;
    }

    // Explicitly clear the container via ref — more reliable than getElementById
    // and avoids targeting a stale element if containerId changes mid-flight.
    if (containerRef.current) containerRef.current.innerHTML = "";

    calRef.current = new CalHeatmap();
    const cal = calRef.current;

    const weekdayTemplate = (DateHelper: any, { domain, verticalOrientation }: any) => ({
      name: "weekday",
      parent: "day",
      allowedDomainType: ["month"],
      rowsCount: () => 5,
      columnsCount: (ts: number) =>
        Math.ceil(
          domain.dynamicDimension && !verticalOrientation
            ? DateHelper.getMonthWeekNumber(DateHelper.date(ts).endOf("month"))
            : 6,
        ),
      mapping: (startTs: number, endTs: number) =>
        DateHelper.intervals("day", startTs, DateHelper.date(endTs))
          .map((ts: number) => {
            const date = DateHelper.date(ts);
            if (date.weekday() === 0 || date.weekday() === 6) return null;
            return {
              t: ts,
              x: DateHelper.getMonthWeekNumber(ts) - 1,
              y: date.weekday() - 1,
            };
          })
          .filter((n: any) => n !== null),
      extractUnit: (ts: number) => {
        const date = DateHelper.date(ts);
        if (date.weekday() === 0 || date.weekday() === 6) return null;
        return DateHelper.date(ts).startOf("day").valueOf();
      },
    });

    cal.addTemplates(weekdayTemplate);

    const domainPoints =
      scaleType === "quantile"
        ? undefined
        : [
            domainRangeLowerLimit,
            (domainRangeLowerLimit * 2) / 3,
            domainRangeLowerLimit / 3,
            -1,
            0,
            1,
            domainRangeUpperLimit / 3,
            (domainRangeUpperLimit * 2) / 3,
            domainRangeUpperLimit,
          ];

    cal.paint(
      {
        theme: resolvedTheme,
        itemSelector: containerRef.current!,
        animationDuration: 50,
        scale: {
          color: {
            range: colorRange,
            ...(domainPoints ? { domain: domainPoints } : {}),
            type: scaleType,
          },
        },
        range: displayRange,
        domain: { type: "month", label: { text: "MMM YY" } },
        subDomain: { type: "weekday", cellPadding: 2, radius: 2, width: 17, height: 17, gutter: 4 },
        date: { start: startDate },
        data: {
          source: data,
          x: "date",
          y: "value",
          defaultValue: "0",
        },
      },
      [
        [
          Tooltip,
          {
            text: (_timestamp: number, value: number | string, dayjsDate: dayjs.Dayjs) =>
              `${dayjsDate.format("MMM DD")}: ${value !== "0" ? decimalFormatter.format(Number(value)) : "—"}`,
          },
        ],
        [
          CalendarLabel,
          {
            position: "left",
            key: "weekday-label",
            text: () => ["Mon", "Tue", "Wed", "Thu", "Fri"],
            width: 40,
            textAlign: "end",
            padding: [0, 5, 0, 0],
          },
        ],
      ],
    );

    return () => {
      if (calRef.current) {
        calRef.current.destroy();
        calRef.current = null;
      }
    };
  }, [
    data,
    resolvedTheme,
    displayRange,
    scaleType,
    containerId,
    colorRange,
    domainRangeLowerLimit,
    domainRangeUpperLimit,
  ]);

  return (
    <div className="w-full">
      {groupLabel && (
        <p className="text-[9px] uppercase tracking-widest font-bold text-muted-foreground/60 mb-4 pl-10">
          {groupLabel}
        </p>
      )}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => {
            e.preventDefault();
            calRef.current?.previous(displayRange);
          }}
          className="h-7 w-7 shrink-0 rounded-full no-drag"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <div className="flex-1 flex flex-col items-center min-w-0 overflow-x-auto mr-8">
          <div id={containerId} ref={containerRef} />
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => {
            e.preventDefault();
            calRef.current?.next(displayRange);
          }}
          className="h-7 w-7 shrink-0 rounded-full no-drag"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

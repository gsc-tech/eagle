import React, { useMemo } from "react";
import dayjs from "dayjs";
import { SlidersHorizontal, ChevronRight, X } from "lucide-react";
import { cn } from "@gsc-tech/backoffice-core";
import { Popover, PopoverTrigger, PopoverContent } from "../../../backoffice/table/primitives/Popover";
import { FilterChipGroup } from "./FilterChipGroup";
import type { DateRange } from "@gsc-tech/backoffice-core";

export const MONTH_OPTIONS = [
  { value: "1", label: "Jan" }, { value: "2", label: "Feb" },
  { value: "3", label: "Mar" }, { value: "4", label: "Apr" },
  { value: "5", label: "May" }, { value: "6", label: "Jun" },
  { value: "7", label: "Jul" }, { value: "8", label: "Aug" },
  { value: "9", label: "Sep" }, { value: "10", label: "Oct" },
  { value: "11", label: "Nov" }, { value: "12", label: "Dec" },
];

interface DateFilterPanelProps {
  date: DateRange;
  onDateRangeChange: (from: string, to: string) => void;
  selectedYears: string[];
  selectedMonths: string[];
  selectedWeeks: string[];
  yearOptions: { value: string; label: string }[];
  weeksOptions: { value: string; label: string }[];
  onYearChange: (vals: string[]) => void;
  onMonthChange: (vals: string[]) => void;
  onWeekChange: (vals: string[]) => void;
  onClear: () => void;
}

export function DateFilterPanel({
  date,
  onDateRangeChange,
  selectedYears,
  selectedMonths,
  selectedWeeks,
  yearOptions,
  weeksOptions,
  onYearChange,
  onMonthChange,
  onWeekChange,
  onClear,
}: DateFilterPanelProps) {
  const filterMode: "date" | "ymw" =
    selectedYears.length > 0 || selectedMonths.length > 0 || selectedWeeks.length > 0 ? "ymw" : "date";

  const filterSummary = useMemo(() => {
    if (filterMode === "ymw") {
      const parts: string[] = [];
      if (selectedYears.length > 0) parts.push(selectedYears.join(", "));
      if (selectedMonths.length > 0)
        parts.push(selectedMonths.map((m) => MONTH_OPTIONS.find((o) => o.value === m)?.label ?? m).join(", "));
      if (selectedWeeks.length > 0)
        parts.push("W" + selectedWeeks.slice(0, 4).join(", W") + (selectedWeeks.length > 4 ? "…" : ""));
      return parts.join(" · ");
    }
    if (date.from && date.to) {
      if (date.from.isSame(date.to, "day")) return date.from.format("MMM D, YYYY");
      if (date.from.isSame(date.to, "year"))
        return `${date.from.format("MMM D")} – ${date.to.format("MMM D, YYYY")}`;
      return `${date.from.format("MMM D, YYYY")} – ${date.to.format("MMM D, YYYY")}`;
    }
    return null;
  }, [filterMode, selectedYears, selectedMonths, selectedWeeks, date]);

  const fromValue = date.from ? date.from.format("YYYY-MM-DD") : "";
  const toValue = date.to ? date.to.format("YYYY-MM-DD") : "";

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "h-7 flex items-center gap-1.5 px-2 rounded text-xs max-w-xs transition-colors hover:bg-accent",
            filterSummary ? "text-foreground" : "text-muted-foreground",
          )}
        >
          <SlidersHorizontal className="h-3 w-3 shrink-0" />
          Filter
          {filterSummary && (
            <span className="text-[11px] text-muted-foreground tabular-nums truncate max-w-[180px]">
              {filterSummary}
            </span>
          )}
          <ChevronRight className="h-3 w-3 shrink-0" />
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        sideOffset={0}
        className="w-[520px] p-0 border-border rounded-none border-t-0 shadow-lg"
      >
        <div className="flex divide-x divide-border/40">
          {/* ── Date range inputs ─────────────────────────────────────────── */}
          <div className="flex flex-col p-3 gap-y-2 min-w-[180px]">
            <div className="flex items-center justify-between">
              <p className="text-[9px] uppercase tracking-widest text-muted-foreground/90">Date Range</p>
              {(date.from || date.to) && (
                <button
                  onClick={onClear}
                  className="flex items-center gap-1 h-5 px-1.5 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="h-2.5 w-2.5" /> Clear
                </button>
              )}
            </div>
            <div className="flex flex-col gap-y-1.5">
              <div className="flex flex-col gap-0.5">
                <label className="text-[9px] text-muted-foreground/70 uppercase tracking-wider">From</label>
                <input
                  type="date"
                  value={fromValue}
                  min="2023-01-01"
                  max={toValue || dayjs().format("YYYY-MM-DD")}
                  onChange={(e) => onDateRangeChange(e.target.value, toValue)}
                  className="h-7 rounded border border-border/60 bg-background px-2 text-xs text-foreground focus:outline-none focus:border-primary"
                />
              </div>
              <div className="flex flex-col gap-0.5">
                <label className="text-[9px] text-muted-foreground/70 uppercase tracking-wider">To</label>
                <input
                  type="date"
                  value={toValue}
                  min={fromValue || "2023-01-01"}
                  max={dayjs().format("YYYY-MM-DD")}
                  onChange={(e) => onDateRangeChange(fromValue, e.target.value)}
                  className="h-7 rounded border border-border/60 bg-background px-2 text-xs text-foreground focus:outline-none focus:border-primary"
                />
              </div>
            </div>
          </div>

          {/* ── YMW chips ────────────────────────────────────────────────── */}
          <div className="flex flex-col flex-1 divide-y divide-border/40">
            <FilterChipGroup label="Year" options={yearOptions} selected={selectedYears} onChange={onYearChange} columns={3} />
            <FilterChipGroup label="Month" options={MONTH_OPTIONS} selected={selectedMonths} onChange={onMonthChange} columns={4} />
            <FilterChipGroup label="Week" options={weeksOptions} selected={selectedWeeks} onChange={onWeekChange} columns={6} scrollable />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

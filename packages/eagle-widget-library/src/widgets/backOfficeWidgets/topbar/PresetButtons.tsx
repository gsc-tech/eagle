import React from "react";
import dayjs from "dayjs";
import { cn } from "@gsc-tech/backoffice-core";

export type PresetKey = "1D" | "1W" | "1M" | "YTD" | "1Y" | "MAX";
export const PRESETS: PresetKey[] = ["1D", "1W", "1M", "YTD", "1Y", "MAX"];

function lastWorkingDay(): dayjs.Dayjs {
  let d = dayjs().subtract(1, "day");
  while (d.day() === 0 || d.day() === 6) d = d.subtract(1, "day");
  return d;
}

export function getPresetRange(key: PresetKey): { from: dayjs.Dayjs; to: dayjs.Dayjs } {
  const today = dayjs();
  switch (key) {
    case "1D": { const d = lastWorkingDay(); return { from: d, to: d }; }
    case "1W": return { from: today.subtract(7, "day"), to: today };
    case "1M": return { from: today.subtract(1, "month"), to: today };
    case "YTD": return { from: today.startOf("year"), to: today };
    case "1Y": return { from: today.subtract(1, "year"), to: today };
    case "MAX": return { from: dayjs("2023-01-01"), to: today };
  }
}

interface PresetButtonsProps {
  activePreset: PresetKey | null;
  onSelect: (key: PresetKey) => void;
}

export function PresetButtons({ activePreset, onSelect }: PresetButtonsProps) {
  return (
    <div className="flex items-center gap-x-1">
      {PRESETS.map((key) => (
        <button
          key={key}
          onClick={() => onSelect(key)}
          className={cn(
            "h-7 px-2.5 rounded text-xs tabular-nums font-medium transition-colors",
            activePreset === key
              ? "bg-secondary text-secondary-foreground"
              : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
          )}
        >
          {key}
        </button>
      ))}
    </div>
  );
}

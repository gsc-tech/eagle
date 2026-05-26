import React from "react";
import { X } from "lucide-react";
import { cn } from "@gsc-tech/backoffice-core";

export interface FilterChipGroupProps {
  label: string;
  options: { value: string; label: string }[];
  selected: string[];
  onChange: (vals: string[]) => void;
  columns: number;
  scrollable?: boolean;
}

export function FilterChipGroup({ label, options, selected, onChange, columns, scrollable }: FilterChipGroupProps) {
  const [dragStart, setDragStart] = React.useState<string | null>(null);
  const [dragOver, setDragOver] = React.useState<string[]>([]);
  const isDragging = dragStart !== null;

  function onMouseDown(value: string) {
    setDragStart(value);
    onChange(selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value]);
  }

  function onMouseEnter(value: string) {
    if (!isDragging || dragStart === null) return;
    const startIdx = options.findIndex((o) => o.value === dragStart);
    const endIdx = options.findIndex((o) => o.value === value);
    const range = options.slice(Math.min(startIdx, endIdx), Math.max(startIdx, endIdx) + 1).map((o) => o.value);
    setDragOver(range);
  }

  function onMouseUp() {
    if (dragOver.length > 0) onChange(Array.from(new Set([...selected, ...dragOver])));
    setDragStart(null);
    setDragOver([]);
  }

  const grid = (
    <div
      className="grid gap-1 select-none"
      style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
      onMouseLeave={onMouseUp}
      onMouseUp={onMouseUp}
    >
      {options.map((opt) => {
        const active = selected.includes(opt.value) || dragOver.includes(opt.value);
        return (
          <button
            key={opt.value}
            onMouseDown={() => onMouseDown(opt.value)}
            onMouseEnter={() => onMouseEnter(opt.value)}
            onMouseUp={onMouseUp}
            className={cn(
              "h-6 rounded-sm text-[11px] tabular-nums transition-colors duration-100 border",
              active
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-transparent text-muted-foreground border-border/40 hover:border-border hover:text-foreground",
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );

  return (
    <div className="p-3 flex flex-col gap-y-2">
      <div className="flex items-center justify-between">
        <p className="text-[9px] uppercase tracking-widest text-muted-foreground/90">{label}</p>
        {selected.length > 0 && (
          <button
            onClick={() => onChange([])}
            className="flex items-center gap-0.5 text-[9px] text-muted-foreground/90 hover:text-muted-foreground transition-colors"
          >
            <X className="h-2.5 w-2.5" /> clear
          </button>
        )}
      </div>
      {scrollable ? <div className="max-h-24 overflow-y-auto pr-1">{grid}</div> : grid}
    </div>
  );
}

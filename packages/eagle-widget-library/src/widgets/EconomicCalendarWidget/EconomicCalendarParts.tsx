import React, { useCallback, useEffect, useState, useRef, memo } from "react";
import { createPortal } from "react-dom";
import type { ICellRendererParams } from "ag-grid-community";
import { type CalendarEvent } from "./economicCalendarConfig";

// ─── Cell Renderers ───────────────────────────────────────────────────────────

export function ImpBarsRenderer(props: ICellRendererParams) {
  const level: number = props.value ?? 1;
  const color = level === 3 ? "#ef4444" : level === 2 ? "#f59e0b" : "#71717a";
  return (
    <div className="flex items-center h-full pl-1">
      <div className="flex gap-[3px] items-end h-[14px]">
        {[1, 2, 3].map((b) => (
          <div
            key={b}
            className="w-1 rounded-t-[1px]"
            style={{
              height: `${b * 33}%`,
              background: b <= level ? color : "rgba(113,113,122,0.2)",
            }}
          />
        ))}
      </div>
    </div>
  );
}

export function CountryRenderer(props: ICellRendererParams) {
  const row = props.data as CalendarEvent;
  return (
    <div className="flex items-center gap-1.5 h-full pl-1">
      {row._flagUrl && (
        <img
          src={row._flagUrl}
          className="w-[22px] h-[16px] rounded-[2px] object-cover shrink-0 shadow-[0_0_0_1px_rgba(0,0,0,0.1)]"
          alt={row.country} loading="lazy" decoding="async"
        />
      )}
      <span className="text-[11px] font-semibold text-zinc-500 tracking-tight">
        {row._countryCode}
      </span>
    </div>
  );
}

export function EventRenderer(props: ICellRendererParams) {
  const row = props.data as CalendarEvent;
  return (
    <div className="flex items-center gap-1.5">
      <span className="font-semibold text-[13px]">{props.value}</span>
      {row._impLevel === 3 && (
        <span className="w-[5px] h-[5px] rounded-full bg-red-500 shrink-0" />
      )}
    </div>
  );
}

export function DateGroupRenderer(props: ICellRendererParams) {
  return (
    <span className="text-[11px] font-extrabold text-blue-500 uppercase tracking-widest">
      {props.value}
    </span>
  );
}

// ─── Filter Popover ───────────────────────────────────────────────────────────

interface FilterPopoverProps {
  trigger: React.ReactNode;
  children: React.ReactNode;
  active?: boolean;
}

export function FilterPopover({ trigger, children }: FilterPopoverProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });

  const updateCoords = useCallback(() => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setCoords({ top: rect.bottom + window.scrollY, left: rect.left + window.scrollX, width: rect.width });
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    updateCoords();
    const handler = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node) &&
          triggerRef.current && !triggerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    window.addEventListener("scroll", updateCoords, true);
    window.addEventListener("resize", updateCoords);
    document.addEventListener("mousedown", handler);
    return () => {
      window.removeEventListener("scroll", updateCoords, true);
      window.removeEventListener("resize", updateCoords);
      document.removeEventListener("mousedown", handler);
    };
  }, [open, updateCoords]);

  const leftPos = coords.left + 220 > window.innerWidth ? coords.left - 220 : coords.left;

  return (
    <div className="inline-block">
      <div ref={triggerRef} onClick={() => setOpen(o => !o)} className="cursor-pointer">
        {trigger}
      </div>
      {open && createPortal(
        <div
          ref={popoverRef}
          style={{ position: "fixed", top: coords.top + 6, left: leftPos }}
          className="z-[9999] bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-xl shadow-[0_20px_60px_rgba(0,0,0,0.12)] dark:shadow-[0_20px_60px_rgba(0,0,0,0.6)] min-w-[220px] overflow-hidden animate-popover-in"
        >
          {children}
        </div>,
        document.body
      )}
    </div>
  );
}

// ─── Day Button ───────────────────────────────────────────────────────────────

export const DayButton = memo(({ day, isSelected, isToday, onClick }: {
  day: Date; isSelected: boolean; isToday: boolean; darkMode?: boolean; onClick: () => void;
}) => {
  const accent = isSelected || isToday;
  return (
    <button
      onClick={onClick}
      className={`flex-1 min-w-[56px] flex flex-col items-center justify-center py-2.5 px-1 border-none outline-none cursor-pointer relative transition-colors
        border-r border-r-gray-100 dark:border-r-zinc-800
        ${isSelected
          ? "bg-gray-50 dark:bg-zinc-900 shadow-[inset_0_-2px_0_#3b82f6]"
          : "bg-transparent hover:bg-gray-50 dark:hover:bg-zinc-900"
        }`}
    >
      <span className={`text-[10px] font-bold uppercase tracking-widest ${accent ? "text-blue-500" : "text-zinc-500"}`}>
        {day.toLocaleDateString("en-US", { weekday: "short" })}
      </span>
      <span className={`text-sm font-black mt-0.5 ${accent ? "text-blue-500" : "text-gray-600 dark:text-zinc-400"}`}>
        {day.getDate()}
      </span>
      {isToday && !isSelected && (
        <span className="absolute bottom-1 w-1 h-1 rounded-full bg-blue-500" />
      )}
    </button>
  );
});
DayButton.displayName = "DayButton";

// ─── Nav button class helper ──────────────────────────────────────────────────

export const navBtnCls = "p-1.5 rounded-md border-none bg-transparent cursor-pointer text-gray-500 dark:text-zinc-400 flex items-center hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors";

// ─── Checkbox ─────────────────────────────────────────────────────────────────

export function Checkbox({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <span
      onClick={onChange}
      className={`shrink-0 w-3.5 h-3.5 rounded-[3px] inline-flex items-center justify-center cursor-pointer transition-all
        ${checked
          ? "border-[1.5px] border-blue-500 bg-blue-500"
          : "border-[1.5px] border-gray-400 dark:border-zinc-600 bg-transparent"
        }`}
    >
      {checked && (
        <svg width={8} height={8} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 13l4 4L19 7" />
        </svg>
      )}
    </span>
  );
}

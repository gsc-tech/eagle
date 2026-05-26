import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const _compactFmt = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });
const _fullFmt = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

export function formatCompact(v: number): string {
  return _compactFmt.format(v);
}

export function formatFull(v: number): string {
  return _fullFmt.format(v);
}

export function fieldToLabel(field: string | undefined | null): string {
  if (!field) return "";
  return field
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/^./, (c) => c.toUpperCase());
}
import {
  ModuleRegistry, ClientSideRowModelModule, themeQuartz,
  CellStyleModule, RowStyleModule, type Module,
} from "ag-grid-community";
import type { BaseWidgetProps } from "../../types";

// ─── AG Grid setup ─────────────────────────────────────────────────────────────

ModuleRegistry.registerModules([
  ClientSideRowModelModule as unknown as Module,
  CellStyleModule as unknown as Module,
  RowStyleModule as unknown as Module,
]);

export const agDarkTheme = themeQuartz.withParams({
  backgroundColor: "#09090b",
  browserColorScheme: "dark",
  chromeBackgroundColor: { ref: "foregroundColor", mix: 0.07, onto: "backgroundColor" },
  foregroundColor: "#e4e4e7",
  oddRowBackgroundColor: "#09090b",
  rowHoverColor: "#18181b",
  borderColor: "#27272a",
  headerBackgroundColor: "#09090b",
  headerTextColor: "#71717a",
  headerFontSize: 11,
  rowHeight: 38,
  headerHeight: 34,
  fontSize: 12,
});

export const agLightTheme = themeQuartz.withParams({
  backgroundColor: "#ffffff",
  browserColorScheme: "light",
  oddRowBackgroundColor: "#ffffff",
  rowHoverColor: "#fafafa",
  borderColor: "#f4f4f5",
  headerBackgroundColor: "#ffffff",
  headerTextColor: "#a1a1aa",
  headerFontSize: 11,
  rowHeight: 38,
  headerHeight: 34,
  fontSize: 12,
});

// ─── Static constants ─────────────────────────────────────────────────────────

export const TODAY = new Date();
export const TODAY_STR = TODAY.toDateString();
export const AG_ROW_HEIGHT = 38;

export const COUNTRY_CODE_MAP: Record<string, string> = {
  US: "USD", UK: "GBP", EU: "EUR", AU: "AUD",
  CN: "CNY", JP: "JPY", CA: "CAD", CH: "CHF",
  NZ: "NZD", DE: "EUR", FR: "EUR", IT: "EUR",
  IN: "INR", BR: "BRL", MX: "MXN", KR: "KRW",
  SA: "SAR", ZA: "ZAR", AR: "ARS", TR: "TRY", ID: "IDR",
};

export const FLAG_OVERRIDES: Record<string, string> = { eu: "eu", uk: "gb" };

export const G20_CODES = new Set([
  "US", "UK", "EU", "AU", "CN", "JP", "CA", "DE", "FR", "IT",
  "IN", "BR", "MX", "KR", "SA", "ZA", "AR", "TR", "ID", "RU",
]);

export interface TzOption { label: string; offset: number; iana: string; }

export const TIMEZONES: TzOption[] = [
  { label: "UTC−12:00", offset: -720, iana: "Etc/GMT+12" },
  { label: "UTC−08:00 (PST)", offset: -480, iana: "America/Los_Angeles" },
  { label: "UTC−05:00 (EST)", offset: -300, iana: "America/New_York" },
  { label: "UTC−04:00 (AST)", offset: -240, iana: "America/Halifax" },
  { label: "UTC±00:00 (GMT)", offset: 0, iana: "Europe/London" },
  { label: "UTC+01:00 (CET)", offset: 60, iana: "Europe/Paris" },
  { label: "UTC+02:00 (EET)", offset: 120, iana: "Europe/Helsinki" },
  { label: "UTC+03:00 (MSK)", offset: 180, iana: "Europe/Moscow" },
  { label: "UTC+03:30 (IRST)", offset: 210, iana: "Asia/Tehran" },
  { label: "UTC+04:00 (GST)", offset: 240, iana: "Asia/Dubai" },
  { label: "UTC+04:30 (AFT)", offset: 270, iana: "Asia/Kabul" },
  { label: "UTC+05:00 (PKT)", offset: 300, iana: "Asia/Karachi" },
  { label: "UTC+05:30 (IST)", offset: 330, iana: "Asia/Kolkata" },
  { label: "UTC+06:00 (BST)", offset: 360, iana: "Asia/Dhaka" },
  { label: "UTC+07:00 (ICT)", offset: 420, iana: "Asia/Bangkok" },
  { label: "UTC+08:00 (CST)", offset: 480, iana: "Asia/Shanghai" },
  { label: "UTC+09:00 (JST)", offset: 540, iana: "Asia/Tokyo" },
  { label: "UTC+09:30 (ACST)", offset: 570, iana: "Australia/Darwin" },
  { label: "UTC+10:00 (AEST)", offset: 600, iana: "Australia/Sydney" },
  { label: "UTC+12:00 (NZST)", offset: 720, iana: "Pacific/Auckland" },
];

export const IMPORTANCE_LEVELS: { label: string; value: number; color: string }[] = [
  { label: "High", value: 3, color: "#ef4444" },
  { label: "Medium", value: 2, color: "#f59e0b" },
  { label: "Low", value: 1, color: "#71717a" },
];

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CalendarEvent {
  id: string;
  datetime: string;
  date: string;
  time: string;
  country: string;
  event: string;
  importance: string;
  actual: string;
  forecast: string;
  previous: string;
  _impLevel: number;
  _flagUrl: string | null;
  _countryCode: string;
}

export interface EconomicCalendarWidgetProps extends BaseWidgetProps {
  defaultCountry?: string;
  defaultImportance?: "low" | "medium" | "high";
}

// ─── Pure helpers ─────────────────────────────────────────────────────────────

export function getFlagUrl(code: string): string | null {
  if (!code || code === "—") return null;
  const c = code.toLowerCase();
  return `https://flagcdn.com/w40/${FLAG_OVERRIDES[c] ?? c}.png`;
}

export function getCountryCode(code: string): string {
  if (!code || code === "—") return "—";
  return COUNTRY_CODE_MAP[code.toUpperCase()] ?? code.toUpperCase();
}

export function importanceLevel(imp: string): number {
  const s = (imp ?? "").toLowerCase();
  if (s === "high" || s === "h" || s === "3") return 3;
  if (s === "medium" || s === "m" || s === "2") return 2;
  return 1;
}

export function convertTime(rawTime: string, offsetMin: number): string {
  if (!rawTime || !rawTime.includes(":")) return rawTime;
  const [hStr, mStr] = rawTime.split(":");
  let totalMin = parseInt(hStr) * 60 + parseInt(mStr) + offsetMin;
  totalMin = ((totalMin % 1440) + 1440) % 1440;
  const h = Math.floor(totalMin / 60).toString().padStart(2, "0");
  const m = (totalMin % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
}

export function findEventsInResponse(obj: unknown): unknown[] {
  if (!obj) return [];
  if (Array.isArray(obj)) {
    if (obj.length > 0 && typeof obj[0] === "object" && obj[0] !== null) {
      const f = obj[0] as Record<string, unknown>;
      if (f.event || f.id) return obj;
    }
    return obj.length > 0 ? findEventsInResponse(obj[0]) : [];
  }
  if (typeof obj === "object" && obj !== null) {
    const o = obj as Record<string, unknown>;
    if (Array.isArray(o.events)) return o.events;
    if (Array.isArray(o.data)) return o.data;
    if (o.data) return findEventsInResponse(o.data);
    if (o.events) return findEventsInResponse(o.events);
  }
  return [];
}

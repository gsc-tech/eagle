import dayjs from "dayjs";
import weekOfYear from "dayjs/plugin/weekOfYear";
import isoWeek from "dayjs/plugin/isoWeek";
import customParseFormat from "dayjs/plugin/customParseFormat";

dayjs.extend(weekOfYear);
dayjs.extend(isoWeek);
dayjs.extend(customParseFormat);

export type bucket = "day" | "week" | "month" | "year";
export type FillMethod = "zero" | "carry" | "none";

export interface ResampleOptions {
  interval: bucket;
  fillMethod: FillMethod;
  xAxisKey: string;
  groupByKey?: string;
}

export function getBucketKey(rawDate: unknown, interval: bucket): string {
  const s = rawDate ? String(rawDate).slice(0, 10) : "";
  if (!s) return "";
  const d = dayjs(s);
  if (!d.isValid()) return s;

  switch (interval) {
    case "day":
      return d.format("YYYY-MM-DD");
    case "week":
      return d.startOf("isoWeek").format("YYYY-MM-DD");
    case "month":
      return d.startOf("month").format("YYYY-MM-DD");
    case "year":
      return d.startOf("year").format("YYYY-MM-DD");
    default:
      return d.format("YYYY-MM-DD");
  }
}

export function parseBucketedLabelToISODate(label: unknown): string {
  if (label == null) return "";
  const s = String(label).trim();
  if (!s) return "";

  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  const weekMatch = s.match(/^W(\d{1,2})-(\d{4})$/i);
  if (weekMatch) {
    const isoWeekNum = parseInt(weekMatch[1], 10);
    const year = parseInt(weekMatch[2], 10);
    const d = dayjs().year(year).isoWeek(isoWeekNum).startOf("isoWeek");
    return d.isValid() ? d.format("YYYY-MM-DD") : "";
  }

  const monthAsMMMYYYY = dayjs(s, "MMM-YYYY");
  if (monthAsMMMYYYY.isValid() && /^[A-Za-z]{3}-\d{4}$/.test(s)) {
    return monthAsMMMYYYY.startOf("month").format("YYYY-MM-DD");
  }

  if (/^\d{4}$/.test(s)) {
    return `${s}-01-01`;
  }

  const fallback = dayjs(s);
  return fallback.isValid() ? fallback.format("YYYY-MM-DD") : "";
}

export function formatBucketDate(dateStr: string, interval: bucket): string {
  const d = dayjs(dateStr);
  switch (interval) {
    case "day":
      return d.format("MMM DD");
    case "week":
      return `W${d.isoWeek()} ${d.format("MMM DD")}`;
    case "month":
      return d.format("MMM YYYY");
    case "year":
      return d.format("YYYY");
    default:
      return dateStr;
  }
}
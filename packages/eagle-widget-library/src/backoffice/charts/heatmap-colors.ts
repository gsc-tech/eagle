/**
 * Heatmap color palette utilities.
 *
 * Returns 9-color arrays in HEX format (#rrggbb):
 *   4 negative shades + 1 neutral + 4 positive shades.
 */

export type HeatmapColorMode = "group" | "pnl";

function readCssVar(token: string): string {
  if (typeof window === "undefined") return "210 60% 60%";
  const raw = getComputedStyle(document.documentElement).getPropertyValue(token).trim();
  return raw || "210 60% 60%";
}

function parseHsl(hslStr: string): { h: number; s: number; l: number } {
  const parts = hslStr.split(/\s+/);
  return {
    h: parseFloat(parts[0] ?? "210"),
    s: parseFloat(parts[1] ?? "60"),
    l: parseFloat(parts[2] ?? "60"),
  };
}

function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) =>
    Math.round(255 * (l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))));
  const r = f(0);
  const g = f(8);
  const b = f(4);
  return "#" + [r, g, b].map((x) => x.toString(16).padStart(2, "0")).join("");
}

function toColor(h: number, s: number, l: number): string {
  return hslToHex(Math.round(h), Math.round(s), Math.round(l));
}

export function buildHeatmapColorRange(
  colorToken: string,
  resolvedTheme: string | undefined,
  mode: HeatmapColorMode,
): string[] {
  const isDark = resolvedTheme === "dark";

  if (mode === "pnl") {
    return isDark
      ? ["#ff3b3b", "#d62020", "#9c1c1c", "#661515", "#1e293b", "#0a3824", "#107d47", "#14ce66", "#7cffb0"]
      : ["#a50021", "#e32636", "#fd5c63", "#ffc9c9", "#e2e8f0", "#bbf7d0", "#4ade80", "#16a34a", "#166f56"];
  }

  const rawVar = readCssVar(colorToken);
  const { h, s } = parseHsl(rawVar);

  const posShades = isDark ? [35, 48, 60, 72] : [88, 72, 52, 30];
  const posSats = isDark ? [s * 0.25, s * 0.5, s * 0.75, s] : [s * 0.2, s * 0.5, s * 0.75, s];
  const positiveColors = posShades.map((l, i) => toColor(h, posSats[i], l));

  const negLightness = isDark ? [52, 40, 28, 18] : [30, 45, 62, 78];
  const negativeColors = negLightness.map((l) => toColor(220, 8, l));

  const neutral = isDark ? toColor(220, 10, 12) : toColor(220, 8, 94);

  return [
    negativeColors[0],
    negativeColors[1],
    negativeColors[2],
    negativeColors[3],
    neutral,
    positiveColors[0],
    positiveColors[1],
    positiveColors[2],
    positiveColors[3],
  ];
}

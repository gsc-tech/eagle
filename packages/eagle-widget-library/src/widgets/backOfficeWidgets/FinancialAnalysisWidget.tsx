import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Label, LabelList,
  Line, LineChart, Pie, PieChart, ReferenceLine, XAxis, YAxis,
} from "recharts";
import {
  useDeepAnalysisFinancialDataStore,
  useMeasureRegistryStore,
  useGroupColorStore,
  useLoadingStatusStore,
  buildChartsFromV2Config,
  type WidgetConfig,
  type ChartItemConfig,
  type KpiRow,
  type ProductWiseSlice,
} from "@gsc-tech/backoffice-core";
import type { BaseWidgetProps } from "../../types";
import { WidgetContainer } from "../../components/WidgetContainer";
import { ChartContainer, ChartTooltip } from "../../backoffice/charts/chart";
import { BackofficeDataTableWidget } from "../../backoffice/table/BackofficeDataTableWidget";
import CalHeatmapWrapper from "../../backoffice/charts/CalHeatmapWrapper";
import { buildHeatmapColorRange } from "../../backoffice/charts/heatmap-colors";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface FinancialAnalysisWidgetProps extends BaseWidgetProps {
  widgetConfig?: WidgetConfig;
  onUpdateWidgetConfig?: (patch: Partial<WidgetConfig>) => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const sanitizeKey = (key: string) => key.replace(/[^a-zA-Z0-9]/g, "");

// Strip hsl(var(...)) wrappers — Eagle's CSS vars are oklch, not HSL components.
// If the caller passes "hsl(var(--chart-1))" it won't resolve; unwrap to the
// computed CSS value directly so it works in SVG fill/stroke attributes.
function resolveSeriesColor(color: string): string {
  let token = color;
  const hslVarMatch = color.match(/^hsl\((var\([^)]+\))\)$/);
  if (hslVarMatch) token = hslVarMatch[1];
  const varMatch = token.match(/^var\((--[^)]+)\)$/);
  if (varMatch) {
    const computed = getComputedStyle(document.documentElement).getPropertyValue(varMatch[1]).trim();
    if (computed) return computed;
  }
  return token;
}

const LEGEND_HEIGHT = 36;

function formatValue(val: unknown, isPercent: boolean): string {
  if (typeof val !== "number") return String(val ?? "—");
  if (isPercent) return `${val.toFixed(2)}%`;
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(val);
}

function formatCompact(val: unknown, isPercent = false): string {
  if (typeof val !== "number") return String(val ?? "—");
  if (isPercent) return `${val.toFixed(2)}%`;
  const abs = Math.abs(val);
  const sign = val < 0 ? "-" : "";
  if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}${(abs / 1_000).toFixed(1)}K`;
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(val);
}

function formatKpiValue(value: number | null | undefined, format: KpiRow["format"]): string {
  if (value === null || value === undefined) return "—";
  if (format === "percent") return `${value.toFixed(2)}%`;
  if (format === "currency") return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(value);
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(value);
}

// ── Loading skeleton ──────────────────────────────────────────────────────────

function LoadingSkeleton({ darkMode }: { darkMode: boolean }) {
  const base = darkMode ? "bg-[#2a2a2a]" : "bg-gray-100";
  return (
    <div className="w-full h-full flex flex-col gap-2 p-3 animate-pulse">
      <div className={`h-3 w-1/3 rounded ${base}`} />
      <div className={`flex-1 rounded ${base}`} />
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState({ darkMode }: { darkMode: boolean }) {
  return (
    <div className={`w-full h-full flex items-center justify-center text-[11px] ${darkMode ? "text-[#555]" : "text-muted-foreground"}`}>
      No data — apply filters to load
    </div>
  );
}

// ── Series legend ─────────────────────────────────────────────────────────────

function SeriesLegend({ series }: { series: { key: string; label: string; color: string }[] }) {
  const many = series.length > 5;
  return (
    <div
      className={`shrink-0 overflow-y-auto ${many ? "grid grid-cols-2 gap-x-3 gap-y-0.5" : "flex flex-wrap justify-center gap-x-3 gap-y-0.5"}`}
      style={{ maxHeight: LEGEND_HEIGHT }}
    >
      {[...series].sort((a, b) => a.label.localeCompare(b.label)).map((s) => (
        <div key={s.key} className="flex items-center gap-1 min-w-0">
          <span className="shrink-0 h-2 w-2 rounded-[2px]" style={{ backgroundColor: s.color }} />
          <span className="text-[10px] text-muted-foreground truncate leading-none">{s.label}</span>
        </div>
      ))}
    </div>
  );
}

// ── Custom tooltip ─────────────────────────────────────────────────────────────

function CustomTooltip({
  active, payload, xKey, isPercent, chartConfig,
}: {
  active?: boolean;
  payload?: any[];
  xKey: string;
  isPercent: boolean;
  chartConfig: Record<string, { label?: string; color?: string }>;
}) {
  if (!active || !payload?.length) return null;
  const label = payload[0]?.payload?.[xKey];
  return (
    <div className="backdrop-blur-md bg-background/80 border border-border/40 rounded px-2.5 py-2 text-[11px] shadow-md min-w-[130px] max-w-[220px]">
      {label != null && (
        <p className="text-[10px] font-semibold text-foreground border-b border-border/30 pb-1 mb-1.5">{String(label)}</p>
      )}
      <div className="space-y-1">
        {payload.map((p: any) => {
          const safeKey = sanitizeKey(String(p.dataKey ?? ""));
          const seriesLabel = chartConfig[safeKey]?.label ?? chartConfig[String(p.dataKey ?? "")]?.label ?? String(p.dataKey ?? "");
          const color = p.stroke ?? p.fill ?? chartConfig[safeKey]?.color ?? "hsl(var(--muted-foreground))";
          return (
            <div key={p.dataKey} className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: color }} />
              <span className="text-muted-foreground flex-1 truncate">{seriesLabel}</span>
              <span className="font-bold tabular-nums ml-2">{formatValue(p.value, isPercent)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Single recharts chart ─────────────────────────────────────────────────────

function SingleChart({ chart, height }: { chart: ChartItemConfig; height: number }) {
  const isPercent = !!(chart.field && chart.field.includes("%"));
  const xKey = chart.xAxis ?? "name";
  const { type, data, chartConfig: wConfig } = chart;
  console.log("wconfig is ", wConfig);
  const showLegend = wConfig.showLegend ?? true;
  const chartHeight = showLegend ? Math.max(height - LEGEND_HEIGHT, 40) : height;

  const rechartConfig = useMemo(() => {
    const cfg: Record<string, { label?: string; color?: string }> = {};
    wConfig.series.forEach((s) => {
      const safeKey = sanitizeKey(s.key);
      const color = s.color ? resolveSeriesColor(s.color) : s.color;
      cfg[safeKey] = { label: s.label, color };
      if (safeKey !== s.key) cfg[s.key] = { label: s.label, color };
    });
    return cfg;
  }, [wConfig.series]);

  const totalDataPoints = data.length;

  const tooltip = (
    <ChartTooltip
      cursor={{ stroke: "hsl(var(--muted-foreground))", strokeWidth: 1, strokeDasharray: "4 4" }}
      content={
        <CustomTooltip
          xKey={xKey}
          isPercent={isPercent}
          chartConfig={rechartConfig}
        />
      }
    />
  );

  const renderEndLabel = (seriesKey: string) => (props: any) => {
    const { x, y, index, value } = props;
    if (index !== totalDataPoints - 1) return null;
    return (
      <g>
        <circle cx={x} cy={y} r={4} fill={`var(--color-${sanitizeKey(seriesKey)})`} />
        <text x={x + 10} y={y - 5} fill="hsl(var(--muted-foreground))" fontSize={11} fontWeight="bold" className="tabular-nums" textAnchor="start">
          {formatValue(value, isPercent)}
        </text>
      </g>
    );
  };

  let chartContent: React.ReactNode = null;

  switch (type) {
    case "area":
      chartContent = (
        <AreaChart data={data} margin={{ top: 20, right: 80, left: 10, bottom: 10 }}>
          {wConfig.showGrid && <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />}
          {wConfig.showXAxis && <XAxis dataKey={xKey} tickLine={false} axisLine={false} tickMargin={8} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />}
          {wConfig.showYAxis && <YAxis tickLine={false} axisLine={false} tickMargin={8} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} tickFormatter={(v) => isPercent ? `${v}%` : v} domain={["auto", "auto"]} />}
          <ReferenceLine y={0} stroke="hsl(var(--border))" strokeWidth={1} />
          {tooltip}
          {wConfig.series.map((s) => {
            const safeKey = sanitizeKey(s.key);
            return (
              <Area key={s.key} dataKey={s.key} type="natural" fill={`var(--color-${safeKey})`} fillOpacity={0.15} stroke={`var(--color-${safeKey})`} strokeWidth={2.5} connectNulls>
                {wConfig.showLabels !== false && <LabelList dataKey={s.key} content={renderEndLabel(s.key)} />}
              </Area>
            );
          })}
        </AreaChart>
      );
      break;

    case "line":
      chartContent = (
        <LineChart data={data} margin={{ top: 20, right: 80, left: 10, bottom: 10 }}>
          {wConfig.showGrid && <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />}
          {wConfig.showXAxis && <XAxis dataKey={xKey} tickLine={false} axisLine={false} tickMargin={8} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />}
          {wConfig.showYAxis && <YAxis tickLine={false} axisLine={false} tickMargin={8} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} tickFormatter={(v) => isPercent ? `${v}%` : v} domain={["auto", "auto"]} />}
          <ReferenceLine y={0} stroke="hsl(var(--border))" strokeWidth={1} />
          {tooltip}
          {wConfig.series.map((s) => {
            const safeKey = sanitizeKey(s.key);
            return (
              <Line key={s.key} dataKey={s.key} type="monotone" stroke={`var(--color-${safeKey})`} strokeWidth={3} dot={{ r: 2, strokeWidth: 2, fill: "hsl(var(--background))" }} activeDot={{ r: 6, strokeWidth: 0 }} connectNulls>
                {wConfig.showLabels !== false && <LabelList dataKey={s.key} content={renderEndLabel(s.key)} />}
              </Line>
            );
          })}
        </LineChart>
      );
      break;

    case "signed-bar": {
      // All bars grow upward; colour distinguishes profit (green) vs loss (red).
      // Stash original signed values under __orig_<key> so labels and tooltip
      // can display the real number while the bar height uses Math.abs().
      const absData = data.map((entry: any) => {
        const next: any = { ...entry };
        wConfig.series.forEach((s) => {
          if (typeof next[s.key] === "number") {
            next[`__orig_${s.key}`] = next[s.key];
            next[s.key] = Math.abs(next[s.key]);
          }
        });
        return next;
      });

      chartContent = (
        <BarChart data={absData} margin={{ top: 30, right: 80, left: 10, bottom: 10 }}>
          {wConfig.showGrid && <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />}
          {wConfig.showXAxis && <XAxis dataKey={xKey} tickLine={false} axisLine={false} tickMargin={8} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />}
          {wConfig.showYAxis && <YAxis tickLine={false} axisLine={false} tickMargin={8} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} tickFormatter={(v) => isPercent ? `${v}%` : formatCompact(v)} domain={[0, "auto"]} />}
          <ChartTooltip
            cursor={{ fill: "hsl(var(--muted))", opacity: 0.15 }}
            content={(ttProps: any) => {
              const { active, payload } = ttProps;
              if (!active || !payload?.length) return null;
              const label = payload[0]?.payload?.[xKey];
              return (
                <div className="backdrop-blur-md bg-background/80 border border-border/40 rounded px-2.5 py-2 text-[11px] shadow-md min-w-[130px] max-w-[220px]">
                  {label != null && <p className="text-[10px] font-semibold text-foreground border-b border-border/30 pb-1 mb-1.5">{String(label)}</p>}
                  <div className="space-y-1">
                    {payload.map((p: any) => {
                      const origVal = p.payload[`__orig_${p.dataKey}`] ?? p.value;
                      const isNeg = origVal < 0;
                      const color = isNeg ? "#f87171" : "#10b981";
                      const seriesLabel = rechartConfig[sanitizeKey(String(p.dataKey ?? ""))]?.label ?? String(p.dataKey ?? "");
                      return (
                        <div key={p.dataKey} className="flex items-center gap-2">
                          <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: color }} />
                          <span className="text-muted-foreground flex-1 truncate">{seriesLabel}</span>
                          <span className="font-bold tabular-nums ml-2" style={{ color }}>{formatCompact(origVal, isPercent)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            }}
          />
          {wConfig.series.map((s) => (
            <Bar key={s.key} dataKey={s.key} radius={[4, 4, 0, 0]}>
              {data.map((entry: any, index: number) => (
                <Cell key={`cell-${index}`} fill={(entry[s.key] ?? 0) >= 0 ? "#10b981" : "#f87171"} />
              ))}
              {wConfig.showLabels !== false && (
                <LabelList dataKey={s.key} content={(props: any) => {
                  const { x, y, width, index: idx } = props;
                  const origVal = absData[idx]?.[`__orig_${s.key}`] ?? props.value;
                  const isNeg = (origVal ?? 0) < 0;
                  return (
                    <text x={x + width / 2} y={y - 8}
                      fill={isNeg ? "#f87171" : "#10b981"} fontSize={11} fontWeight="bold"
                      textAnchor="middle" dominantBaseline="middle" className="tabular-nums">
                      {formatCompact(origVal, isPercent)}
                    </text>
                  );
                }} />
              )}
            </Bar>
          ))}
        </BarChart>
      );
      break;
    }

    case "bar":
      chartContent = (
        <BarChart data={data} layout={wConfig.layout || "horizontal"} margin={{ top: wConfig.layout === "vertical" ? 10 : 30, right: 80, left: 10, bottom: 10 }}>
          {wConfig.showGrid && <CartesianGrid vertical={wConfig.layout === "vertical"} strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />}
          {wConfig.showXAxis && (
            <XAxis
              dataKey={wConfig.layout === "vertical" ? undefined : xKey}
              type={wConfig.layout === "vertical" ? "number" : "category"}
              tickLine={false} axisLine={false} tickMargin={8}
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
              {...(wConfig.layout === "vertical" ? { padding: { left: 80, right: 80 }, domain: ["auto", "auto"] } : {})}
            />
          )}
          {wConfig.showYAxis && (
            <YAxis
              dataKey={wConfig.layout === "vertical" ? xKey : undefined}
              type={wConfig.layout === "vertical" ? "category" : "number"}
              tickLine={false} axisLine={false} tickMargin={8}
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
              tickFormatter={(v) => isPercent && wConfig.layout !== "vertical" ? `${v}%` : v}
              {...(wConfig.layout !== "vertical" ? { domain: ["auto", "auto"] } : {})}
            />
          )}
          {wConfig.layout !== "vertical" && <ReferenceLine y={0} stroke="hsl(var(--border))" strokeWidth={1} />}
          <ChartTooltip cursor={{ fill: "hsl(var(--muted))", opacity: 0.15 }} content={<CustomTooltip xKey={xKey} isPercent={isPercent} chartConfig={rechartConfig} />} />
          {wConfig.series.map((s) => {
            const safeKey = sanitizeKey(s.key);
            return (
              <Bar key={s.key} dataKey={s.key} fill={`var(--color-${safeKey})`} radius={wConfig.layout === "vertical" ? [0, 4, 4, 0] : [4, 4, 0, 0]}>
                {wConfig.showLabels !== false && (
                  <LabelList dataKey={s.key} position={wConfig.layout === "vertical" ? "right" : "top"} content={(props: any) => {
                    const { x, y, width, height: h, value } = props;
                    const isVertical = wConfig.layout === "vertical";
                    const isNeg = value < 0;
                    const tX = isVertical ? (isNeg ? x + width - 12 : x + width + 12) : x + width / 2;
                    const tY = isVertical ? y + h / 2 : isNeg ? y + h + 22 : y - 12;
                    return (
                      <text x={tX} y={tY} fill="hsl(var(--muted-foreground))" fontSize={11} fontWeight="bold"
                        textAnchor={isVertical ? (isNeg ? "end" : "start") : "middle"} dominantBaseline="middle" className="tabular-nums">
                        {formatValue(value, isPercent)}
                      </text>
                    );
                  }} />
                )}
              </Bar>
            );
          })}
        </BarChart>
      );
      break;

    case "pie":
    case "donut": {
      const innerRadius = type === "donut" ? "65%" : "0%";
      const isGauge = type === "donut";
      const rawValue = chart.gaugeOverflow ? chart.gaugeOverflow.value : (data?.[0]?.value ?? 0);
      const multiSeries = wConfig.series.length > 1;
      const baseKey = sanitizeKey(wConfig.series[0]?.key ?? "value");

      const renderInsideLabel = ({ cx, cy, midAngle, innerRadius: iR, outerRadius, name, percent }: any) => {
        if (percent < 0.05) return null;
        const RADIAN = Math.PI / 180;
        const radius = (iR as number) + ((outerRadius as number) - (iR as number)) * 0.58;
        return (
          <text
            x={(cx as number) + radius * Math.cos(-midAngle * RADIAN)}
            y={(cy as number) + radius * Math.sin(-midAngle * RADIAN)}
            textAnchor="middle" dominantBaseline="central" fill="white" fontSize={11} fontWeight={700}
          >
            {name}
          </text>
        );
      };

      chartContent = (
        <PieChart>
          <ChartTooltip cursor={false} content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const entry = payload[0];
            const sliceName = String(entry.payload?.name ?? "");
            if (isGauge && sliceName === "remainder") return null;
            const value = isGauge ? rawValue : (entry.value as number);
            return (
              <div className="backdrop-blur-md bg-background/80 border border-border/40 rounded-lg px-3 py-2 text-[11px] shadow-md space-y-0.5 min-w-[120px]">
                {chart.title && <p className="font-bold text-foreground">{chart.title}</p>}
                <p className="font-bold text-primary tabular-nums">{formatValue(value, isPercent)}</p>
              </div>
            );
          }} />
          <Pie data={data} dataKey="value" nameKey="name" innerRadius={innerRadius} strokeWidth={0} paddingAngle={0} startAngle={90} endAngle={450} label={type === "pie" ? renderInsideLabel : undefined} labelLine={false}>
            {data.map((_: any, index: number) => {
              if (isGauge) {
                const color = index === 0 ? `var(--color-${sanitizeKey(wConfig.series[0]?.key ?? "filled")})` : "hsl(var(--accent-foreground))";
                return <Cell key={`cell-${index}`} fill={color} fillOpacity={index === 0 ? 1 : 0.15} />;
              }
              const safeKey = multiSeries ? sanitizeKey(wConfig.series[index]?.key ?? wConfig.series[0]?.key ?? "value") : baseKey;
              return <Cell key={`cell-${index}`} fill={`var(--color-${safeKey})`} fillOpacity={multiSeries ? 1 : Math.max(0.22, 1 - index * 0.13)} />;
            })}
            {type === "donut" && (
              <Label position="center" content={({ viewBox }: any) => {
                if (!viewBox) return null;
                // Recharts v3 may pass SVG viewBox { x, y, width, height } instead of
                // polar viewBox { cx, cy }; compute center from whichever is available.
                const cx: number = viewBox.cx ?? (viewBox.x ?? 0) + (viewBox.width ?? 0) / 2;
                const cy: number = viewBox.cy ?? (viewBox.y ?? 0) + (viewBox.height ?? 0) / 2;
                const displayVal = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(rawValue);
                return (
                  <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle">
                    <tspan x={cx} dy={chart.gaugeOverflow ? "-1.2em" : "0"} fontSize={18} fontWeight={700} fill="hsl(var(--foreground))" className="tabular-nums">{displayVal}</tspan>
                    {chart.gaugeOverflow && (
                      <>
                        <tspan x={cx} dy="1.4em" fontSize={11} fill="hsl(var(--muted-foreground))">/{new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(chart.gaugeOverflow.maxValue)}</tspan>
                        <tspan x={cx} dy="1.5em" fontSize={9} fontWeight={700} fill="hsl(38 92% 50%)">⚠ LIMIT</tspan>
                      </>
                    )}
                  </text>
                );
              }} />
            )}
          </Pie>
        </PieChart>
      );
      break;
    }

    default:
      return null;
  }

  return (
    <div className="flex flex-col w-full" style={{ height }}>
      <ChartContainer config={rechartConfig} className="w-full" style={{ height: chartHeight }}>
        {chartContent as React.ReactElement}
      </ChartContainer>
      {showLegend && <SeriesLegend series={wConfig.series} />}
    </div>
  );
}

// ── Chart panel (ResizeObserver wrapper) ──────────────────────────────────────

function ChartPanel({ chart }: { chart: ChartItemConfig }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    let rafId: number;
    const ro = new ResizeObserver(([entry]) => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        const h = entry.contentRect.height;
        if (h > 0) setHeight(h);
      });
    });
    ro.observe(el);
    return () => { cancelAnimationFrame(rafId); ro.disconnect(); };
  }, []);

  return (
    <div ref={containerRef} className="flex-1 w-full min-h-0 h-full">
      {height > 0 && <SingleChart chart={chart} height={height} />}
    </div>
  );
}

// ── KPI cards ─────────────────────────────────────────────────────────────────

function KpiCards({ charts, kpiColumns }: { charts: ChartItemConfig[]; kpiColumns?: number }) {
  const kpiRows = charts[0]?.kpiRows ?? [];
  const cols = kpiColumns ?? Math.min(Math.ceil(Math.sqrt(kpiRows.length)), 4);
  return (
    <div
      className="w-full h-full overflow-auto"
      style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)` }}
    >
      {kpiRows.map((kpi, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const totalRows = Math.ceil(kpiRows.length / cols);
        return (
          <div
            key={i}
            className={`px-3 py-2.5 flex flex-col justify-center min-w-0 ${col < cols - 1 ? "border-r border-border/30" : ""} ${row < totalRows - 1 ? "border-b border-border/30" : ""}`}
          >
            <p className="text-[9px] uppercase tracking-widest text-muted-foreground/60 mb-1.5 truncate leading-none">{kpi.label}</p>
            {kpi.groupValues.map((gv) => (
              <p key={gv.groupId} className={`text-lg font-bold tabular-nums leading-tight ${kpi.directional ? ((gv.value ?? 0) >= 0 ? "text-emerald-500" : "text-red-400") : "text-foreground"}`}>
                {formatKpiValue(gv.value, kpi.format)}
              </p>
            ))}
          </div>
        );
      })}
    </div>
  );
}

// ── Heatmap renderer ──────────────────────────────────────────────────────────

function HeatmapRenderer({ charts, darkMode }: { charts: ChartItemConfig[]; darkMode: boolean }) {
  const theme = darkMode ? "dark" : "light";
  // Memoize so CalHeatmapWrapper's useEffect only fires when values actually
  // change, not on every parent re-render that produces a new array reference.
  const max = React.useMemo(
    () => Math.max(...charts.flatMap((c) => c.data.map((d: any) => Math.abs(d.value as number))), 1),
    [charts],
  );
  const colorRange = React.useMemo(() => buildHeatmapColorRange("--chart-1", theme, "pnl"), [theme]);

  if (charts.length === 0) return null;
  return (
    <div className="w-full h-full overflow-auto p-2 flex flex-col gap-4">
      {charts.map((chart) => (
        <CalHeatmapWrapper
          key={chart.id}
          containerId={chart.id}
          data={chart.data}
          domainRangeLowerLimit={-max}
          domainRangeUpperLimit={max}
          colorRange={colorRange}
          groupLabel={chart.title}
          darkMode={darkMode}
        />
      ))}
    </div>
  );
}

// ── Winner-loser renderer ─────────────────────────────────────────────────────

function WinnerLoserRenderer({ charts }: { charts: ChartItemConfig[] }) {
  const chart = charts[0];
  if (!chart?.winnerLoserData) return null;
  const { winners, losers } = chart.winnerLoserData;
  const formatNum = (v: number) => new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(v);
  return (
    <div className="w-full h-full overflow-auto p-2 flex gap-2">
      <div className="flex-1 min-w-0">
        <p className="text-[9px] uppercase tracking-widest text-emerald-500/70 mb-1">Winners</p>
        {winners.slice(0, 10).map((w, i) => (
          <div key={i} className="flex items-center justify-between text-[11px] py-0.5 border-b border-border/20">
            <span className="truncate text-muted-foreground">{w.name}</span>
            <span className="tabular-nums font-bold text-emerald-500 ml-2">{formatNum(w.value)}</span>
          </div>
        ))}
      </div>
      <div className="w-px bg-border/30 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-[9px] uppercase tracking-widest text-red-400/70 mb-1">Losers</p>
        {losers.slice(0, 10).map((l, i) => (
          <div key={i} className="flex items-center justify-between text-[11px] py-0.5 border-b border-border/20">
            <span className="truncate text-muted-foreground">{l.name}</span>
            <span className="tabular-nums font-bold text-red-400 ml-2">{formatNum(l.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Leaderboard renderer ──────────────────────────────────────────────────────

function LeaderboardRenderer({ charts }: { charts: ChartItemConfig[] }) {
  const chart = charts[0];
  if (!chart?.leaderboardData) return null;
  const { columnDefs, rows } = chart.leaderboardData;
  const formatNum = (v: number | null, format: string) => {
    if (v === null || v === undefined) return "—";
    if (format === "percent") return `${v.toFixed(2)}%`;
    if (format === "currency") return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(v);
    return new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(v);
  };
  return (
    <div className="w-full h-full overflow-auto">
      <table className="w-full text-[11px] border-collapse">
        <thead>
          <tr className="border-b border-border/40">
            <th className="text-left px-2 py-1 text-[9px] uppercase tracking-widest text-muted-foreground/60 font-medium sticky top-0 bg-background">#</th>
            <th className="text-left px-2 py-1 text-[9px] uppercase tracking-widest text-muted-foreground/60 font-medium sticky top-0 bg-background">Entity</th>
            {columnDefs.map((c) => (
              <th key={c.name} className="text-right px-2 py-1 text-[9px] uppercase tracking-widest text-muted-foreground/60 font-medium sticky top-0 bg-background">{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={row.label} className="border-b border-border/20 hover:bg-muted/20">
              <td className="px-2 py-1 text-muted-foreground/50 tabular-nums">{i + 1}</td>
              <td className="px-2 py-1 text-muted-foreground max-w-[120px] truncate">{row.label}</td>
              {columnDefs.map((c) => {
                const val = row.scalars[c.name] ?? null;
                const isPos = (val ?? 0) >= 0;
                return (
                  <td key={c.name} className={`px-2 py-1 text-right tabular-nums font-bold ${c.directional ? (isPos ? "text-emerald-500" : "text-red-400") : "text-foreground"}`}>
                    {formatNum(val, c.format)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Multi-panel chart layout ───────────────────────────────────────────────────

function MultiChartLayout({ charts }: { charts: ChartItemConfig[] }) {
  const gridCols = charts.length > 2 ? "xl:grid-cols-3" : "xl:grid-cols-2";
  return (
    <div className={`w-full h-full grid grid-cols-1 ${gridCols} gap-4 auto-rows-fr p-2`}>
      {charts.map((chart) => (
        <div key={chart.id} className="flex flex-col gap-2 min-h-0">
          {chart.title && <h4 className="shrink-0 text-xs font-bold text-muted-foreground/90 uppercase tracking-[0.2em]">{chart.title}</h4>}
          <ChartPanel chart={chart} />
        </div>
      ))}
    </div>
  );
}

// ── Main widget ───────────────────────────────────────────────────────────────

export const FinancialAnalysisWidget: React.FC<FinancialAnalysisWidgetProps> = ({
  widgetConfig,
  darkMode = false,
  title,
  onUpdateWidgetConfig,
}) => {
  const financialData = useDeepAnalysisFinancialDataStore((s) => s.data);
  // Subscribe to each registry slice so charts recompute on measure changes.
  const registryScalars = useMeasureRegistryStore((s) => s.scalars);
  const registryFormulas = useMeasureRegistryStore((s) => s.formulas);
  const registryExtendedColumns = useMeasureRegistryStore((s) => s.extendedColumns);
  const registryDerivedDatasets = useMeasureRegistryStore((s) => s.derivedDatasets);
  const groupColors = useGroupColorStore((s) => s.colors);
  const isLoading = useLoadingStatusStore((s) => s.isLoading);

  const charts = useMemo(() => {
    if (!widgetConfig) return [];
    return buildChartsFromV2Config(
      widgetConfig,
      financialData,
      {} as Record<"A" | "B" | "C" | "D", ProductWiseSlice>,
      useMeasureRegistryStore.getState(),
      ["A"],
    );
  }, [
    widgetConfig,
    financialData,
    registryScalars,
    registryFormulas,
    registryExtendedColumns,
    registryDerivedDatasets,
    groupColors,
  ]);

  const firstType = charts[0]?.type;
  const displayTitle = title ?? widgetConfig?.title;

  const renderContent = () => {
    if (isLoading) return <LoadingSkeleton darkMode={darkMode} />;
    if (!widgetConfig || charts.length === 0) return <EmptyState darkMode={darkMode} />;

    if (firstType === "kpi-card") return <KpiCards charts={charts} kpiColumns={widgetConfig?.kpiAutoColumns === false && widgetConfig?.kpiColumns ? widgetConfig.kpiColumns : undefined} />;
    if (firstType === "data-table") return (
      <BackofficeDataTableWidget
        widget={widgetConfig}
        charts={charts}
        activeGroups={["A"]}
        groupColorTokens={{ A: "--chart-1" }}
        isEditing={!!onUpdateWidgetConfig}
        onUpdate={onUpdateWidgetConfig ? (_id, patch) => onUpdateWidgetConfig(patch) : undefined}
      />
    );
    if (firstType === "heatmap") return <HeatmapRenderer charts={charts} darkMode={darkMode} />;
    if (firstType === "winner-loser") return <WinnerLoserRenderer charts={charts} />;
    if (firstType === "leaderboard") return <LeaderboardRenderer charts={charts} />;

    // Multi-panel layout (juxtaposed multi-group charts)
    if (charts.length > 1) return <MultiChartLayout charts={charts} />;

    // Single chart — full height via ChartPanel
    return (
      <div className="w-full h-full flex flex-col p-2">
        <ChartPanel chart={charts[0]} />
      </div>
    );
  };

  return (
    <WidgetContainer title={displayTitle} darkMode={darkMode}>
      {renderContent()}
    </WidgetContainer>
  );
};

export const FinancialAnalysisWidgetDef = {
  component: FinancialAnalysisWidget,
  name: "Financial Analysis",
  description: "Configurable chart, table, KPI, or heatmap reading from the BackOffice financial data store. Requires a BackOffice Topbar widget on the same dashboard.",
  defaultProps: {
    widgetConfig: {
      id: "fa-default",
      title: "Financial Analysis",
      w: 6, h: 4, x: 0, y: 0,
      version: "v2" as const,
      vizType: "line" as const,
      datasetId: "financial",
      measures: [{ kind: "column" as const, name: "netPLExclRebatesAndCharges" }],
    } satisfies WidgetConfig,
  },
};

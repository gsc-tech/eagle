/**
 * `<WatchlistSparkline>` — thin wrapper around MUI's `<SparkLineChart>`,
 * matching the Falcon watchlist row sparkline behaviour.
 *
 * Data is pre-populated on the watchlist item by the backend (the watchlist
 * endpoint returns each expression's sparkline alongside its price and
 * percentile). No lazy fetch — the watchlist payload IS the source.
 *
 * Source ref: falcon-ui/src/components/watchlist ui/WatchlistComp.tsx#L446-L458
 */

"use client";

import { SparkLineChart } from "@mui/x-charts/SparkLineChart";

interface Props {
  data?: { x: string | number; y: number }[];
  width?: number;
  height?: number;
}

export function WatchlistSparkline({ data, width = 70, height = 40 }: Props) {
  if (!data || data.length < 2) {
    return <div style={{ width, height }} />;
  }

  const values = data.map((p) => Number(p.y)).filter((v) => Number.isFinite(v));
  const dates = data.map((p) => new Date(p.x));

  return (
    <SparkLineChart
      data={values}
      xAxis={{
        scaleType: "time",
        data: dates,
        valueFormatter: (v) => (v instanceof Date ? v.toISOString().slice(0, 10) : String(v)),
      }}
      width={width}
      height={height}
      showTooltip
      showHighlight
    />
  );
}
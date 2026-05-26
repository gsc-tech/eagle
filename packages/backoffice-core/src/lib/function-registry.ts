import { MeasureKind, FieldAggregation } from "./field-registry";

export interface RegistryFunction {
  name: string;
  label: string;
  description: string;
  params: { name: string; type: "series" | "number" | "string"; optional?: boolean }[];
  implementation?: (...args: any[]) => any;
  isMathjsBuiltin?: boolean;
  needsWindow: boolean;
  windowDefault?: number;
  applicableTo: MeasureKind[];
  postTransformFooterAgg: FieldAggregation;
  extraParams?: {
    key: string;
    label: string;
    hint: string;
    default: number;
    min?: number;
    step?: number;
  }[];
}

const toNumArr = (arr: any): number[] => {
  if (Array.isArray(arr)) return arr.map((v) => Number(v) || 0);
  if (arr && typeof arr.toArray === "function") return arr.toArray().map((v: any) => Number(v) || 0);
  return [];
};

function rollingWindow(arr: number[], window: number, fn: (slice: number[]) => number): number[] {
  const result: number[] = new Array(arr.length).fill(0);
  for (let i = 0; i < arr.length; i++) {
    const start = Math.max(0, i - window + 1);
    const slice = arr.slice(start, i + 1);
    result[i] = fn(slice);
  }
  return result;
}

function lag(arr: number[], n: number = 1): number[] {
  const data = toNumArr(arr);
  const result: number[] = new Array(data.length).fill(0);
  for (let i = n; i < data.length; i++) {
    result[i] = data[i - n] || 0;
  }
  return result;
}

function diff(arr: number[]): number[] {
  const data = toNumArr(arr);
  const result: number[] = new Array(data.length).fill(0);
  for (let i = 1; i < data.length; i++) {
    result[i] = (data[i] || 0) - (data[i - 1] || 0);
  }
  return result;
}

function movingSum(arr: number[], window: number): number[] {
  return rollingWindow(toNumArr(arr), window, (s) => s.reduce((a, b) => a + b, 0));
}

function movingAvg(arr: number[], window: number): number[] {
  return rollingWindow(toNumArr(arr), window, (s) => s.reduce((a, b) => a + b, 0) / s.length);
}

function movingMax(arr: number[], window: number): number[] {
  return rollingWindow(toNumArr(arr), window, (s) => Math.max(...s));
}

function movingMin(arr: number[], window: number): number[] {
  return rollingWindow(toNumArr(arr), window, (s) => Math.min(...s));
}

function movingMedian(arr: number[], window: number): number[] {
  return rollingWindow(toNumArr(arr), window, (s) => {
    const sorted = [...s].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  });
}

function drawdownPct(equity: number[]): number[] {
  const data = toNumArr(equity);
  const result: number[] = [];
  let peak = 0;
  for (let i = 0; i < data.length; i++) {
    const val = data[i];
    if (val > peak) peak = val;
    if (peak === 0) result.push(val < 0 ? 100 : 0);
    else result.push(((peak - val) / peak) * 100);
  }
  return result;
}

function drawdownAbs(equity: number[]): number[] {
  const data = toNumArr(equity);
  const result: number[] = [];
  let peak = 0;
  for (let i = 0; i < data.length; i++) {
    const val = data[i];
    if (val > peak) peak = val;
    result.push(peak - val);
  }
  return result;
}

function expandingMax(arr: number[]): number[] {
  const data = toNumArr(arr);
  const result: number[] = [];
  let peak = -Infinity;
  for (let i = 0; i < data.length; i++) {
    if (data[i] > peak) peak = data[i];
    result.push(peak);
  }
  return result;
}

function sharpeRatio(returns: number[], window: number = 30, hurdle: number = 0): number[] {
  const data = toNumArr(returns);
  if (data.length < 2) return new Array(data.length).fill(0);

  const avgRet = movingAvg(data, window);
  const stdRet = rollingWindow(data, window, (s) => {
    if (s.length < 2) return 0;
    const mean = s.reduce((a, b) => a + b, 0) / s.length;
    const variance = s.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (s.length - 1);
    return Math.sqrt(variance);
  });

  const annualizationFactor = Math.sqrt(252);
  return avgRet.map((mean, i) => {
    const std = stdRet[i];
    if (std === 0) return 0;
    return ((mean - hurdle) / std) * annualizationFactor;
  });
}

function expandingSharpeRatio(returns: number[], hurdle: number = 0): number[] {
  const data = toNumArr(returns);
  if (data.length < 2) return new Array(data.length).fill(0);

  const annualizationFactor = Math.sqrt(252);
  return data.map((_, i) => {
    const slice = data.slice(0, i + 1);
    if (slice.length < 2) return 0;
    const mean = slice.reduce((a, b) => a + b, 0) / slice.length;
    const variance = slice.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (slice.length - 1);
    const std = Math.sqrt(variance);
    if (std === 0) return 0;
    return ((mean - hurdle) / std) * annualizationFactor;
  });
}

function cumsum(arr: number[]): number[] {
  const data = toNumArr(arr);
  const result: number[] = [];
  let sum = 0;
  for (let i = 0; i < data.length; i++) {
    sum += data[i] || 0;
    result.push(sum);
  }
  return result;
}

export const FUNCTION_REGISTRY: RegistryFunction[] = [
  {
    name: "lag",
    label: "Lag (Shift)",
    description: "Shift values forward by N periods.",
    params: [
      { name: "series", type: "series" },
      { name: "n", type: "number", optional: true },
    ],
    implementation: lag,
    needsWindow: true,
    windowDefault: 1,
    applicableTo: ["fully-additive", "semi-additive", "non-additive"],
    postTransformFooterAgg: "last",
  },
  {
    name: "diff",
    label: "Difference",
    description: "Change from previous period (x - lag(x)).",
    params: [{ name: "series", type: "series" }],
    implementation: diff,
    needsWindow: false,
    applicableTo: ["fully-additive"],
    postTransformFooterAgg: "last",
  },
  {
    name: "movingAvg",
    label: "Moving Average",
    description: "Rolling mean over a window of N periods.",
    params: [
      { name: "series", type: "series" },
      { name: "window", type: "number" },
    ],
    implementation: movingAvg,
    needsWindow: true,
    windowDefault: 7,
    applicableTo: ["fully-additive", "semi-additive"],
    postTransformFooterAgg: "mean",
  },
  {
    name: "movingSum",
    label: "Moving Sum",
    description: "Rolling sum over a window of N periods.",
    params: [
      { name: "series", type: "series" },
      { name: "window", type: "number" },
    ],
    implementation: movingSum,
    needsWindow: true,
    windowDefault: 7,
    applicableTo: ["fully-additive"],
    postTransformFooterAgg: "last",
  },
  {
    name: "movingMax",
    label: "Moving Max",
    description: "Rolling maximum over a window of N periods.",
    params: [
      { name: "series", type: "series" },
      { name: "window", type: "number" },
    ],
    implementation: movingMax,
    needsWindow: true,
    windowDefault: 7,
    applicableTo: ["fully-additive", "semi-additive"],
    postTransformFooterAgg: "max",
  },
  {
    name: "movingMin",
    label: "Moving Min",
    description: "Rolling minimum over a window of N periods.",
    params: [
      { name: "series", type: "series" },
      { name: "window", type: "number" },
    ],
    implementation: movingMin,
    needsWindow: true,
    windowDefault: 7,
    applicableTo: ["fully-additive", "semi-additive"],
    postTransformFooterAgg: "min",
  },
  {
    name: "movingMedian",
    label: "Moving Median",
    description: "Rolling median (middle value) over a window of N periods.",
    params: [
      { name: "series", type: "series" },
      { name: "window", type: "number" },
    ],
    implementation: movingMedian,
    needsWindow: true,
    windowDefault: 7,
    applicableTo: ["fully-additive", "semi-additive", "non-additive"],
    postTransformFooterAgg: "last",
  },
  {
    name: "drawdownPct",
    label: "Drawdown (%)",
    description: "Peak-to-trough decline as % of peak equity. Caller passes daily P&L — cumsum is applied internally.",
    params: [{ name: "equity", type: "series" }],
    implementation: drawdownPct,
    needsWindow: false,
    applicableTo: ["fully-additive"],
    postTransformFooterAgg: "last",
  },
  {
    name: "drawdownAbs",
    label: "Drawdown",
    description: "Peak-to-trough decline in absolute dollar terms. Works correctly even when equity starts negative.",
    params: [{ name: "equity", type: "series" }],
    implementation: drawdownAbs,
    needsWindow: false,
    applicableTo: ["fully-additive"],
    postTransformFooterAgg: "last",
  },
  {
    name: "expandingMax",
    label: "Expanding Max",
    description: "All-time high of the series at each point. Plot alongside equity curve to visualise the drawdown gap.",
    params: [{ name: "series", type: "series" }],
    implementation: expandingMax,
    needsWindow: false,
    applicableTo: ["fully-additive", "semi-additive", "non-additive"],
    postTransformFooterAgg: "last",
  },
  {
    name: "sharpeRatio",
    label: "Moving Sharpe (Ann.)",
    description: "Rolling Sharpe over a fixed window. At each day uses only the last N periods.",
    params: [
      { name: "returns", type: "series" },
      { name: "window", type: "number" },
      { name: "hurdle", type: "number", optional: true },
    ],
    implementation: sharpeRatio,
    needsWindow: true,
    windowDefault: 30,
    applicableTo: ["fully-additive"],
    postTransformFooterAgg: "last",
    extraParams: [
      {
        key: "riskFreeRate",
        label: "Risk-Free Hurdle",
        hint: "Subtracted from mean return before dividing by std. Use the same units as your return column (daily $ or daily %). Leave 0 for raw Sharpe.",
        default: 0,
        min: 0,
        step: 0.01,
      },
    ],
  },
  {
    name: "expandingSharpeRatio",
    label: "Expanding Sharpe (Ann.)",
    description: "Since-inception Sharpe. At each day uses all returns from day 0 to that day — stabilises over time.",
    params: [
      { name: "returns", type: "series" },
      { name: "hurdle", type: "number", optional: true },
    ],
    implementation: expandingSharpeRatio,
    needsWindow: false,
    applicableTo: ["fully-additive"],
    postTransformFooterAgg: "last",
    extraParams: [
      {
        key: "riskFreeRate",
        label: "Risk-Free Hurdle",
        hint: "Subtracted from mean return before dividing by std. Use the same units as your return column (daily $ or daily %). Leave 0 for raw Sharpe.",
        default: 0,
        min: 0,
        step: 0.01,
      },
    ],
  },
  {
    name: "cumsum",
    label: "Cumulative Sum",
    description: "Running total from the beginning.",
    params: [{ name: "series", type: "series" }],
    implementation: cumsum,
    needsWindow: false,
    applicableTo: ["fully-additive"],
    postTransformFooterAgg: "last",
  },
];

export const FUNCTION_REGISTRY_MAP: Record<string, RegistryFunction> = Object.fromEntries(
  FUNCTION_REGISTRY.map((fn) => [fn.name, fn]),
);

export const TRANSFORM_TO_FUNCTION_NAME: Record<string, string> = {
  rolling_mean:     "movingAvg",
  rolling_sum:      "movingSum",
  rolling_max:      "movingMax",
  rolling_min:      "movingMin",
  rolling_median:   "movingMedian",
  sharpe:           "sharpeRatio",
  expanding_sharpe: "expandingSharpeRatio",
  drawdown:         "drawdownPct",
  drawdown_abs:     "drawdownAbs",
  expanding_max:    "expandingMax",
  cumulative:       "cumsum",
  none:             "",
};

export function transformNeedsWindow(transform: string | undefined): boolean {
  if (!transform || transform === "none") return false;
  const fnName = TRANSFORM_TO_FUNCTION_NAME[transform];
  if (!fnName) return false;
  return FUNCTION_REGISTRY_MAP[fnName]?.needsWindow ?? false;
}

export function transformWindowDefault(transform: string | undefined): number {
  if (!transform || transform === "none") return 7;
  const fnName = TRANSFORM_TO_FUNCTION_NAME[transform];
  if (!fnName) return 7;
  return FUNCTION_REGISTRY_MAP[fnName]?.windowDefault ?? 7;
}

export function getFunctionsForKind(kind: MeasureKind): RegistryFunction[] {
  return FUNCTION_REGISTRY.filter((fn) => fn.applicableTo.includes(kind));
}

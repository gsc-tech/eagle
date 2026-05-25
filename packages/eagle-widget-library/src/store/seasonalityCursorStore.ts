import { create } from "zustand";

// Shared cursor X positions + visible X axis ranges, keyed by `groupId`.
// Sibling seasonality charts on the same dashboard read the value for their
// group and animate their cursor / x-range to match. `null` means "no signal"
// (e.g. mouse left the chart, or no zoom selection).
//
// `setCursor` / `setRange` coalesce writes within one animation frame so a
// flood of `pointermove` / range-drag events collapses into a single state
// update — the consumer charts only re-render once per frame.

export type AxisRange = { start: number; end: number };

type State = {
  byGroup: Record<string, number | null>;
  rangeByGroup: Record<string, AxisRange | null>;
  setCursor: (groupId: string, x: number | null) => void;
  setRange: (groupId: string, range: AxisRange | null) => void;
};

let rafHandle: number | null = null;
const pendingCursor = new Map<string, number | null>();
const pendingRange = new Map<string, AxisRange | null>();

function scheduleFlush(set: (updater: (s: State) => Partial<State>) => void) {
  if (rafHandle !== null) return;

  const flush = () => {
    rafHandle = null;
    const cursorPatch = Object.fromEntries(pendingCursor);
    const rangePatch = Object.fromEntries(pendingRange);
    pendingCursor.clear();
    pendingRange.clear();
    set((s) => {
      const next: Partial<State> = {};
      if (Object.keys(cursorPatch).length > 0) {
        next.byGroup = { ...s.byGroup, ...cursorPatch };
      }
      if (Object.keys(rangePatch).length > 0) {
        next.rangeByGroup = { ...s.rangeByGroup, ...rangePatch };
      }
      return next;
    });
  };

  if (typeof requestAnimationFrame === "function") {
    rafHandle = requestAnimationFrame(flush);
  } else {
    rafHandle = 1;
    Promise.resolve().then(flush);
  }
}

export const useSeasonalityCursorStore = create<State>((set) => ({
  byGroup: {},
  rangeByGroup: {},
  setCursor: (groupId, x) => {
    pendingCursor.set(groupId, x);
    scheduleFlush(set);
  },
  setRange: (groupId, range) => {
    pendingRange.set(groupId, range);
    scheduleFlush(set);
  },
}));

// Test-only escape hatch — lets unit tests force a synchronous flush without
// waiting for the actual animation frame (jsdom doesn't run rAF callbacks).
export function __flushSeasonalityCursorForTests() {
  if (rafHandle === null) return;
  if (typeof cancelAnimationFrame === "function" && typeof rafHandle === "number") {
    cancelAnimationFrame(rafHandle);
  }
  rafHandle = null;
  const cursorPatch = Object.fromEntries(pendingCursor);
  const rangePatch = Object.fromEntries(pendingRange);
  pendingCursor.clear();
  pendingRange.clear();
  useSeasonalityCursorStore.setState((s) => {
    const next: Partial<State> = {};
    if (Object.keys(cursorPatch).length > 0) {
      next.byGroup = { ...s.byGroup, ...cursorPatch };
    }
    if (Object.keys(rangePatch).length > 0) {
      next.rangeByGroup = { ...s.rangeByGroup, ...rangePatch };
    }
    return next;
  });
}

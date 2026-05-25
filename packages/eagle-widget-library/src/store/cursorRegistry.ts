/**
 * Module-level registry of amCharts 5 XYCursor instances grouped by `groupId`.
 * Used to wire amCharts' native `cursor.syncWith: XYCursor[]` setting across
 * sibling charts so that hovering one chart moves the cursor on every other
 * chart in the same group to the matching X value.
 *
 * Falcon parity: SeasonalityUI.tsx uses `cursor.set("syncWith", localList)`
 * with a Map<uid, XYCursor>. This is the canonical amCharts 5 mechanism — no
 * manual pixel-math, no `triggerMove` (which is a private API), no event
 * round-trip through React state.
 *
 * The registry is imperative state (not Zustand) — consumers register/
 * unregister on mount/unmount and don't need React reactivity for the
 * cursor list itself; the sync is handled inside amCharts.
 */

import type * as am5xy from "@amcharts/amcharts5/xy";

const cursorsByGroup = new Map<string, Set<am5xy.XYCursor>>();

/**
 * Register `cursor` as part of `groupId`. Every cursor in the same group is
 * automatically wired to sync X position with every other. Returns a cleanup
 * function that removes the cursor from the group (call on unmount).
 */
export function registerCursor(
  groupId: string,
  cursor: am5xy.XYCursor,
): () => void {
  let group = cursorsByGroup.get(groupId);
  if (!group) {
    group = new Set();
    cursorsByGroup.set(groupId, group);
  }
  group.add(cursor);
  syncGroup(groupId);

  return () => {
    const g = cursorsByGroup.get(groupId);
    if (!g) return;
    g.delete(cursor);
    // Clear this cursor's own syncWith so it doesn't dangle-reference disposed
    // peers if something else holds onto it.
    try {
      cursor.set("syncWith", []);
    } catch {
      // Cursor may already be disposed — ignore.
    }
    if (g.size === 0) {
      cursorsByGroup.delete(groupId);
    } else {
      syncGroup(groupId);
    }
  };
}

/** Re-compute `syncWith` for every cursor in `groupId`. */
function syncGroup(groupId: string) {
  const group = cursorsByGroup.get(groupId);
  if (!group) return;
  const cursors = Array.from(group);
  cursors.forEach((c) => {
    const others = cursors.filter((x) => x !== c);
    try {
      c.set("syncWith", others);
    } catch {
      // Cursor disposed concurrently — ignore.
    }
  });
}

// Test escape-hatch
export function __resetCursorRegistryForTests() {
  cursorsByGroup.clear();
}
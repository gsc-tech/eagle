import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { DEFAULT_ACTIVE_GROUPS, GROUP_IDS, GroupId, MAX_GROUPS } from "./groups";

/* ─── Types ────────────────────────────────────────────────────────────────── */

/**
 * Dimension-level context filters scoped to a single comparison group.
 * Each field here is a universal filter that applies to all widgets in the group
 * unless a widget opts out with useGlobalProductFilter: false.
 *
 * New dimension filters (strategy, broker, exchange…) go here — no structural change needed.
 */
export interface GroupContext {
  /** Universal instrument allowlist for this group. undefined = show all. */
  productFilter?: string[];
}

interface GroupsState {
  /** Ordered list of groups currently shown in the UI. Min 1, max MAX_GROUPS. */
  activeGroups: GroupId[];

  /** Per-group dimension filter context. Keyed by GroupId. */
  groupContexts: Record<GroupId, GroupContext>;

  /**
   * Appends the next available group ID that is not already active.
   * No-op when already at MAX_GROUPS.
   */
  addGroup: () => void;

  /**
   * Removes a group from the active list.
   * No-op when only one group remains (must always have at least one).
   */
  removeGroup: (id: GroupId) => void;

  /** Set the universal product filter for a group. Pass undefined to clear. */
  setGroupProductFilter: (groupId: GroupId, filter: string[] | undefined) => void;
}

const DEFAULT_GROUP_CONTEXTS: Record<GroupId, GroupContext> = {
  A: {},
  B: {},
  C: {},
  D: {},
};

/* ─── Store ─────────────────────────────────────────────────────────────────── */

export const useGroupsStore = create<GroupsState>()(
  devtools(
    (set) => ({
      activeGroups: DEFAULT_ACTIVE_GROUPS,
      groupContexts: DEFAULT_GROUP_CONTEXTS,

      addGroup: () =>
        set(
          (state) => {
            if (state.activeGroups.length >= MAX_GROUPS) return state;
            const next = GROUP_IDS.find((id) => !state.activeGroups.includes(id));
            if (!next) return state;
            return { activeGroups: [...state.activeGroups, next] };
          },
          false,
          "groups/addGroup",
        ),

      removeGroup: (id) =>
        set(
          (state) => {
            if (state.activeGroups.length <= 1) return state;
            return {
              activeGroups: state.activeGroups.filter((g) => g !== id),
            };
          },
          false,
          "groups/removeGroup",
        ),

      setGroupProductFilter: (groupId, filter) =>
        set(
          (state) => ({
            groupContexts: {
              ...state.groupContexts,
              [groupId]: { ...state.groupContexts[groupId], productFilter: filter },
            },
          }),
          false,
          "groups/setGroupProductFilter",
        ),
    }),
    {
      name: "groups-store",
    },
  ),
);

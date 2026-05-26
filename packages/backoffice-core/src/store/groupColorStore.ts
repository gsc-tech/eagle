import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import { DEFAULT_GROUP_COLORS, GroupId } from "./groups";

/* ─── Types ─────────────────────────────────────────────────────────────────── */

/** A CSS variable token string, e.g. "--chart-1". */
export type GroupColorToken = string;

interface GroupColorState {
  colors: Record<GroupId, GroupColorToken>;
  setColor: (group: GroupId, token: GroupColorToken) => void;
  resetColor: (group: GroupId) => void;
  resetAll: () => void;
}

/* ─── Store ─────────────────────────────────────────────────────────────────── */

export const useGroupColorStore = create<GroupColorState>()(
  devtools(
    persist(
      (set) => ({
        colors: { ...DEFAULT_GROUP_COLORS },

        setColor: (group, token) =>
          set(
            (state) => ({ colors: { ...state.colors, [group]: token } }),
            false,
            "groupColor/setColor",
          ),

        resetColor: (group) =>
          set(
            (state) => ({
              colors: {
                ...state.colors,
                [group]: DEFAULT_GROUP_COLORS[group],
              },
            }),
            false,
            "groupColor/resetColor",
          ),

        resetAll: () =>
          set(
            { colors: { ...DEFAULT_GROUP_COLORS } },
            false,
            "groupColor/resetAll",
          ),
      }),
      {
        name: "group-color-store",
        version: 2,
        /**
         * Migrates persisted state from v1 to v2.
         * v1 used numeric enum keys (0, 1). v2 uses string GroupId keys (A, B, C, D).
         * Preserves existing color customisations for groups A and B.
         */
        migrate: (persisted: unknown, version: number) => {
          if (version === 1) {
            const old = persisted as { colors?: Record<string, string> };
            return {
              colors: {
                A: old.colors?.["0"] ?? DEFAULT_GROUP_COLORS.A,
                B: old.colors?.["1"] ?? DEFAULT_GROUP_COLORS.B,
                C: DEFAULT_GROUP_COLORS.C,
                D: DEFAULT_GROUP_COLORS.D,
              } satisfies Record<GroupId, GroupColorToken>,
            };
          }
          return persisted;
        },
      },
    ),
    { name: "useGroupColorStore" },
  ),
);

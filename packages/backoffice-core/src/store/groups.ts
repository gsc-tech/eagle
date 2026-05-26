export const MAX_GROUPS = 4;

export const GROUP_IDS = ["A", "B", "C", "D"] as const;

export type GroupId = (typeof GROUP_IDS)[number];

export const GROUP_LABELS: Record<GroupId, string> = {
  A: "Group A",
  B: "Group B",
  C: "Group C",
  D: "Group D",
};

export const DEFAULT_GROUP_COLORS: Record<GroupId, string> = {
  A: "--chart-1",
  B: "--chart-2",
  C: "--chart-3",
  D: "--chart-4",
};

export const DEFAULT_ACTIVE_GROUPS: GroupId[] = ["A"];

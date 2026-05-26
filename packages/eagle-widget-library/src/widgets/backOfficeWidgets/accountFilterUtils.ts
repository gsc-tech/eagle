// Port of BackOffice-Frontend/components/custom/accountFilterUtils.ts — pure utility, no framework coupling.

export interface TreeOption {
  label: string;
  value: string;
  name?: string;
  accountName?: string;
  inactive?: boolean;
}

export interface TreeGroup {
  label: string;
  value: string;
  children: TreeOption[];
}

export function createAccountTreeGroups(users: any[], groupingField: string): TreeGroup[] {
  if (!Array.isArray(users)) return [];
  const activeNicknames = new Set<string>();
  users.forEach((u) => { if (u.endDate === null) activeNicknames.add(u.nickname); });

  const activeMap: Record<string, TreeOption[]> = {};
  const inactiveMap: Record<string, TreeOption[]> = {};
  const seenActive = new Set<string>();
  const seenInactive = new Set<string>();

  users.forEach((user) => {
    const groupKey = user[groupingField] ?? "Other";
    if (user.endDate === null) {
      const key = `${groupKey}::${user.nickname}`;
      if (seenActive.has(key)) return;
      seenActive.add(key);
      if (!activeMap[groupKey]) activeMap[groupKey] = [];
      activeMap[groupKey].push({ label: user.nickname, value: user.nickname, name: user.name, accountName: user.accountName });
    } else if (!activeNicknames.has(user.nickname)) {
      const key = `${groupKey}::${user.nickname}`;
      if (seenInactive.has(key)) return;
      seenInactive.add(key);
      if (!inactiveMap[groupKey]) inactiveMap[groupKey] = [];
      inactiveMap[groupKey].push({ label: user.nickname, value: user.nickname, inactive: true, name: user.name, accountName: user.accountName });
    }
  });

  const allKeys = Array.from(new Set([...Object.keys(activeMap), ...Object.keys(inactiveMap)]));
  return allKeys.map((key) => ({
    label: key,
    value: key,
    children: [...(activeMap[key] ?? []), ...(inactiveMap[key] ?? [])],
  }));
}

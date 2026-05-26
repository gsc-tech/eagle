import React from "react";
import { Users, X, Tag } from "lucide-react";
import { cn } from "@gsc-tech/backoffice-core";
import { Popover, PopoverTrigger, PopoverContent } from "../../../backoffice/table/primitives/Popover";
import { Checkbox } from "../../../backoffice/table/primitives/Checkbox";
import { createAccountTreeGroups } from "../accountFilterUtils";
import type { TradingAccount } from "@gsc-tech/backoffice-core";

interface AccountSelectorPopoverProps {
  tradingAccounts: TradingAccount[];
  selectedAccounts: string[];
  onSelectionChange: (accounts: string[]) => void;
  isAdmin: boolean;
  groupingField?: string;
  align?: "start" | "center" | "end";
  triggerClassName?: string;
}

export function AccountSelectorPopover({
  tradingAccounts,
  selectedAccounts,
  onSelectionChange,
  isAdmin,
  groupingField = "clearer",
  align = "start",
  triggerClassName,
}: AccountSelectorPopoverProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [showLabels, setShowLabels] = React.useState(() => {
    try {
      const stored = localStorage.getItem("accountSelector.showLabels");
      return stored === null ? true : stored === "true";
    } catch {
      return true;
    }
  });

  const toggleLabels = () => {
    setShowLabels((v) => {
      const next = !v;
      try { localStorage.setItem("accountSelector.showLabels", String(next)); } catch {}
      return next;
    });
  };

  const treeGroups = React.useMemo(
    () => createAccountTreeGroups(tradingAccounts, groupingField),
    [tradingAccounts, groupingField],
  );

  const allAccountNicknames = React.useMemo(
    () => Array.from(new Set(tradingAccounts.map((a) => a.nickname))),
    [tradingAccounts],
  );

  const accountQuery = search.trim().toLowerCase();

  const filteredAccountTree = React.useMemo(() => {
    if (!accountQuery) return treeGroups;
    return treeGroups
      .map((g) => ({
        ...g,
        children: g.children.filter(
          (c) =>
            c.label.toLowerCase().includes(accountQuery) ||
            c.name?.toLowerCase().includes(accountQuery) ||
            c.accountName?.toLowerCase().includes(accountQuery),
        ),
      }))
      .filter((g) => g.children.length > 0 || g.label.toLowerCase().includes(accountQuery));
  }, [treeGroups, accountQuery]);

  const isAllAccounts = selectedAccounts.length >= allAccountNicknames.length && allAccountNicknames.length > 0;
  const isFiltered = !isAllAccounts && selectedAccounts.length > 0;

  const pillLabel = React.useMemo(() => {
    if (selectedAccounts.length === 0) return "None";
    if (isAllAccounts) return "All";
    const MAX_VISIBLE = 2;
    const visible = selectedAccounts.slice(0, MAX_VISIBLE).join(", ");
    return selectedAccounts.length > MAX_VISIBLE ? `${visible} +${selectedAccounts.length - MAX_VISIBLE}` : visible;
  }, [selectedAccounts, isAllAccounts]);

  const handleToggle = (nickname: string) => {
    const next = selectedAccounts.includes(nickname)
      ? selectedAccounts.filter((v) => v !== nickname)
      : [...selectedAccounts, nickname];
    onSelectionChange(next);
  };

  const handleGroupToggle = (group: { children: { value: string }[] }) => {
    const kids = group.children.map((c) => c.value);
    const allSel = kids.every((v) => selectedAccounts.includes(v));
    const next = allSel
      ? selectedAccounts.filter((v) => !kids.includes(v))
      : Array.from(new Set([...selectedAccounts, ...kids]));
    onSelectionChange(next);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "h-7 flex items-center gap-1.5 px-2.5 rounded text-xs font-medium max-w-[260px] transition-colors hover:bg-accent",
            isFiltered ? "border border-primary/60 bg-primary/5 text-primary" : "text-muted-foreground",
            triggerClassName,
          )}
        >
          <Users className="h-3 w-3 shrink-0" />
          <span className="truncate">{pillLabel}</span>
          <span className="text-muted-foreground shrink-0">
            {isAllAccounts ? `${allAccountNicknames.length} accts` : `${selectedAccounts.length}/${allAccountNicknames.length}`}
          </span>
          {isFiltered && (
            <X
              className="h-2.5 w-2.5 ml-0.5 shrink-0 text-primary/70 hover:text-primary"
              onClick={(e) => { e.stopPropagation(); onSelectionChange([]); }}
            />
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent align={align} side="bottom" className="w-72 p-0 shadow-lg border-border/60">
        {/* Header */}
        <div className="px-3 py-2 border-b border-border/40 flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Accounts</span>
          <div className="flex items-center gap-2">
            <button
              title={showLabels ? "Hide labels" : "Show labels"}
              className={cn(
                "flex items-center gap-1 text-[9px] font-medium transition-colors",
                showLabels ? "text-primary" : "text-muted-foreground/50 hover:text-muted-foreground",
              )}
              onClick={toggleLabels}
            >
              <Tag className="h-2.5 w-2.5" /> Labels
            </button>
            <span className="text-muted-foreground/30 text-[9px]">·</span>
            <button className="text-[9px] text-primary hover:text-primary/80 font-medium" onClick={() => onSelectionChange(allAccountNicknames)}>All</button>
            <span className="text-muted-foreground/30 text-[9px]">·</span>
            <button className="text-[9px] text-muted-foreground hover:text-foreground font-medium" onClick={() => onSelectionChange([])}>Clear</button>
          </div>
        </div>

        {/* Search */}
        <div className="px-2 py-1.5 border-b border-border/30">
          <input
            placeholder="Search accounts…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-6 w-full rounded border border-border/40 bg-muted/30 px-2 text-xs text-foreground focus:outline-none focus:border-primary/60"
          />
        </div>

        {/* List */}
        <div className="max-h-64 overflow-y-auto">
          <div className="py-1">
            {filteredAccountTree.length === 0 ? (
              <p className="text-center text-[10px] text-muted-foreground py-4">No matches</p>
            ) : isAdmin && treeGroups.length > 0 ? (
              filteredAccountTree.map((group) => {
                const kids = group.children.map((c) => c.value);
                const allSel = kids.every((v) => selectedAccounts.includes(v));
                const noneSel = kids.every((v) => !selectedAccounts.includes(v));
                const groupState: boolean | "indeterminate" = noneSel ? false : allSel ? true : "indeterminate";
                const selCount = kids.filter((v) => selectedAccounts.includes(v)).length;

                return (
                  <div key={group.value}>
                    <button
                      className="w-full flex items-center gap-1.5 px-2.5 py-1 hover:bg-muted/40 transition-colors"
                      onClick={() => handleGroupToggle(group)}
                    >
                      <Checkbox
                        checked={groupState}
                        onCheckedChange={() => handleGroupToggle(group)}
                        onClick={(e) => e.stopPropagation()}
                        className="h-3 w-3 rounded-sm shrink-0"
                      />
                      <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground/80 flex-1 text-left truncate">{group.label}</span>
                      <span className="text-[9px] text-muted-foreground tabular-nums shrink-0">{selCount}/{kids.length}</span>
                    </button>
                    <div className="ml-5 border-l border-border/20">
                      {group.children.map((child) => {
                        const checked = selectedAccounts.includes(child.value);
                        return (
                          <button
                            key={child.value}
                            className="w-full flex items-center gap-2 pl-2 pr-2.5 py-[3px] hover:bg-muted/30 transition-colors"
                            onClick={() => handleToggle(child.value)}
                          >
                            <Checkbox
                              checked={checked}
                              onCheckedChange={() => handleToggle(child.value)}
                              onClick={(e) => e.stopPropagation()}
                              className="h-3 w-3 rounded-sm shrink-0 pointer-events-none"
                            />
                            <span className={cn("text-[11px] font-mono tracking-tight truncate flex-1 text-left", child.inactive ? "text-muted-foreground/70" : checked ? "text-foreground" : "text-muted-foreground")}>
                              {child.label}
                              {showLabels && child.name && <span className="ml-1.5 font-sans text-muted-foreground/50">{child.name}</span>}
                              {showLabels && child.accountName && <span className="ml-1.5 font-sans text-muted-foreground/40">{child.accountName}</span>}
                            </span>
                            {child.inactive && (
                              <span className="text-[8px] uppercase tracking-wide px-1 py-px rounded border border-amber-500/40 text-amber-500 shrink-0">inactive</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            ) : (
              tradingAccounts
                .filter(
                  (a, i, arr) =>
                    arr.findIndex((b) => b.nickname === a.nickname) === i &&
                    (!accountQuery ||
                      a.nickname.toLowerCase().includes(accountQuery) ||
                      a.name?.toLowerCase().includes(accountQuery) ||
                      a.accountName?.toLowerCase().includes(accountQuery)),
                )
                .map((account) => {
                  const nickname = account.nickname;
                  const checked = selectedAccounts.includes(nickname);
                  return (
                    <button
                      key={nickname}
                      className="w-full flex items-center gap-2 px-2.5 py-[3px] hover:bg-muted/30 transition-colors"
                      onClick={() => handleToggle(nickname)}
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={() => handleToggle(checked ? "" : nickname)}
                        onClick={(e) => e.stopPropagation()}
                        className="h-3 w-3 rounded-sm shrink-0 pointer-events-none"
                      />
                      <span className={cn("text-[11px] font-mono tracking-tight truncate flex-1 text-left", checked ? "text-foreground" : "text-muted-foreground")}>
                        {nickname}
                        {showLabels && account.name && <span className="ml-1.5 font-sans text-muted-foreground/50">{account.name}</span>}
                        {showLabels && account.accountName && <span className="ml-1.5 font-sans text-muted-foreground/40">{account.accountName}</span>}
                      </span>
                    </button>
                  );
                })
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-3 py-1.5 border-t border-border/30 flex items-center justify-between">
          <span className="text-[9px] text-muted-foreground tabular-nums">{selectedAccounts.length} of {allAccountNicknames.length} selected</span>
          <button className="h-5 px-2 rounded bg-primary text-primary-foreground text-[9px] hover:bg-primary/90" onClick={() => setOpen(false)}>Close</button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

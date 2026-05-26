import * as React from "react";
import { TableVirtuoso } from "react-virtuoso";
import { Table, TableCell, TableHead, TableRow } from "./primitives/Table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./primitives/DropdownMenu";
import { Tooltip, TooltipTrigger, TooltipPrimitive } from "./primitives/Tooltip";
import { ChevronUp, ChevronDown, AlertTriangle } from "lucide-react";
import { cn } from "@gsc-tech/backoffice-core";
import {
  TableColumnDef,
  TableRow as DataRow,
  GroupId,
  GROUP_LABELS,
  formatBucketDate,
  formatCell,
  valueCls,
  sortRows,
  SortState,
  decodeGroupColKey,
  isMergedColKey,
  SENTINEL_KEYS,
  computeFooterRow,
  FooterRowResult,
  AGG_OPTIONS,
  FieldAggregation,
} from "@gsc-tech/backoffice-core";

/* ─── Virtuoso scaffold ──────────────────────────────────────────────────── */

const VirtuosoTable = React.forwardRef<HTMLTableElement, React.HTMLAttributes<HTMLTableElement>>(
  ({ className, ...props }, ref) => (
    <Table ref={ref} className={cn("w-full text-sm", className)} {...props} />
  ),
);
VirtuosoTable.displayName = "VirtuosoTable";

const VirtuosoTableFoot = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ style, ...props }, ref) => (
  <tfoot ref={ref} {...props} style={{ ...style, bottom: 0 }} />
));
VirtuosoTableFoot.displayName = "VirtuosoTableFoot";

/* ─── UnavailableCell ────────────────────────────────────────────────────── */

interface UnavailableCellProps {
  tooltip?: string;
  portalContainer?: Element | null;
}

function UnavailableCell({ tooltip = "Value unavailable", portalContainer }: UnavailableCellProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex items-center justify-center leading-none">
          <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
        </span>
      </TooltipTrigger>
      <TooltipPrimitive.Portal
        container={(portalContainer ?? undefined) as HTMLElement | undefined}
      >
        <TooltipPrimitive.Content
          side="top"
          sideOffset={4}
          className={cn(
            "z-50 overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md",
            "animate-in fade-in-0 zoom-in-95",
            "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
            "data-[side=top]:slide-in-from-bottom-2 data-[side=bottom]:slide-in-from-top-2",
            "max-w-xs p-2 text-xs",
          )}
        >
          {tooltip}
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </Tooltip>
  );
}

/* ─── TablePanel ─────────────────────────────────────────────────────────── */

export interface TablePanelProps {
  title?: string;
  titleColor?: string;
  rows: DataRow[];
  cols: TableColumnDef[];
  groupColorTokens?: Record<GroupId, string>;
  activeGroups?: GroupId[];
  sort: SortState;
  onSort: (key: string) => void;
  dimensionKey?: string;
  showFooter?: boolean;
  onFooterAggChange?: (colKey: string, agg: FieldAggregation) => void;
  portalContainer?: Element | null;
  sourceGaps?: string[];
}

function aggShortLabel(agg: TableColumnDef["footerAggregation"]): string {
  return AGG_OPTIONS.find((o) => o.value === agg)?.short ?? "";
}

export function TablePanel({
  title,
  titleColor,
  rows,
  cols,
  groupColorTokens,
  activeGroups,
  sort,
  onSort,
  dimensionKey = "date",
  showFooter = true,
  onFooterAggChange,
  portalContainer,
  sourceGaps,
}: TablePanelProps) {
  const sorted = React.useMemo(() => sortRows(rows, sort), [rows, sort]);

  const isMultiGroup = (activeGroups?.length ?? 0) > 1;

  const columnGaps = React.useMemo<Set<string>>(() => {
    const gaps = new Set<string>();
    const numericFormats = new Set(["currency", "number", "percent"]);
    const numericCols = cols.filter(
      (c) => numericFormats.has(c.format ?? "") && !SENTINEL_KEYS.has(c.key),
    );
    for (const col of numericCols) {
      const baseKey = isMergedColKey(col.key)
        ? (decodeGroupColKey(col.key)?.metricKey ?? col.key)
        : col.key;
      if (
        sourceGaps?.includes(baseKey) ||
        rows.some((r) => r[col.key] === null || r[col.key] === undefined)
      ) {
        gaps.add(col.key);
      }
    }
    return gaps;
  }, [rows, cols, sourceGaps]);

  const footerResult = React.useMemo<FooterRowResult | null>(
    () => (showFooter && sorted.length > 0 ? computeFooterRow(sorted, cols) : null),
    [showFooter, sorted, cols],
  );

  const SortIcon = ({ colKey }: { colKey: string }) => {
    if (!sort || sort.key !== colKey) return <ChevronUp className="h-3 w-3 opacity-20" />;
    return sort.dir === "asc" ? (
      <ChevronUp className="h-3 w-3 text-primary" />
    ) : (
      <ChevronDown className="h-3 w-3 text-primary" />
    );
  };

  const groupColorForKey = (key: string): string | undefined => {
    if (!isMultiGroup || !groupColorTokens || !activeGroups) return undefined;
    const decoded = decodeGroupColKey(key);
    if (!decoded || !activeGroups.includes(decoded.groupId)) return undefined;
    const token = groupColorTokens[decoded.groupId];
    return token ? `hsl(var(${token}))` : undefined;
  };

  const groupTintForKey = (key: string): string | undefined => {
    if (!isMultiGroup) return undefined;
    const decoded = decodeGroupColKey(key);
    if (!decoded) return undefined;
    const token = groupColorTokens?.[decoded.groupId];
    return token ? `hsl(var(${token}) / 0.12)` : undefined;
  };

  const headerLabel = (col: TableColumnDef) => {
    if (!groupColorTokens || !isMergedColKey(col.key)) return col.label;
    const decoded = decodeGroupColKey(col.key);
    if (!decoded) return col.label;
    const groupLabel = GROUP_LABELS[decoded.groupId] ?? decoded.groupId;
    const color = groupColorForKey(col.key);
    return (
      <span>
        {col.label}
        {" · "}
        <span style={color ? { color } : undefined}>{groupLabel}</span>
      </span>
    );
  };

  const isDimensionCol = (col: TableColumnDef) =>
    !isMergedColKey(col.key) && (SENTINEL_KEYS.has(col.key) || col.key === dimensionKey);

  return (
    <div className="flex flex-col min-h-0 flex-1 h-full">
      {title && (
        <div
          className="shrink-0 text-[10px] font-black uppercase tracking-widest px-2 py-1 border-b border-border/30"
          style={{ color: titleColor }}
        >
          {title}
        </div>
      )}

      <div className="flex-1 min-h-10">
        <TableVirtuoso
          defaultItemHeight={20}
          increaseViewportBy={80}
          className="shadcn-scrollbar"
          style={{ height: "99.5%", overflowX: "auto" }}
          totalCount={sorted.length}
          components={{
            Table: VirtuosoTable,
            TableFoot: VirtuosoTableFoot,
            // eslint-disable-next-line react/display-name
            TableRow: ({ "data-index": dataIndex, ...props }: any) => {
              const row = sorted[dataIndex];
              if (!row) return null;
              return (
                <TableRow
                  {...props}
                  className="hover:bg-muted/20 transition-colors border-b border-border/20"
                >
                  {cols.map((col) => {
                    const rawVal = row[col.key];
                    const tint = groupTintForKey(col.key);
                    const isDim = isDimensionCol(col);
                    return (
                      <TableCell
                        key={col.key}
                        className={cn(
                          "py-1 px-2 tabular-nums whitespace-nowrap min-w-28 max-w-28",
                          isDim
                            ? "text-left font-medium text-muted-foreground"
                            : "text-right font-semibold",
                          valueCls(rawVal as any, col.format, col.directional),
                        )}
                        style={tint ? { background: tint } : undefined}
                      >
                        {isDim ? (
                          rawVal != null ? (
                            col.key === "date" && col.dateGranularity ? (
                              formatBucketDate(String(rawVal), col.dateGranularity)
                            ) : (
                              String(rawVal)
                            )
                          ) : (
                            <UnavailableCell portalContainer={portalContainer} />
                          )
                        ) : (() => {
                          const isUnavail =
                            rawVal === null ||
                            rawVal === undefined ||
                            (typeof rawVal === "number" && !Number.isFinite(rawVal));
                          const colHasGap = columnGaps.has(col.key);
                          if (isUnavail || (colHasGap && rawVal === null))
                            return (
                              <span className="flex items-center justify-end">
                                <UnavailableCell portalContainer={portalContainer} />
                              </span>
                            );
                          return formatCell(rawVal as any, col.format);
                        })()}
                      </TableCell>
                    );
                  })}
                </TableRow>
              );
            },
            // eslint-disable-next-line react/display-name
            EmptyPlaceholder: () => (
              <TableRow>
                <TableCell
                  colSpan={cols.length}
                  className="h-16 text-center text-xs text-muted-foreground"
                >
                  No data
                </TableCell>
              </TableRow>
            ),
          }}
          fixedHeaderContent={() => (
            <TableRow className="bg-secondary hover:bg-secondary border-b border-border/40">
              {cols.map((col) => {
                const color = groupColorForKey(col.key);
                const isDim = isDimensionCol(col);
                return (
                  <TableHead
                    key={col.key}
                    className={cn(
                      "py-1.5 px-2 text-[10px] font-black uppercase tracking-widest cursor-pointer select-none whitespace-nowrap",
                      isDim ? "text-left" : "text-right",
                    )}
                    style={color ? { color } : undefined}
                    onClick={() => onSort(col.key)}
                  >
                    <span
                      className={cn(
                        "flex items-center gap-0.5",
                        isDim ? "justify-start" : "justify-end",
                      )}
                    >
                      {!isDim && <SortIcon colKey={col.key} />}
                      {headerLabel(col)}
                      {isDim && <SortIcon colKey={col.key} />}
                    </span>
                  </TableHead>
                );
              })}
            </TableRow>
          )}
          fixedFooterContent={
            footerResult
              ? () => {
                  const firstDimIdx = cols.findIndex(isDimensionCol);
                  const { values: footerValues } = footerResult;
                  return (
                    <TableRow className="bg-secondary hover:bg-secondary border-t-2 border-border/40 translate-y-1">
                      {cols.map((col, colIdx) => {
                        const isDim = isDimensionCol(col);
                        const val = footerValues[col.key];
                        const label = aggShortLabel(col.footerAggregation);
                        const hasGap = !isDim && columnGaps.has(col.key);
                        return (
                          <TableCell
                            key={col.key}
                            className={cn(
                              "py-3.5 px-2 font-bold tabular-nums whitespace-nowrap uppercase py-4",
                              isDim
                                ? "text-left text-foreground font-black text-xs tracking-widest"
                                : "text-right text-[13px]",
                              !isDim && valueCls(val as any, col.format, col.directional),
                            )}
                          >
                            {isDim ? (
                              colIdx === firstDimIdx ? "Total" : ""
                            ) : (
                              <span className="flex items-baseline justify-end gap-1">
                                {label && onFooterAggChange ? (
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <button className="text-[10px] font-mono normal-case tracking-normal text-muted-foreground/90 hover:text-primary transition-colors cursor-pointer shrink-0">
                                        [{label}]
                                      </button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-32">
                                      {AGG_OPTIONS.map((opt) => (
                                        <DropdownMenuItem
                                          key={opt.value}
                                          className={cn(
                                            "text-xs cursor-pointer",
                                            col.footerAggregation === opt.value &&
                                              "text-primary font-semibold",
                                          )}
                                          onClick={() => onFooterAggChange(col.key, opt.value)}
                                        >
                                          <span className="font-mono text-muted-foreground/90 w-10 shrink-0">
                                            {opt.short}
                                          </span>
                                          {opt.label}
                                        </DropdownMenuItem>
                                      ))}
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                ) : label ? (
                                  <span className="text-[10px] font-mono normal-case tracking-normal text-muted-foreground/90 shrink-0">
                                    [{label}]
                                  </span>
                                ) : null}
                                {val !== null ? formatCell(val as any, col.format) : null}
                                {hasGap && (
                                  <UnavailableCell
                                    tooltip="Computed over available rows only — some values are missing"
                                    portalContainer={portalContainer}
                                  />
                                )}
                              </span>
                            )}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  );
                }
              : undefined
          }
        />
      </div>
    </div>
  );
}

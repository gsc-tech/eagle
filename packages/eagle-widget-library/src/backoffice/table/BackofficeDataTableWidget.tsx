import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./primitives/Card";
import { Button } from "./primitives/Button";
import { Popover, PopoverContent, PopoverTrigger } from "./primitives/Popover";
import { Checkbox } from "./primitives/Checkbox";
import { TooltipProvider } from "./primitives/Tooltip";
import { TablePanel } from "./TablePanel";
import {
  Pencil,
  Trash2,
  RotateCcw,
  Maximize2,
  Minimize2,
  Download,
  Layers2,
  X,
} from "lucide-react";
import { TableMeasureSelector } from "./TableMeasureSelector";
import { cn } from "@gsc-tech/backoffice-core";
import { mkConfig, generateCsv, download as downloadCsv } from "export-to-csv";
import dayjs from "dayjs";
import {
  WidgetConfig,
  ChartItemConfig,
  GroupId,
  FieldAggregation,
  toggleSort,
  SortState,
  getEntityAxes,
} from "@gsc-tech/backoffice-core";

type TableGroupBy = string;

export interface BackofficeDataTableWidgetProps {
  widget: WidgetConfig;
  charts: ChartItemConfig[];
  isEditing?: boolean;
  onEdit?: (widget: WidgetConfig) => void;
  onReset?: () => void;
  onUpdate?: (id: string, patch: Partial<WidgetConfig>) => void;
  onRemove?: (id: string) => void;
  sanitizedProductFilter?: string[];
  /** Group color CSS-var token map, e.g. { A: "--chart-1", B: "--chart-2" } */
  groupColorTokens?: Record<string, string>;
  /** List of active group IDs */
  activeGroups?: string[];
  /** Whether the current user is an admin (enables CSV download) */
  isAdmin?: boolean;
}

export function BackofficeDataTableWidget({
  widget,
  charts,
  isEditing,
  onEdit,
  onReset,
  onUpdate,
  onRemove,
  groupColorTokens = {},
  activeGroups = [],
  isAdmin = false,
}: BackofficeDataTableWidgetProps) {
  const updateWidget = (id: string, patch: Partial<WidgetConfig>) => onUpdate?.(id, patch);
  const removeWidget = (id: string) => onRemove?.(id);

  // ── Measure editor ─────────────────────────────────────────────────────────
  const [showMeasureEditor, setShowMeasureEditor] = React.useState(false);

  // ── Fullscreen ─────────────────────────────────────────────────────────────
  const cardRef = React.useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = React.useState(false);

  React.useEffect(() => {
    const onFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      cardRef.current?.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  // ── CSV Download ───────────────────────────────────────────────────────────
  const csvConfig = mkConfig({
    fieldSeparator: ",",
    filename: `${dayjs().format("YYYY-MM-DD")}_${widget.title.replace(/\s+/g, "_")}`,
    decimalSeparator: ".",
    useKeysAsHeaders: true,
  });

  const handleDownload = () => {
    const allRows = charts.flatMap((chart) => chart.tableRows ?? []);
    if (allRows.length === 0) return;
    const cols = charts[0]?.tableColumnDefs ?? [];
    const rowData = allRows.map((row) =>
      Object.fromEntries(cols.map((col) => [col.label, row[col.key] ?? ""])),
    );
    const csv = generateCsv(csvConfig)(rowData);
    downloadCsv(csvConfig)(csv);
  };

  // ── Dimension / groupBy ────────────────────────────────────────────────────
  const currentGroupBy: TableGroupBy = (
    charts[0]?.tableGroupBy ?? widget.groupByDimension ?? "date"
  ) as TableGroupBy;

  const defaultSortForGroupBy = (gb: TableGroupBy): SortState =>
    gb === "date" || gb.startsWith("date-") ? { key: "date", dir: "desc" } : null;

  const [sort, setSort] = React.useState<SortState>(() => defaultSortForGroupBy(currentGroupBy));

  const prevGroupByRef = React.useRef<TableGroupBy>(currentGroupBy);
  React.useEffect(() => {
    if (prevGroupByRef.current !== currentGroupBy) {
      prevGroupByRef.current = currentGroupBy;
      setSort(defaultSortForGroupBy(currentGroupBy));
    }
  }, [currentGroupBy]);

  const updateTabularQuery = (updates: {
    tableGroupBy?: TableGroupBy;
    rowDimension?: string;
  }) => {
    const widgetUpdates: Partial<WidgetConfig> = {};
    if ("tableGroupBy" in updates) widgetUpdates.groupByDimension = updates.tableGroupBy;
    if ("rowDimension" in updates) widgetUpdates.rowDimension = updates.rowDimension;
    React.startTransition(() => {
      updateWidget(widget.id, widgetUpdates);
    });
  };

  const handleSort = (key: string) => setSort((prev) => toggleSort(prev, key));

  const handleFooterAggChange = (colKey: string, agg: FieldAggregation) => {
    const current = widget.footerAggOverrides ?? {};
    React.startTransition(() => {
      updateWidget(widget.id, { footerAggOverrides: { ...current, [colKey]: agg } });
    });
  };

  // ── Entity axes (groupBy dimension controls) ───────────────────────────────
  const datasetId = widget.datasetId ?? "financial";
  const axes = React.useMemo(() => getEntityAxes(datasetId.split(":")[0]), [datasetId]);
  const hasEntityAxes = axes.length > 0;

  const axisLevels: Record<string, string> = React.useMemo(() => {
    const defaults: Record<string, string> = {};
    for (const axis of axes) {
      const finest = axis.levels[axis.levels.length - 1];
      if (finest) defaults[axis.id] = finest.displayField ?? finest.field;
    }
    return { ...defaults, ...(widget.axisLevels ?? {}) };
  }, [axes, widget.axisLevels]);

  const allAxisFields = React.useMemo(
    () => axes.map((ax) => axisLevels[ax.id] ?? "").filter(Boolean),
    [axes, axisLevels],
  );

  const activeEntityFields: string[] = React.useMemo(() => {
    const stored = widget.groupByDimension;
    if (!stored) return allAxisFields;
    if (stored === "date") return [];
    if (stored.startsWith("date-")) return stored.slice(5).split("-");
    return allAxisFields;
  }, [widget.groupByDimension, allAxisFields]);

  const handleAxisLevelChange = (axisId: string, fieldKey: string) => {
    const newAxisLevels = { ...axisLevels, [axisId]: fieldKey };
    const axis = axes.find((a) => a.id === axisId);
    const oldField = axisLevels[axisId];
    const newEntityFields = activeEntityFields.map((f) =>
      f === oldField && axis ? fieldKey : f,
    );
    const tableGroupBy =
      newEntityFields.length === 0 ? "date" : `date-${newEntityFields.join("-")}`;
    const rowDimension =
      newEntityFields.length === 0 ? "time" : `time+entity:${newEntityFields.join(",")}`;
    React.startTransition(() => {
      updateWidget(widget.id, {
        axisLevels: newAxisLevels,
        groupByDimension: tableGroupBy,
        rowDimension,
      });
    });
  };

  const handleGroupBySelect = (entityFields: string[]) => {
    const tableGroupBy =
      entityFields.length === 0 ? "date" : `date-${entityFields.join("-")}`;
    const rowDimension =
      entityFields.length === 0 ? "time" : `time+entity:${entityFields.join(",")}`;
    updateTabularQuery({ tableGroupBy, rowDimension });
  };

  const viewMode = charts[0]?.tableViewMode ?? "merged";
  const dimensionKey = "date";

  return (
    <TooltipProvider delayDuration={100}>
      <Card
        ref={cardRef}
        className={cn(
          "h-full flex flex-col group relative overflow-hidden transition-all duration-300",
          "bg-background shadow-none border-none",
          isFullscreen && "bg-card rounded-none",
        )}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 py-1.5 px-3 shrink-0 border-b border-border/30">
          <div className="flex items-center gap-1.5">
            <CardTitle className="text-xs font-black uppercase tracking-widest text-muted-foreground/90">
              {widget.title}
            </CardTitle>
          </div>

          <div className="no-drag flex items-center gap-1">
            {isAdmin && charts.length > 0 && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-primary"
                title="Download CSV"
                onClick={handleDownload}
              >
                <Download className="h-3.5 w-3.5" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-primary"
              title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
              onClick={toggleFullscreen}
            >
              {isFullscreen ? (
                <Minimize2 className="h-3.5 w-3.5" />
              ) : (
                <Maximize2 className="h-3.5 w-3.5" />
              )}
            </Button>
            {isEditing && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-primary"
                  onClick={() => setShowMeasureEditor(true)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                {onReset ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    onClick={onReset}
                    title="Reset to default"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => removeWidget(widget.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </>
            )}
          </div>
        </CardHeader>

        {/* ── Dimension filter bar ────────────────────────────────────────── */}
        {hasEntityAxes && (
          <div className="no-drag shrink-0 flex items-center gap-2 px-3 py-1 border-b border-border/30 flex-wrap">
            {/* Per-axis level pickers */}
            {axes.map((axis) => (
              <div key={axis.id} className="flex items-center gap-1 shrink-0">
                {axes.length > 1 && (
                  <span className="text-[9px] uppercase tracking-widest text-muted-foreground/90 mr-0.5">
                    {axis.label ?? axis.id}
                  </span>
                )}
                <div className="flex items-center gap-0.5 rounded-lg bg-muted/40 p-0.5">
                  {axis.levels.map((level) => {
                    const fieldKey = level.displayField ?? level.field;
                    const isActive = axisLevels[axis.id] === fieldKey;
                    return (
                      <Button
                        key={fieldKey}
                        size="sm"
                        variant={isActive ? "secondary" : "ghost"}
                        className="h-6 text-[9px] px-2 font-bold uppercase tracking-wide rounded-md"
                        onClick={() => handleAxisLevelChange(axis.id, fieldKey)}
                      >
                        {level.label}
                      </Button>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Aggregate (collapse axes) popover */}
            {axes.length > 0 && widget.showGroupByToggle !== false && (() => {
              const collapsedAxes = axes.filter(
                (ax) => !activeEntityFields.includes(axisLevels[ax.id] ?? ""),
              );
              const isAnyCollapsed = collapsedAxes.length > 0;
              const MAX_VISIBLE = 2;
              const pillLabel = (() => {
                if (collapsedAxes.length === 0) return "None";
                const names = collapsedAxes.map((ax) => ax.label ?? ax.id);
                const visible = names.slice(0, MAX_VISIBLE).join(", ");
                return names.length > MAX_VISIBLE
                  ? `${visible} +${names.length - MAX_VISIBLE}`
                  : visible;
              })();
              return (
                <div className="flex items-center gap-1 shrink-0">
                  <span className="text-[9px] uppercase tracking-widest text-muted-foreground/90 mr-0.5">
                    Aggregate
                  </span>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className={cn(
                          "h-7 gap-1.5 px-2.5 text-xs font-medium",
                          isAnyCollapsed
                            ? "border border-primary/60 bg-primary/5 text-primary"
                            : "text-muted-foreground",
                        )}
                      >
                        <Layers2 className="h-3 w-3 shrink-0" />
                        <span className="truncate">{pillLabel}</span>
                        {isAnyCollapsed && (
                          <X
                            className="h-2.5 w-2.5 ml-0.5 shrink-0 text-primary/70 hover:text-primary"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleGroupBySelect(allAxisFields);
                            }}
                          />
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent
                      align="start"
                      side="bottom"
                      className="w-52 p-0 shadow-lg border-border/60"
                    >
                      <div className="px-3 py-2 border-b border-border/40 flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                          Aggregate
                        </span>
                        {isAnyCollapsed && (
                          <button
                            className="text-[9px] text-muted-foreground hover:text-foreground font-medium"
                            onClick={() => handleGroupBySelect(allAxisFields)}
                          >
                            Reset
                          </button>
                        )}
                      </div>
                      <div className="py-1">
                        {axes.map((axis) => {
                          const fieldKey = axisLevels[axis.id] ?? "";
                          const isAxisCollapsed = !activeEntityFields.includes(fieldKey);
                          return (
                            <button
                              key={axis.id}
                              className="w-full flex items-center gap-2 px-2.5 py-[5px] hover:bg-muted/40 transition-colors"
                              onClick={() => {
                                const nextEntityFields = isAxisCollapsed
                                  ? axes
                                      .map((ax) => axisLevels[ax.id] ?? "")
                                      .filter(
                                        (f) =>
                                          f &&
                                          (activeEntityFields.includes(f) || f === fieldKey),
                                      )
                                  : activeEntityFields.filter((f) => f !== fieldKey);
                                const ordered = axes
                                  .map((ax) => axisLevels[ax.id] ?? "")
                                  .filter((f) => nextEntityFields.includes(f));
                                handleGroupBySelect(ordered);
                              }}
                            >
                              <Checkbox
                                checked={isAxisCollapsed}
                                className="h-3 w-3 rounded-sm shrink-0 pointer-events-none"
                              />
                              <span
                                className={cn(
                                  "text-[11px] font-mono tracking-tight flex-1 text-left",
                                  isAxisCollapsed
                                    ? "text-foreground"
                                    : "text-muted-foreground",
                                )}
                              >
                                {axis.label ?? axis.id}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                      <div className="px-3 py-1.5 border-t border-border/30">
                        <span className="text-[9px] text-muted-foreground">
                          {collapsedAxes.length === 0
                            ? "Showing all dimensions"
                            : `${collapsedAxes.length} axis${collapsedAxes.length > 1 ? "es" : ""} collapsed`}
                        </span>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              );
            })()}
          </div>
        )}

        {showMeasureEditor && onUpdate && (
          <TableMeasureSelector
            widget={widget}
            isAdmin={isAdmin}
            onClose={() => setShowMeasureEditor(false)}
            onSave={(measures) => {
              onUpdate(widget.id, { measures });
              setShowMeasureEditor(false);
            }}
          />
        )}

        <CardContent className="flex-1 min-h-0 pt-2 pb-2 px-2 flex flex-col">
          <div className="flex-1 min-h-0">
            {charts.length === 0 ? (
              <div className="flex items-center justify-center h-full text-xs text-muted-foreground">
                No data
              </div>
            ) : viewMode === "juxtaposed" ? (
              <div className="flex flex-col gap-2 h-full overflow-y-auto shadcn-scrollbar">
                {charts.map((chart) => {
                  const gid = chart.title as GroupId;
                  const token = groupColorTokens[gid];
                  const color = token ? `hsl(var(${token}))` : undefined;
                  return (
                    <div key={chart.id} className="flex-1 min-h-0 rounded-md overflow-hidden">
                      <TablePanel
                        title={chart.title}
                        titleColor={color}
                        rows={chart.tableRows ?? []}
                        cols={chart.tableColumnDefs ?? []}
                        sort={sort}
                        onSort={handleSort}
                        dimensionKey={dimensionKey}
                        onFooterAggChange={handleFooterAggChange}
                        portalContainer={isFullscreen ? cardRef.current : null}
                        sourceGaps={chart.tableColumnGaps}
                      />
                    </div>
                  );
                })}
              </div>
            ) : (
              <TablePanel
                rows={charts[0]?.tableRows ?? []}
                cols={charts[0]?.tableColumnDefs ?? []}
                activeGroups={activeGroups as GroupId[]}
                groupColorTokens={groupColorTokens as Record<GroupId, string>}
                sort={sort}
                onSort={handleSort}
                dimensionKey={dimensionKey}
                onFooterAggChange={handleFooterAggChange}
                portalContainer={isFullscreen ? cardRef.current : null}
                sourceGaps={charts[0]?.tableColumnGaps}
              />
            )}
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}

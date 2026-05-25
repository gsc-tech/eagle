/**
 * `<SeasonalityExpressionBuilder>` — internal component for composing a
 * Falcon seasonality expression. The full behaviour spec is in
 * falcon-ui/src/seasonality/components/MarketExprBuilder.tsx (cell coefficient
 * matrix) and MarketTabs.tsx (tab strip across IM1/IM2/IM3/Single/Custom).
 *
 * Scope (T2.5):
 *   - Tab strip rendered only when `marketScope === 'all'`.
 *   - Cell-matrix builder for `single` + IM modes; one row per symbol.
 *   - Free-form textarea for `custom`.
 *   - Action buttons row: Chart / Add to Watchlist / Set Alert. Handlers
 *     are passed in from the consumer (wired by T2.7 / T2.8 modals in the
 *     widget shell).
 *
 * The component is presentational over `symbols: ProductContract[]` — the
 * parent fetches market metadata; this builder only renders / mutates the
 * coefficient matrix and emits a finished expression string.
 */

"use client";

import { useEffect, useMemo, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { ChevronLeft, ChevronRight, Copy, Check } from "lucide-react";
import {
  type Cell,
  type DollarConversion,
  type ProductContract,
  type SymbolMatrix,
  CellsBySymbol,
  cellToExpr,
  exprToMatrix,
} from "../../utils/seasonality";

// ─── Public types ─────────────────────────────────────────────────────────────

export type MarketScope = "all" | "single" | "im1" | "im2" | "im3" | "custom";

type TabKey = Exclude<MarketScope, "all">;

const TAB_ORDER: TabKey[] = ["single", "im1", "im2", "im3", "custom"];
const TAB_LABEL: Record<TabKey, string> = {
  single: "Single",
  im1: "IM1",
  im2: "IM2",
  im3: "IM3",
  custom: "Custom",
};

// Map a SeasonalityMarket payload value to the internal MarketScope tab key.
// Returns null for unknown markets (caller falls back to "custom").
function marketToTabKey(market: string | undefined): TabKey | null {
  switch (market) {
    case "Single Market": return "single";
    case "Intermarket 1": return "im1";
    case "Intermarket 2": return "im2";
    case "Intermarket 3": return "im3";
    case "Custom":        return "custom";
    default:              return null;
  }
}

export interface SeasonalityExpressionBuilderProps {
  marketScope: MarketScope;
  /**
   * Available symbols for matrix mode. The parent fetches market metadata
   * (e.g. via the data-connector layer) and passes the matching subset for
   * the current market — e.g. for IM1, the parent passes the IM1 symbols.
   * For `marketScope === 'all'`, pass the union; this component filters by
   * the active tab via the optional `symbolsByMarket` map.
   */
  symbols?: ProductContract[];
  /** Override `symbols` per tab when in `marketScope='all'` mode. */
  symbolsByMarket?: Partial<Record<TabKey, ProductContract[]>>;
  /**
   * In Single-market mode, the full universe the user can pick from via the
   * symbol dropdown on each row. Defaults to `symbols`.
   */
  symbolUniverse?: ProductContract[];
  /** Seed value for the Custom textarea. */
  defaultExpression?: string;
  /**
   * Pre-populated matrix rows — when set, replaces the seeded default matrix
   * on the active (non-custom) tab. Used by right-click → open-in-builder
   * navigation to restore the exact watchlist/alert expression state.
   * Identity change triggers re-hydration.
   */
  pendingMatrix?: SymbolMatrix[];
  /**
   * When `marketScope === 'all'`, switch the active tab to the one matching
   * this market on identity change. Ignored if marketScope is fixed.
   */
  pendingMarket?: string;
  /**
   * Current FX conversion table. Required for DE / DDE math to be accurate —
   * pass `{}` if not yet loaded; cellToExpr falls back to a rate of 1.
   */
  dollarConversion?: DollarConversion;
  onChart?: (expression: string) => void;
  onAddToWatchlist?: (expression: string) => void;
  onSetAlert?: (expression: string) => void;
  darkMode?: boolean;
  /**
   * Fires whenever the DE / FDE / DDE state changes (Falcon parity). `de` is
   * true when the "DE" or "FDE" checkbox is checked; `dde` is only ever true
   * when the expression contains non-USD symbols and the user selects the DDE
   * variant (mutually exclusive with FDE).
   */
  onDeChange?: (de: boolean, dde: boolean) => void;
}

// ─── Cell-row sub-component ───────────────────────────────────────────────────

interface MatrixRowProps {
  row: SymbolMatrix;
  marketLabel?: string;
  universe?: ProductContract[];
  onCellsChange: (cells: Cell[]) => void;
  onToggleEnabled: () => void;
  onChangeSymbol?: (next: ProductContract) => void;
}

function MatrixRow({
  row,
  marketLabel,
  universe,
  onCellsChange,
  onToggleEnabled,
  onChangeSymbol,
}: MatrixRowProps) {
  const shiftLeft = () => {
    const res = row.cells.map((c, idx) => ({
      code: c.code,
      value: row.cells[idx === row.cells.length - 1 ? 0 : idx + 1].value,
    }));
    onCellsChange(res);
  };
  const shiftRight = () => {
    const res = row.cells.map((c, idx) => ({
      code: c.code,
      value: row.cells[idx === 0 ? row.cells.length - 1 : idx - 1].value,
    }));
    onCellsChange(res);
  };
  const invert = () =>
    onCellsChange(row.cells.map((c) => ({ code: c.code, value: -c.value })));
  const reset = () =>
    onCellsChange(row.cells.map((c) => ({ code: c.code, value: 0 })));

  const pickable = universe && universe.length > 1 && onChangeSymbol;

  return (
    <div className="flex items-center gap-2 py-1">
      {marketLabel && (
        <span className="text-xs font-medium text-slate-500 dark:text-zinc-400 w-16">
          {marketLabel}
        </span>
      )}

      {pickable ? (
        <select
          value={row.symbol.id}
          onChange={(e) => {
            const next = universe!.find((s) => s.id === e.target.value);
            if (next) onChangeSymbol!(next);
          }}
          className={`px-2 py-1 rounded-md border text-sm font-medium ${
            row.enabled
              ? "border-slate-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-slate-800 dark:text-zinc-200"
              : "border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-900 text-slate-400 line-through"
          }`}
        >
          {universe!.map((s) => (
            <option key={s.id} value={s.id}>{s.symbol}</option>
          ))}
        </select>
      ) : (
        <button
          onClick={onToggleEnabled}
          className={`w-12 text-sm font-medium text-left ${
            row.enabled
              ? "text-slate-800 dark:text-zinc-200"
              : "text-slate-400 line-through opacity-70"
          }`}
          title="Toggle symbol"
        >
          {row.symbol.symbol}
        </button>
      )}

      <button onClick={shiftLeft} className="p-1 text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-zinc-200">
        <ChevronLeft className="w-4 h-4" />
      </button>

      <div className="flex gap-1">
        {row.cells.map((cell) => (
          <CellInput
            key={cell.code}
            cell={cell}
            onChange={(next) =>
              onCellsChange(row.cells.map((c) => (c.code === next.code ? next : c)))
            }
          />
        ))}
      </div>

      <button onClick={shiftRight} className="p-1 text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-zinc-200">
        <ChevronRight className="w-4 h-4" />
      </button>

      <div className="flex-1" />

      <button
        onClick={invert}
        className="px-2 py-1 text-xs font-medium rounded-md bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/50"
        title="Invert signs"
      >
        I
      </button>
      <button
        onClick={reset}
        className="px-2 py-1 text-xs font-medium rounded-md bg-slate-100 dark:bg-zinc-700/50 text-slate-700 dark:text-zinc-300 hover:bg-slate-200 dark:hover:bg-zinc-700"
      >
        Reset
      </button>
    </div>
  );
}

interface CellInputProps {
  cell: Cell;
  onChange: (next: Cell) => void;
}

function CellInput({ cell, onChange }: CellInputProps) {
  const [editable, setEditable] = useState(false);

  // Left-click increments, right-click decrements, shift-click toggles
  // free-text editing (matches Falcon's Slider behaviour).
  const onClick = (e: React.MouseEvent) => {
    if (e.shiftKey) {
      setEditable((v) => !v);
      return;
    }
    if (!editable) onChange({ ...cell, value: cell.value + 1 });
  };
  const onContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    onChange({ ...cell, value: cell.value - 1 });
  };

  return (
    <div className="flex flex-col items-center cursor-pointer" onClick={onClick} onContextMenu={onContextMenu}>
      <input
        type="number"
        value={cell.value === 0 ? "" : cell.value}
        readOnly={!editable}
        onChange={(e) =>
          onChange({
            ...cell,
            value: Number.isNaN(e.target.valueAsNumber) ? 0 : e.target.valueAsNumber,
          })
        }
        className="w-8 h-7 p-0 text-center text-xs font-semibold rounded-md border border-slate-300 dark:border-zinc-600 bg-white dark:bg-zinc-700/50 text-slate-800 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
      />
      <span className="text-[10px] text-slate-500 dark:text-zinc-400 mt-0.5">{cell.code}</span>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function SeasonalityExpressionBuilder(props: SeasonalityExpressionBuilderProps) {
  const {
    marketScope,
    symbols = [],
    symbolsByMarket,
    symbolUniverse,
    defaultExpression = "",
    pendingMatrix,
    pendingMarket,
    dollarConversion = {},
    onChart,
    onAddToWatchlist,
    onSetAlert,
    darkMode,
    onDeChange,
  } = props;

  const [de, setDe] = useState(false);
  // DDE (Domestic Dollar Equivalent) — only relevant when the expression
  // contains non-USD symbols. Mutually exclusive with FDE (de=true).
  const [dde, setDde] = useState(false);
  const [copied, setCopied] = useState(false);

  // When marketScope === 'all', user picks via tabs. Otherwise the active
  // tab is fixed to the prop value.
  const initialTab: TabKey = marketScope === "all" ? "single" : marketScope;
  const [activeTab, setActiveTab] = useState<TabKey>(initialTab);
  const effectiveTab: TabKey = marketScope === "all" ? activeTab : marketScope;

  // Full product universe — used to populate the symbol-picker dropdown on each row.
  const universe = useMemo<ProductContract[]>(() => {
    if (effectiveTab === "custom") return [];
    if (symbolsByMarket?.[effectiveTab]) return symbolsByMarket[effectiveTab]!;
    return symbolUniverse ?? symbols;
  }, [symbols, symbolsByMarket, symbolUniverse, effectiveTab]);

  // Number of matrix rows per market scope (mirrors Falcon's symbolToSymbolMatrixContract).
  const rowsForTab = (tab: TabKey): number => {
    switch (tab) {
      case "single": return 1;
      case "im1":    return 2;
      case "im2":    return 3;
      case "im3":    return 4;
      default:       return 0;
    }
  };

  // Seed symbols for the matrix: filter full list to the default set ["RB","HO","CL","NG"],
  // sorted in that order, then slice to N rows. Falls back to the first N products if none
  // of the defaults are present (e.g. a non-energy deployment).
  const DEFAULT_SYMBOLS = ["RB", "HO", "CL", "NG"];
  const seedSymbols = useMemo<ProductContract[]>(() => {
    if (effectiveTab === "custom") return [];
    const src = symbolsByMarket?.[effectiveTab] ?? symbols;
    const n = rowsForTab(effectiveTab);
    const filtered = src
      .filter((s) => DEFAULT_SYMBOLS.includes(s.symbol))
      .sort((a, b) => DEFAULT_SYMBOLS.indexOf(a.symbol) - DEFAULT_SYMBOLS.indexOf(b.symbol));
    const pool = filtered.length > 0 ? filtered : src;
    return pool.slice(0, n);
  }, [symbols, symbolsByMarket, effectiveTab]);

  // Matrix state: N rows seeded from the filtered default symbols.
  const [matrix, setMatrix] = useState<SymbolMatrix[]>(() =>
    seedSymbols.map((s) => ({
      id: uuidv4(),
      symbol: s,
      cells: CellsBySymbol(s),
      enabled: true,
    })),
  );

  // Reset matrix when the tab changes or the symbol data first arrives.
  // Keyed on tab + first-seed-symbol so user edits within a tab survive re-renders.
  const matrixKey = `${effectiveTab}:${seedSymbols[0]?.id ?? ""}`;
  useEffect(() => {
    console.log("[SeasonalityExpressionBuilder] ⚠️ matrixKey reset fired — wiping matrix to seed symbols. matrixKey:", matrixKey, "| effectiveTab:", effectiveTab, "| seedSymbols count:", seedSymbols.length, "| pendingMatrix at this point (from closure):", pendingMatrix ? `${pendingMatrix.length} rows` : "none");
    setMatrix(
      seedSymbols.map((s) => ({
        id: uuidv4(),
        symbol: s,
        cells: CellsBySymbol(s),
        enabled: true,
      })),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matrixKey]);

  // Switch tab on inbound right-click navigation when the parent is in 'all'
  // marketScope mode. No-op when the tab is fixed.
  useEffect(() => {
    if (marketScope !== "all" || !pendingMarket) return;
    const next = marketToTabKey(pendingMarket);
    console.log("[SeasonalityExpressionBuilder] pendingMarket effect — market:", pendingMarket, "→ tabKey:", next, "| marketScope:", marketScope);
    if (next) setActiveTab(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingMarket]);

  // Hydrate matrix from a right-click payload. Runs after the tab-reset effect
  // above because pendingMatrix updates land in their own commit, so the seeded
  // matrix is overwritten on the next render.
  useEffect(() => {
    console.log("[SeasonalityExpressionBuilder] pendingMatrix effect — pendingMatrix:", pendingMatrix ? `${pendingMatrix.length} rows` : "none", "| effectiveTab:", effectiveTab);
    if (!pendingMatrix || pendingMatrix.length === 0) {
      console.log("[SeasonalityExpressionBuilder] ❌ pendingMatrix effect: no matrix to apply");
      return;
    }
    if (effectiveTab === "custom") {
      console.log("[SeasonalityExpressionBuilder] ❌ pendingMatrix effect: effectiveTab is custom — skipping matrix hydration");
      return;
    }
    console.log("[SeasonalityExpressionBuilder] ✅ pendingMatrix effect: applying", pendingMatrix.length, "rows to matrix");
    setMatrix(
      pendingMatrix.map((r) => ({
        id: uuidv4(),
        symbol: r.symbol,
        cells: r.cells.map((c) => ({ ...c })),
        enabled: r.enabled,
      })),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingMatrix, effectiveTab]);

  const [customExpr, setCustomExpr] = useState(defaultExpression);

  // Sync customExpr when defaultExpression changes (right-click hydration of
  // the Custom tab). Skip while the user is actively editing — we only push
  // the new value when the prop identity changes.
  useEffect(() => {
    console.log("[SeasonalityExpressionBuilder] defaultExpression effect — new value:", JSON.stringify(defaultExpression), "| effectiveTab:", effectiveTab);
    setCustomExpr(defaultExpression);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultExpression]);

  // When an expression arrives via defaultExpression and the active tab is a
  // matrix mode, parse the expression back into cell coefficients so the
  // builder visually reflects what is being charted. Also restore the DE
  // checkbox when a scalar wrapper is detected (e.g. 42000*(RBH27-RBJ27)).
  // NOTE: also re-runs when `universe` changes — the product fetch completes
  // after the expression is set, so we must retry once symbols are available.
  useEffect(() => {
    console.log("[SeasonalityExpressionBuilder] exprToMatrix effect — defaultExpression:", JSON.stringify(defaultExpression), "| effectiveTab:", effectiveTab, "| universe size:", universe.length);
    if (!defaultExpression || effectiveTab === "custom") {
      console.log("[SeasonalityExpressionBuilder] exprToMatrix effect: skipped (no expression or custom tab)");
      return;
    }
    if (universe.length === 0) {
      console.log("[SeasonalityExpressionBuilder] exprToMatrix effect: universe empty — will retry when symbols arrive");
      return;
    }
    const result = exprToMatrix(defaultExpression, universe, rowsForTab(effectiveTab));
    console.log("[SeasonalityExpressionBuilder] exprToMatrix result:", result ? `${result.matrix.length} rows, de=${result.de}` : "null (parse failed)");
    if (result) {
      setMatrix(result.matrix);
      if (result.de) setDe(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultExpression, universe]);

  // Detect non-USD symbols in the active matrix (Falcon `hasNonUSD` parity).
  // When any enabled row uses a non-USD currency, show "FDE" label and offer
  // a DDE checkbox (mutually exclusive with FDE).
  const hasNonUSD = useMemo(
    () => matrix.some((r) => r.enabled && r.symbol?.currency && r.symbol.currency !== "USD"),
    [matrix],
  );

  // Bubble DE/DDE state up to parent so the chart can adjust Y-axis format.
  useEffect(() => {
    onDeChange?.(de, dde);
  }, [de, dde, onDeChange]);

  // Resolve the current expression by joining each enabled row's cellToExpr.
  const computedExpression = useMemo(() => {
    if (effectiveTab === "custom") return customExpr.trim();
    const parts = matrix
      .filter((r) => r.enabled)
      .map((r) => cellToExpr(r.cells, r.symbol, de, false, dollarConversion))
      .filter(Boolean);
    return parts.join(" + ").replace(/\+ -/g, "- ");
  }, [effectiveTab, customExpr, matrix, de, dollarConversion]);

  const copyExpression = async () => {
    if (!computedExpression) return;
    try {
      await navigator.clipboard.writeText(computedExpression);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard API unavailable (insecure context, denied permission) —
      // ignore silently; the expression is already visible on screen.
    }
  };

  const updateRow = (id: string, mutate: (r: SymbolMatrix) => SymbolMatrix) =>
    setMatrix((rows) => rows.map((r) => (r.id === id ? mutate(r) : r)));

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className={`flex flex-col gap-3 p-3 ${darkMode ? "text-zinc-100" : "text-slate-800"}`}>
      {marketScope === "all" && (
        <div className="flex gap-1 border-b border-slate-200 dark:border-zinc-700">
          {TAB_ORDER.map((t) => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className={`px-3 py-1.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                activeTab === t
                  ? "border-blue-600 text-blue-700 dark:text-blue-300"
                  : "border-transparent text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-zinc-200"
              }`}
            >
              {TAB_LABEL[t]}
            </button>
          ))}
        </div>
      )}

      {effectiveTab === "custom" ? (
        <textarea
          value={customExpr}
          onChange={(e) => setCustomExpr(e.target.value)}
          placeholder="Enter a Falcon expression (e.g. RBH24 - RBJ24)…"
          rows={4}
          className="w-full rounded-md border border-slate-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-slate-800 dark:text-zinc-100 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      ) : matrix.length === 0 ? (
        <div className="text-sm text-slate-500 dark:text-zinc-400 py-4 px-2">
          No symbols available for this market — pass `symbols` (or `symbolsByMarket`) to render the matrix.
        </div>
      ) : (
        <div className="flex flex-col divide-y divide-slate-100 dark:divide-zinc-800">
          {matrix.map((row, idx) => (
            <MatrixRow
              key={row.id}
              row={row}
              marketLabel={`Market ${idx + 1}`}
              universe={universe}
              onCellsChange={(cells) => updateRow(row.id, (r) => ({ ...r, cells }))}
              onToggleEnabled={() => updateRow(row.id, (r) => ({ ...r, enabled: !r.enabled }))}
              onChangeSymbol={(next) =>
                updateRow(row.id, () => ({
                  id: next.id,
                  symbol: next,
                  cells: CellsBySymbol(next),
                  enabled: true,
                }))
              }
            />
          ))}
        </div>
      )}

      <div className="flex items-center gap-3 pt-2">
        {effectiveTab !== "custom" && (
          <>
            {/* FDE / DE checkbox — label is "FDE" when non-USD symbols are
                present (Falcon parity: `hasNonUSD ? 'FDE' : 'DE'`). Turning
                on FDE turns off DDE and vice versa. */}
            <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-zinc-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={de}
                onChange={(e) => {
                  const next = e.target.checked;
                  setDe(next);
                  if (next) setDde(false);
                }}
                className="w-3.5 h-3.5"
              />
              {hasNonUSD ? "FDE" : "DE"}
            </label>
            {/* DDE checkbox — only shown when non-USD symbols are present */}
            {hasNonUSD && (
              <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-zinc-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={dde}
                  onChange={(e) => {
                    const next = e.target.checked;
                    setDde(next);
                    if (next) setDe(false);
                  }}
                  className="w-3.5 h-3.5"
                />
                DDE
              </label>
            )}
          </>
        )}
        <button
          disabled={!computedExpression || !onChart}
          onClick={() => onChart?.(computedExpression)}
          className="px-4 py-1.5 text-sm font-medium rounded-md bg-violet-600 hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed text-white"
        >
          Chart
        </button>
        <button
          disabled={!computedExpression || !onAddToWatchlist}
          onClick={() => onAddToWatchlist?.(computedExpression)}
          className="px-3 py-1.5 text-sm font-medium rounded-md bg-slate-200 dark:bg-zinc-700 hover:bg-slate-300 dark:hover:bg-zinc-600 disabled:opacity-40 disabled:cursor-not-allowed text-slate-800 dark:text-zinc-100"
        >
          Add to Watchlist
        </button>
        <button
          disabled={!computedExpression || !onSetAlert}
          onClick={() => onSetAlert?.(computedExpression)}
          className="px-3 py-1.5 text-sm font-medium rounded-md bg-amber-100 dark:bg-amber-900/30 hover:bg-amber-200 dark:hover:bg-amber-900/50 disabled:opacity-40 disabled:cursor-not-allowed text-amber-800 dark:text-amber-200"
        >
          Set Alert
        </button>
      </div>

      <div className="flex items-center gap-2 text-xs">
        <span className="font-medium text-slate-500 dark:text-zinc-400">Expression:</span>
        <span
          className="font-mono text-slate-700 dark:text-zinc-200 truncate flex-1"
          title={computedExpression}
        >
          {computedExpression || <span className="opacity-50">—</span>}
        </span>
        <button
          onClick={copyExpression}
          disabled={!computedExpression}
          title={copied ? "Copied!" : "Copy expression"}
          className="p-1 rounded hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-500 dark:text-zinc-400 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
      </div>
    </div>
  );
}


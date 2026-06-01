/**
 * `SeasonalityExpressionBuilderWidget` — widget shell around the
 * `<SeasonalityExpressionBuilder>` internal component (T3.1).
 *
 * Wiring:
 *   - "Chart" → writes `groupedParametersValues[groupId] = expression` AND
 *     emits `seasonality:expression-loaded` so bound chart widgets refetch.
 *   - "Add to Watchlist" / "Set Alert" → opens the matching modal (T2.7/T2.8).
 *   - Subscribes to `seasonality:open-in-builder` — when a sibling widget
 *     navigates to the builder, the incoming expression seeds the Custom
 *     textarea (full matrix restore needs T7.2's symbol-matrix payload).
 */

"use client";

import { useEffect, useState } from "react";
import { WidgetContainer } from "../../components/WidgetContainer";
import {
  SeasonalityExpressionBuilder,
  type MarketScope,
} from "../../components/seasonality/SeasonalityExpressionBuilder";
import { AddToWatchlistModal } from "../../components/seasonality/AddToWatchlistModal";
import { SetAlertModal } from "../../components/seasonality/SetAlertModal";
import { widgetEventBus, WIDGET_EVENTS } from "../../store/widgetEventBus";
import { usePendingBuilderNavStore } from "../../store/pendingBuilderNavStore";
import { falconApiClient } from "../../utils/falconApiClient";
import type { BaseWidgetProps } from "../../types";
import type { ProductContract, DollarConversion, SymbolMatrix } from "../../utils/seasonality";
import type { SeasonalityMarket } from "../../store/seasonalityWatchlistStore";

export interface SeasonalityExpressionBuilderWidgetProps extends BaseWidgetProps {
  /** Which markets the builder exposes. Defaults to 'all' (full tab strip). */
  marketScope?: MarketScope;
  /** Group key — chart widgets bound to the same `groupId` re-render on Chart. */
  groupId?: string;
  /** Symbol metadata. Host fetches via data-connector and passes through. */
  symbols?: ProductContract[];
  symbolsByMarket?: Partial<Record<Exclude<MarketScope, "all">, ProductContract[]>>;
  symbolUniverse?: ProductContract[];
}

export function SeasonalityExpressionBuilderWidget(
  props: SeasonalityExpressionBuilderWidgetProps,
) {
  const {
    id,
    title,
    darkMode,
    marketScope = "all",
    groupId = "seasonality-expr",
    symbols,
    symbolsByMarket,
    symbolUniverse,
    onGroupedParametersChange,
    addWidgetToDashboard,
    widgetTarget,
    initialWidgetState,
    onWidgetStateChange,
  } = props;

  const [pendingExpression, setPendingExpression] = useState<string | null>(() => {
    return usePendingBuilderNavStore.getState().pending?.expression ?? initialWidgetState?.expression ?? null;
  });
  const [pendingMatrix, setPendingMatrix] = useState<SymbolMatrix[] | undefined>(() => {
    return usePendingBuilderNavStore.getState().pending?.symbolMatrix ?? initialWidgetState?.symbolMatrix;
  });
  const [pendingMarket, setPendingMarket] = useState<SeasonalityMarket | undefined>(() => {
    return usePendingBuilderNavStore.getState().pending?.market ?? initialWidgetState?.market;
  });
  const [watchlistOpen, setWatchlistOpen] = useState(false);
  const [alertOpen, setAlertOpen] = useState(false);
  const [modalExpression, setModalExpression] = useState("");

  // On mount: claim a pending navigation payload written by the nav hook before
  // the tab switch. Clear the store so sibling builders don't also claim it.
  useEffect(() => {
    const p = usePendingBuilderNavStore.getState().pending;
    if (!p) return;
    usePendingBuilderNavStore.getState().clear();
    setPendingExpression(p.expression);
    setPendingMatrix(p.symbolMatrix);
    setPendingMarket(p.market);
    onWidgetStateChange?.({ expression: p.expression, market: p.market, symbolMatrix: p.symbolMatrix });
    if (p.expression) {
      console.log("[SeasonalityExpressionBuilderWidget] claimed pending nav →", {
        expr: p.expression, markerCount: p.overlayMarkers?.length ?? 0,
        markerIds: p.overlayMarkers?.map((m) => m.id),
      });
      onGroupedParametersChange?.({ [groupId]: p.expression });
      // Defer so sibling chart widgets finish their own mount effects (and
      // subscribe to expression-loaded) before this emit fires.
      const overlayMarkers = p.overlayMarkers;
      const expression = p.expression;
      setTimeout(() => {
        console.log("[SeasonalityExpressionBuilderWidget] deferred emit expression-loaded →", {
          expr: expression, markerCount: overlayMarkers?.length ?? 0,
        });
        widgetEventBus.emit(WIDGET_EVENTS.SEASONALITY_EXPRESSION_LOADED, {
          expression,
          sourceWidgetId: id ?? "",
          groupId,
          overlayMarkers,
        });
      }, 0);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // mount only

  // Self-fetch symbol list and FX rates from the Falcon middleware on mount.
  // Props take priority — if the parent already passes symbols, skip the fetch.
  const [fetchedSymbols, setFetchedSymbols] = useState<ProductContract[] | undefined>(undefined);
  const [fetchedDE, setFetchedDE] = useState<DollarConversion | undefined>(undefined);

  useEffect(() => {
    if (symbols !== undefined) return; // parent-supplied; no need to fetch
    const ctrl = new AbortController();
    // Full product/contract catalogue from the Falcon auth backend.
    // Response is wrapped: { productContract: ProductContract[] }
    falconApiClient
      .get<{ productContract: ProductContract[] }>("/api/product", { signal: ctrl.signal })
      .then((res) => setFetchedSymbols(res?.productContract ?? []))
      .catch((e) => {
        if ((e as Error).name !== "AbortError")
          console.error("[SeasonalityExpressionBuilderWidget] /api/product failed", e);
      });
    // FX rates for DE/DDE math.
    falconApiClient
      .get<DollarConversion>("/api/seasonality/DE", { signal: ctrl.signal })
      .then(setFetchedDE)
      .catch((e) => {
        if ((e as Error).name !== "AbortError")
          console.error("[SeasonalityExpressionBuilderWidget] /api/seasonality/DE failed", e);
      });
    return () => ctrl.abort();
  }, [symbols]);

  // Listen for navigation events from other widgets (alerts / watchlist).
  // Matrix-mode payloads (`symbolMatrix` + non-custom `market`) hydrate the
  // builder's matrix directly; custom-mode payloads land in the Custom tab's
  // textarea via `defaultExpression`. Either way we auto-fire Chart so any
  // bound chart widget in the same group re-renders.
  useEffect(() => {
    const unsub = widgetEventBus.subscribe("seasonality:open-in-builder", (p) => {
      setPendingExpression(p.expression);
      setPendingMatrix(p.symbolMatrix);
      setPendingMarket(p.market);
      onWidgetStateChange?.({ expression: p.expression, market: p.market, symbolMatrix: p.symbolMatrix });
      if (p.expression) {
        console.log("[SeasonalityExpressionBuilderWidget] open-in-builder → forwarding to chart →", {
          expr: p.expression, markerCount: p.overlayMarkers?.length ?? 0,
          markerIds: p.overlayMarkers?.map((m) => m.id),
        });
        onGroupedParametersChange?.({ [groupId]: p.expression });
        widgetEventBus.emit(WIDGET_EVENTS.SEASONALITY_EXPRESSION_LOADED, {
          expression: p.expression,
          sourceWidgetId: id ?? "",
          groupId,
          overlayMarkers: p.overlayMarkers,
        });
      }
    });
    return unsub;
  }, [groupId, id, onGroupedParametersChange]);

  const handleChart = (expression: string) => {
    if (!expression) return;
    onGroupedParametersChange?.({ [groupId]: expression });
    widgetEventBus.emit(WIDGET_EVENTS.SEASONALITY_EXPRESSION_LOADED, {
      expression,
      sourceWidgetId: id ?? "",
      groupId,
    });
    onWidgetStateChange?.({ expression, market: pendingMarket, symbolMatrix: pendingMatrix });
  };

  const handleAddToWatchlist = (expression: string) => {
    setModalExpression(expression);
    setWatchlistOpen(true);
  };

  const handleSetAlert = (expression: string) => {
    setModalExpression(expression);
    setAlertOpen(true);
  };

  return (
    <WidgetContainer title={title ?? "Seasonality Expression Builder"} darkMode={darkMode}>
      <SeasonalityExpressionBuilder
        marketScope={marketScope}
        symbols={symbols ?? fetchedSymbols}
        symbolsByMarket={symbolsByMarket}
        symbolUniverse={symbolUniverse}
        dollarConversion={fetchedDE}
        defaultExpression={pendingExpression ?? undefined}
        pendingMatrix={pendingMatrix}
        pendingMarket={pendingMarket}
        darkMode={darkMode}
        onChart={handleChart}
        onAddToWatchlist={handleAddToWatchlist}
        onSetAlert={handleSetAlert}
      />

      <AddToWatchlistModal
        open={watchlistOpen}
        onClose={() => setWatchlistOpen(false)}
        expression={modalExpression}
        marketConfig={{ market: "Custom" }}
        widgetTarget={widgetTarget}
        addWidgetToDashboard={addWidgetToDashboard}
        darkMode={darkMode}
      />

      <SetAlertModal
        open={alertOpen}
        onClose={() => setAlertOpen(false)}
        expression={modalExpression}
        market="Custom"
        darkMode={darkMode}
      />
    </WidgetContainer>
  );
}

export const SeasonalityExpressionBuilderWidgetDef = {
  component: SeasonalityExpressionBuilderWidget,
  category: "Seasonality",
} as const;
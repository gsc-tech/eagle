/**
 * `<SetAlertModal>` — port of falcon-ui/.../AlertFormNew.tsx in Eagle Tailwind
 * with Redux dropped in favour of `useSeasonalityAlertsStore.createAlert`.
 *
 * Fields (T2.8): name, condition (>, <, inRange), occurrence, afterExpiration,
 * notification channels. Cross-references falcon-ui/src/alerts/Types.ts.
 */

"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import {
  useSeasonalityAlertsStore,
  type AlertAfterExpiration,
  type AlertCondition,
  type AlertNotificationType,
  type AlertOccurrence,
} from "../../store/seasonalityAlertsStore";
import { positionForMarket, type SeasonalityMarket } from "../../store/seasonalityWatchlistStore";

export interface SetAlertModalProps {
  open: boolean;
  onClose: () => void;
  expression: string;
  market: SeasonalityMarket;
  defaultAltName?: string;
  darkMode?: boolean;
}

const NOTIFICATION_OPTIONS: AlertNotificationType[] = [
  "app", "email", "sms", "whatsapp", "telegram", "teams",
];
const OCCURRENCE_OPTIONS: AlertOccurrence[] = ["Only Once", "Every Time"];
const AFTER_EXPIRATION_OPTIONS: AlertAfterExpiration[] = ["Roll Over", "Delete"];

export function SetAlertModal(props: SetAlertModalProps) {
  const { open, onClose, expression, market, defaultAltName, darkMode } = props;
  const createAlert = useSeasonalityAlertsStore((s) => s.createAlert);

  const [mounted, setMounted] = useState(false);
  const [name, setName] = useState("");
  const [altName, setAltName] = useState("");
  const [condType, setCondType] = useState<AlertCondition["type"]>(">");
  const [threshold, setThreshold] = useState<string>("");
  const [lowValue, setLowValue] = useState<string>("");
  const [highValue, setHighValue] = useState<string>("");
  const [occurrence, setOccurrence] = useState<AlertOccurrence>("Only Once");
  const [afterExpiration, setAfterExpiration] = useState<AlertAfterExpiration>("Roll Over");
  const [channels, setChannels] = useState<AlertNotificationType[]>(["app"]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    setName("");
    setAltName(defaultAltName ?? "");
    setCondType(">");
    setThreshold("");
    setLowValue("");
    setHighValue("");
    setOccurrence("Only Once");
    setAfterExpiration("Roll Over");
    setChannels(["app"]);
    setError(null);
    setSaving(false);
  }, [open, defaultAltName]);

  if (!open || !mounted) return null;

  const conditionValid =
    condType === "inRange"
      ? lowValue !== "" && highValue !== "" && Number(lowValue) < Number(highValue)
      : threshold !== "" && !Number.isNaN(Number(threshold));

  const canSave =
    name.trim().length > 0 &&
    expression.trim().length > 0 &&
    conditionValid &&
    channels.length > 0;

  const toggleChannel = (c: AlertNotificationType) =>
    setChannels((cs) => (cs.includes(c) ? cs.filter((x) => x !== c) : [...cs, c]));

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    setError(null);
    try {
      const expr = expression.trim();
      const condition: AlertCondition =
        condType === "inRange"
          ? { type: "inRange", value: { lhs: expr, low: Number(lowValue), high: Number(highValue) } }
          : { type: condType, value: { lhs: expr, rhs: Number(threshold) } };

      const autoAltName =
        condType === "inRange"
          ? `${expr} In Range ${lowValue}-${highValue}`
          : `${expr} ${condType === ">" ? "Greater Than" : "Less Than"} ${threshold}`;

      await createAlert({
        name: name.trim(),
        expression: [expr],
        altName: altName.trim() || autoAltName,
        condition,
        occurrence,
        afterExpiration,
        notificationType: channels,
        position: positionForMarket(market),
        market,
        status: "active",
      });
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-md rounded-lg shadow-xl ${
          darkMode ? "bg-zinc-900 text-zinc-100" : "bg-white text-slate-800"
        }`}
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 dark:border-zinc-700">
          <h2 className="text-base font-semibold">Set Alert</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-zinc-800">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-4 flex flex-col gap-3 max-h-[70vh] overflow-y-auto">
          <div>
            <label className="text-xs font-medium text-slate-500 dark:text-zinc-400">Expression</label>
            <div className="mt-1 px-3 py-2 rounded-md font-mono text-sm bg-slate-50 dark:bg-zinc-800 text-slate-700 dark:text-zinc-200 break-all">
              {expression || <span className="opacity-50">(empty)</span>}
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-500 dark:text-zinc-400">Alert name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. WTI Cal Spread breakout"
              className="mt-1 w-full px-3 py-2 rounded-md border border-slate-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-slate-500 dark:text-zinc-400">Display name (optional)</label>
            <input
              type="text"
              value={altName}
              onChange={(e) => setAltName(e.target.value)}
              placeholder="Defaults to alert name"
              className="mt-1 w-full px-3 py-2 rounded-md border border-slate-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-slate-500 dark:text-zinc-400">Condition</label>
            <div className="mt-1 flex gap-2">
              <select
                value={condType}
                onChange={(e) => setCondType(e.target.value as AlertCondition["type"])}
                className="px-3 py-2 rounded-md border border-slate-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value=">">Greater than</option>
                <option value="<">Less than</option>
                <option value="inRange">In range</option>
              </select>
              {condType === "inRange" ? (
                <>
                  <input
                    type="number"
                    value={lowValue}
                    onChange={(e) => setLowValue(e.target.value)}
                    placeholder="Low"
                    className="flex-1 px-3 py-2 rounded-md border border-slate-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="number"
                    value={highValue}
                    onChange={(e) => setHighValue(e.target.value)}
                    placeholder="High"
                    className="flex-1 px-3 py-2 rounded-md border border-slate-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </>
              ) : (
                <input
                  type="number"
                  value={threshold}
                  onChange={(e) => setThreshold(e.target.value)}
                  placeholder="Value"
                  className="flex-1 px-3 py-2 rounded-md border border-slate-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-500 dark:text-zinc-400">Trigger</label>
              <select
                value={occurrence}
                onChange={(e) => setOccurrence(e.target.value as AlertOccurrence)}
                className="mt-1 w-full px-3 py-2 rounded-md border border-slate-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {OCCURRENCE_OPTIONS.map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 dark:text-zinc-400">After contract expires</label>
              <select
                value={afterExpiration}
                onChange={(e) => setAfterExpiration(e.target.value as AlertAfterExpiration)}
                className="mt-1 w-full px-3 py-2 rounded-md border border-slate-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {AFTER_EXPIRATION_OPTIONS.map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-500 dark:text-zinc-400">Notify via</label>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {NOTIFICATION_OPTIONS.map((c) => {
                const selected = channels.includes(c);
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => toggleChannel(c)}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                      selected
                        ? "bg-blue-600 border-blue-600 text-white"
                        : "border-slate-300 dark:border-zinc-600 hover:bg-slate-100 dark:hover:bg-zinc-800"
                    }`}
                  >
                    {c}
                  </button>
                );
              })}
            </div>
          </div>

          {error && <div className="text-sm text-red-600 dark:text-red-400">{error}</div>}
        </div>

        <div className="flex justify-end gap-2 px-5 py-3 border-t border-slate-200 dark:border-zinc-700">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-sm font-medium rounded-md hover:bg-slate-100 dark:hover:bg-zinc-800"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!canSave || saving}
            className="px-3 py-1.5 text-sm font-medium rounded-md bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white"
          >
            {saving ? "Saving…" : "Create Alert"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
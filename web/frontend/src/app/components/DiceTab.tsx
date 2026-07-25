"use client";

import { useEffect, useState } from "react";
import type { AdvantageMode, Preset, PresetSettings, RollEntry } from "../types";
import { SIDES_OPTIONS } from "../constants";
import { parseJsonOrThrow } from "../api";

interface DiceTabProps {
  loading: boolean;
  setLoading: (v: boolean) => void;
  setError: (v: string | null) => void;
  addHistoryEntry: (entry: RollEntry) => void;
}

export default function DiceTab({ loading, setLoading, setError, addHistoryEntry }: DiceTabProps) {
  const [numDice, setNumDice] = useState(3);
  const [sides, setSides] = useState<(typeof SIDES_OPTIONS)[number]>(6);
  const [modifier, setModifier] = useState("");
  const [dropLowest, setDropLowest] = useState(false);
  const [advantage, setAdvantage] = useState<AdvantageMode>("normal");
  const [numRolls, setNumRolls] = useState(1);
  const [digitDice, setDigitDice] = useState(false);
  const [presets, setPresets] = useState<Preset[]>([]);
  const [deleteMode, setDeleteMode] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("traveller-presets");
      if (stored) setPresets(JSON.parse(stored));
    } catch {}
  }, []);

  const digitDiceDisabled = sides > 9 || numDice < 2;

  useEffect(() => {
    if (digitDiceDisabled) setDigitDice(false);
  }, [digitDiceDisabled]);

  function savePresetsToStorage(updated: Preset[]) {
    localStorage.setItem("traveller-presets", JSON.stringify(updated));
    setPresets(updated);
  }

  function serializeSettings(): PresetSettings {
    return { numRolls, numDice, sides, modifier, dropLowest, advantage, digitDice };
  }

  async function rollOnce(settings: PresetSettings): Promise<{ rolls: number[]; total: number; otherRolls?: number[]; otherTotal?: number }> {
    const mod = settings.modifier !== "" ? parseInt(settings.modifier, 10) : 0;
    const res = await fetch("/api/roll", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        num_dice: settings.numDice,
        sides: settings.sides,
        modifier: mod,
        drop_lowest: settings.dropLowest,
        advantage: settings.advantage,
      }),
    });
    const data = await parseJsonOrThrow(res);
    if (!res.ok) throw new Error(data.error ?? "Roll failed");
    return { rolls: data.rolls, total: data.total, otherRolls: data.other_rolls, otherTotal: data.other_total };
  }

  async function handleDigitRoll(nd: number, s: number, label: string, count = 1) {
    setLoading(true);
    setError(null);
    try {
      for (let i = 0; i < count; i++) {
        const res = await fetch("/api/roll-digit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ num_digits: nd, sides: s }),
        });
        const data = await parseJsonOrThrow(res);
        if (!res.ok) throw new Error(data.error ?? "Roll failed");
        addHistoryEntry({
          id: Date.now() + i,
          label,
          notation: label,
          rolls: data.rolls,
          rawSum: 0,
          modifier: 0,
          total: data.total,
          timestamp: new Date().toLocaleTimeString(),
          isDigit: true,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  async function applyPresetRoll(settings: PresetSettings, label?: string, count = 1) {
    if (settings.digitDice) {
      const notation = `${settings.numDice}d${settings.sides} (digit)`;
      await handleDigitRoll(settings.numDice, settings.sides, label ?? notation, count);
      return;
    }
    setLoading(true);
    setError(null);
    const mod = settings.modifier !== "" ? parseInt(settings.modifier, 10) : 0;
    const modStr = mod > 0 ? `+${mod}` : mod < 0 ? `${mod}` : "";
    const advStr =
      settings.advantage !== "normal"
        ? ` (${settings.advantage === "advantage" ? "adv" : "dis"})`
        : "";
    const notation = `${settings.numDice}d${settings.sides}${modStr}${settings.dropLowest ? " (drop lowest)" : ""}${advStr}`;

    try {
      if (count > 1) {
        const results: { rolls: number[]; total: number }[] = [];
        for (let i = 0; i < count; i++) {
          const r = await rollOnce(settings);
          results.push({ rolls: r.rolls, total: r.total });
        }
        addHistoryEntry({
          id: Date.now(),
          label: label ?? notation,
          notation,
          rolls: [],
          rawSum: 0,
          modifier: mod,
          total: 0,
          timestamp: new Date().toLocaleTimeString(),
          statRolls: results,
        });
      } else {
        const r = await rollOnce(settings);
        const rawSum = r.rolls.reduce((a, b) => a + b, 0);
        addHistoryEntry({
          id: Date.now(),
          label: label ?? notation,
          notation,
          rolls: r.rolls,
          rawSum,
          modifier: mod,
          total: r.total,
          timestamp: new Date().toLocaleTimeString(),
          otherRolls: r.otherRolls,
          otherTotal: r.otherTotal,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  async function handleRoll() {
    if (digitDice) {
      const notation = `${numDice}d${sides} (digit)`;
      await handleDigitRoll(numDice, sides, notation, numRolls);
    } else {
      await applyPresetRoll(serializeSettings(), undefined, numRolls);
    }
  }

  async function handleRollOSRStats() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/roll-osr-stats", { method: "POST" });
      const data = await parseJsonOrThrow(res);
      if (!res.ok) throw new Error(data.error ?? "Roll failed");
      addHistoryEntry({
        id: Date.now(),
        label: "OSR Stats",
        notation: "OSR Stats",
        rolls: [],
        rawSum: 0,
        modifier: 0,
        total: 0,
        timestamp: new Date().toLocaleTimeString(),
        statRolls: data.stats,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  function handleAddPreset() {
    const name = window.prompt("Enter a preset name (15 characters max):");
    if (!name) return;
    const trimmed = name.trim().slice(0, 15);
    if (!trimmed) return;
    if (presets.some((p) => p.name === trimmed)) {
      setError("A preset with that name already exists.");
      return;
    }
    savePresetsToStorage([...presets, { name: trimmed, settings: serializeSettings() }]);
  }

  function handleDeletePreset(name: string) {
    savePresetsToStorage(presets.filter((p) => p.name !== name));
    setDeleteMode(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") handleRoll();
  }

  const disabledByDigit = (s: number) => digitDice && s > 9;

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Column 1: Standard group */}
      <div className="w-72 shrink-0 border-r border-gray-800 p-6 overflow-y-auto flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <span className="text-xs text-gray-500 uppercase tracking-widest">Standard</span>
          <div className="border border-gray-800 rounded-lg p-4 flex flex-col gap-4" suppressHydrationWarning>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-gray-400 uppercase tracking-widest">Number of rolls</label>
              <input
                type="number"
                min={1}
                max={99}
                value={numRolls}
                onChange={(e) => setNumRolls(Math.min(99, Math.max(1, parseInt(e.target.value) || 1)))}
                onKeyDown={handleKeyDown}
                className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-gray-100 text-lg w-full focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-gray-400 uppercase tracking-widest">Number of dice</label>
              <input
                type="number"
                min={1}
                max={99}
                value={numDice}
                onChange={(e) => {
                  const n = Math.min(99, Math.max(1, parseInt(e.target.value) || 1));
                  setNumDice(n);
                  if (n === 1) setDropLowest(false);
                }}
                onKeyDown={handleKeyDown}
                className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-gray-100 text-lg w-full focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-gray-400 uppercase tracking-widest">Die type</label>
              <div className="grid grid-cols-4 gap-2">
                {SIDES_OPTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => { if (!disabledByDigit(s)) setSides(s); }}
                    disabled={disabledByDigit(s)}
                    className={`rounded px-2 py-2 ${s >= 1000 ? "text-xs" : "text-sm"} font-bold transition-colors ${
                      sides === s
                        ? "bg-amber-500 text-gray-900"
                        : disabledByDigit(s)
                        ? "bg-gray-800 text-gray-700 border border-gray-800 cursor-not-allowed"
                        : "bg-gray-800 text-gray-300 border border-gray-700 hover:border-amber-600 hover:text-amber-400"
                    }`}
                  >
                    d{s}
                  </button>
                ))}
              </div>
            </div>

            <label className={`flex items-center gap-3 select-none ${digitDiceDisabled ? "cursor-not-allowed opacity-40" : "cursor-pointer"}`}>
              <input
                type="checkbox"
                checked={digitDice}
                onChange={(e) => setDigitDice(e.target.checked)}
                disabled={digitDiceDisabled}
                className="w-4 h-4 accent-amber-500 disabled:cursor-not-allowed cursor-pointer"
              />
              <span className="text-xs text-gray-400 uppercase tracking-widest">Digit dice</span>
            </label>

            <div className={`flex flex-col gap-1.5 ${digitDice ? "opacity-40 pointer-events-none" : ""}`}>
              <label className="text-xs text-gray-400 uppercase tracking-widest">Modifier (optional)</label>
              <input
                type="number"
                value={modifier}
                onChange={(e) => setModifier(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="0"
                disabled={digitDice}
                className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-gray-100 text-lg w-full focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 placeholder-gray-600 disabled:cursor-not-allowed"
              />
            </div>

            <label className={`flex items-center gap-3 select-none ${numDice === 1 || digitDice ? "cursor-not-allowed opacity-40" : "cursor-pointer"}`}>
              <input
                type="checkbox"
                checked={dropLowest}
                onChange={(e) => setDropLowest(e.target.checked)}
                disabled={numDice === 1 || digitDice}
                className="w-4 h-4 accent-amber-500 disabled:cursor-not-allowed cursor-pointer"
              />
              <span className="text-xs text-gray-400 uppercase tracking-widest">Drop lowest die</span>
            </label>

            <div className={`flex flex-col gap-1.5 ${digitDice ? "opacity-40 pointer-events-none" : ""}`}>
              <span className="text-xs text-gray-400 uppercase tracking-widest">Advantage</span>
              <div className="flex rounded overflow-hidden border border-gray-700">
                {(["disadvantage", "normal", "advantage"] as AdvantageMode[]).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setAdvantage(mode)}
                    disabled={digitDice}
                    className={`flex-1 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors ${
                      advantage === mode
                        ? "bg-amber-500 text-gray-900"
                        : "bg-gray-800 text-gray-400 hover:text-gray-200"
                    }`}
                  >
                    {mode === "disadvantage" ? "Dis" : mode === "normal" ? "Normal" : "Adv"}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleRoll}
              disabled={loading}
              className="w-full py-2.5 rounded bg-amber-500 hover:bg-amber-400 disabled:bg-gray-700 disabled:text-gray-500 text-gray-900 font-bold uppercase tracking-widest transition-colors text-sm"
            >
              {loading ? "Rolling..." : "Roll"}
            </button>
          </div>
        </div>
      </div>

      {/* Column 2: Special + Presets */}
      <div className="flex-1 p-6 overflow-y-auto flex flex-col gap-6">

        <div className="flex flex-col gap-2">
          <span className="text-xs text-gray-500 uppercase tracking-widest">Special</span>
          <div className="border border-gray-800 rounded-lg p-4 flex flex-col gap-2">
            <button
              onClick={() => handleDigitRoll(2, 6, "d66")}
              disabled={loading}
              className="w-full py-2.5 rounded bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-600 text-gray-200 font-bold uppercase tracking-widest transition-colors text-sm"
            >
              d66
            </button>
            <button
              onClick={() => handleDigitRoll(3, 6, "d666")}
              disabled={loading}
              className="w-full py-2.5 rounded bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-600 text-gray-200 font-bold uppercase tracking-widest transition-colors text-sm"
            >
              d666
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-xs text-gray-500 uppercase tracking-widest">Presets</span>
          <div className="border border-gray-800 rounded-lg p-4 flex flex-col gap-2">
            <button
              onClick={handleRollOSRStats}
              disabled={loading}
              className="w-full py-2.5 rounded bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-600 text-gray-200 font-bold uppercase tracking-widest transition-colors text-sm"
            >
              OSR Stats
            </button>

            {presets.map((preset) => (
              <button
                key={preset.name}
                onClick={() =>
                  deleteMode
                    ? handleDeletePreset(preset.name)
                    : applyPresetRoll(preset.settings, preset.name, preset.settings.numRolls ?? 1)
                }
                disabled={loading && !deleteMode}
                className={`w-full py-2.5 rounded font-bold uppercase tracking-widest transition-colors text-sm ${
                  deleteMode
                    ? "bg-red-900 hover:bg-red-700 border border-red-700 text-red-200"
                    : "bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-600 text-gray-200"
                }`}
              >
                {preset.name}
              </button>
            ))}

            <hr className="border-gray-700 my-1" />

            <div className="flex gap-2">
              <button
                onClick={handleAddPreset}
                disabled={loading || deleteMode}
                className="flex-1 py-2 rounded bg-gray-800 hover:bg-gray-700 disabled:opacity-40 text-gray-400 hover:text-gray-200 text-xs font-bold uppercase tracking-widest transition-colors"
              >
                Add
              </button>
              <button
                onClick={() => setDeleteMode((d) => !d)}
                disabled={loading || presets.length === 0}
                className={`flex-1 py-2 rounded text-xs font-bold uppercase tracking-widest transition-colors ${
                  deleteMode
                    ? "bg-red-700 hover:bg-red-600 text-white"
                    : "bg-gray-800 hover:bg-gray-700 disabled:opacity-40 text-gray-400 hover:text-gray-200"
                }`}
              >
                {deleteMode ? "Cancel" : "Delete"}
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

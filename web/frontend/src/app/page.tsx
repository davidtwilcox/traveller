"use client";

import { useEffect, useRef, useState } from "react";

const SIDES_OPTIONS = [4, 6, 8, 10, 12, 20, 30, 100] as const;

type AdvantageMode = "disadvantage" | "normal" | "advantage";

interface RollEntry {
  id: number;
  notation: string;
  rolls: number[];
  rawSum: number;
  modifier: number;
  total: number;
  timestamp: string;
  isDigit?: boolean;
  otherRolls?: number[];
  otherTotal?: number;
  statRolls?: { rolls: number[]; total: number }[];
}

async function parseJsonOrThrow(res: Response) {
  const text = await res.text();
  if (!text) throw new Error("No response from API server. Is the Flask server running?");
  try {
    return JSON.parse(text);
  } catch {
    throw new Error("Invalid response from API server.");
  }
}

export default function Home() {
  const [numDice, setNumDice] = useState(2);
  const [sides, setSides] = useState<(typeof SIDES_OPTIONS)[number]>(6);
  const [modifier, setModifier] = useState("");
  const [dropLowest, setDropLowest] = useState(false);
  const [advantage, setAdvantage] = useState<AdvantageMode>("normal");
  const [history, setHistory] = useState<RollEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const historyEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    historyEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history]);

  async function handleRoll() {
    setLoading(true);
    setError(null);
    const mod = modifier !== "" ? parseInt(modifier, 10) : 0;

    try {
      const res = await fetch("/api/roll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ num_dice: numDice, sides, modifier: mod, drop_lowest: dropLowest, advantage }),
      });
      const data = await parseJsonOrThrow(res);
      if (!res.ok) throw new Error(data.error ?? "Roll failed");

      const rawSum = data.rolls.reduce((a: number, b: number) => a + b, 0);
      const modStr = mod > 0 ? `+${mod}` : mod < 0 ? `${mod}` : "";
      const advStr = advantage !== "normal" ? ` (${advantage === "advantage" ? "adv" : "dis"})` : "";

      setHistory((prev) => [
        ...prev,
        {
          id: Date.now(),
          notation: `${numDice}d${sides}${modStr}${dropLowest ? " (drop lowest)" : ""}${advStr}`,
          rolls: data.rolls,
          rawSum,
          modifier: mod,
          total: data.total,
          timestamp: new Date().toLocaleTimeString(),
          otherRolls: data.other_rolls,
          otherTotal: data.other_total,
        },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  async function handleRollOSRStats() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/roll-osr-stats", { method: "POST" });
      const data = await parseJsonOrThrow(res);
      if (!res.ok) throw new Error(data.error ?? "Roll failed");

      setHistory((prev) => [
        ...prev,
        {
          id: Date.now(),
          notation: "OSR Stats",
          rolls: [],
          rawSum: 0,
          modifier: 0,
          total: 0,
          timestamp: new Date().toLocaleTimeString(),
          statRolls: data.stats,
        },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  async function handleRollDigit(notation: string, endpoint: string) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(endpoint, { method: "POST" });
      const data = await parseJsonOrThrow(res);
      if (!res.ok) throw new Error(data.error ?? "Roll failed");

      setHistory((prev) => [
        ...prev,
        {
          id: Date.now(),
          notation,
          rolls: data.rolls,
          rawSum: 0,
          modifier: 0,
          total: data.total,
          timestamp: new Date().toLocaleTimeString(),
          isDigit: true,
        },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") handleRoll();
  }

  return (
    <div className="flex h-screen overflow-hidden font-mono">
      {/* ── Left panel: controls ── */}
      <aside className="w-72 shrink-0 border-r border-gray-800 bg-gray-900 flex flex-col p-6 gap-6 overflow-y-auto">
        <div>
          <h1 className="text-xl font-bold tracking-widest text-amber-400 uppercase">
            Traveller
          </h1>
          <p className="text-xs text-gray-500 mt-1 tracking-wider">Dice Roller</p>
        </div>

        {/* Standard group */}
        <div className="flex flex-col gap-2">
          <span className="text-xs text-gray-500 uppercase tracking-widest">Standard</span>
          <div className="border border-gray-800 rounded-lg p-4 flex flex-col gap-4" suppressHydrationWarning>
            {/* Number of dice */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-gray-400 uppercase tracking-widest">
                Number of dice
              </label>
              <input
                type="number"
                min={1}
                max={99}
                value={numDice}
                onChange={(e) => setNumDice(Math.max(1, parseInt(e.target.value) || 1))}
                onKeyDown={handleKeyDown}
                className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-gray-100 text-lg w-full focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
              />
            </div>

            {/* Sides */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-gray-400 uppercase tracking-widest">
                Die type
              </label>
              <div className="grid grid-cols-4 gap-2">
                {SIDES_OPTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => setSides(s)}
                    className={`rounded px-2 py-2 text-sm font-bold transition-colors ${
                      sides === s
                        ? "bg-amber-500 text-gray-900"
                        : "bg-gray-800 text-gray-300 border border-gray-700 hover:border-amber-600 hover:text-amber-400"
                    }`}
                  >
                    d{s}
                  </button>
                ))}
              </div>
            </div>

            {/* Modifier */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-gray-400 uppercase tracking-widest">
                Modifier (optional)
              </label>
              <input
                type="number"
                value={modifier}
                onChange={(e) => setModifier(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="0"
                className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-gray-100 text-lg w-full focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 placeholder-gray-600"
              />
            </div>

            {/* Drop lowest */}
            <label className={`flex items-center gap-3 select-none ${numDice === 1 ? "cursor-not-allowed opacity-40" : "cursor-pointer"}`}>
              <input
                type="checkbox"
                checked={dropLowest}
                onChange={(e) => setDropLowest(e.target.checked)}
                disabled={numDice === 1}
                className="w-4 h-4 accent-amber-500 disabled:cursor-not-allowed cursor-pointer"
              />
              <span className="text-xs text-gray-400 uppercase tracking-widest">Drop lowest die</span>
            </label>

            {/* Advantage toggle */}
            <div className="flex flex-col gap-1.5">
              <span className="text-xs text-gray-400 uppercase tracking-widest">Advantage</span>
              <div className="flex rounded overflow-hidden border border-gray-700">
                {(["disadvantage", "normal", "advantage"] as AdvantageMode[]).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setAdvantage(mode)}
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

        {/* Special group */}
        <div className="flex flex-col gap-2">
          <span className="text-xs text-gray-500 uppercase tracking-widest">Special</span>
          <div className="border border-gray-800 rounded-lg p-4 flex flex-col gap-2">
            <button
              onClick={() => handleRollDigit("d66", "/api/roll-d66")}
              disabled={loading}
              className="w-full py-2.5 rounded bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-600 text-gray-200 font-bold uppercase tracking-widest transition-colors text-sm"
            >
              d66
            </button>
            <button
              onClick={() => handleRollDigit("d666", "/api/roll-d666")}
              disabled={loading}
              className="w-full py-2.5 rounded bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-600 text-gray-200 font-bold uppercase tracking-widest transition-colors text-sm"
            >
              d666
            </button>
            <button
              onClick={handleRollOSRStats}
              disabled={loading}
              className="w-full py-2.5 rounded bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-600 text-gray-200 font-bold uppercase tracking-widest transition-colors text-sm"
            >
              OSR Stats
            </button>
          </div>
        </div>

        {error && (
          <p className="text-red-400 text-xs text-center">{error}</p>
        )}
      </aside>

      {/* ── Right panel: ticker tape ── */}
      <main className="flex-1 flex flex-col bg-gray-950 overflow-hidden">
        <div className="border-b border-gray-800 px-6 py-3 bg-gray-900">
          <h2 className="text-xs uppercase tracking-widest text-gray-500">Roll History</h2>
        </div>

        <div className="flex-1 overflow-y-auto ticker-scrollbar px-6 py-4 flex flex-col gap-3">
          {history.length === 0 && (
            <div className="flex-1 flex items-center justify-center text-gray-700 text-sm tracking-widest uppercase">
              No rolls yet
            </div>
          )}

          {history.map((entry, idx) => {
            const isLatest = idx === history.length - 1;
            return (
              <div
                key={entry.id}
                className={`rounded border px-4 py-3 transition-all ${
                  isLatest
                    ? "border-amber-600 bg-gray-800"
                    : "border-gray-800 bg-gray-900"
                }`}
              >
                <div className="flex items-center justify-between gap-4">
                  <span
                    className={`text-sm font-bold tracking-wider ${
                      isLatest ? "text-amber-400" : "text-gray-400"
                    }`}
                  >
                    {entry.notation}
                  </span>
                  <span className="text-xs text-gray-600">{entry.timestamp}</span>
                </div>

                {entry.statRolls ? (
                  <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1">
                    {entry.statRolls.map((stat, i) => (
                      <div key={i} className="flex items-baseline justify-between gap-2">
                        <span className="text-gray-500 text-xs">[{stat.rolls.join(", ")}]</span>
                        <span className={`font-bold text-sm ${isLatest ? "text-amber-300" : "text-gray-300"}`}>
                          {stat.total}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <>
                    <div className="mt-1.5 flex items-baseline gap-3 flex-wrap">
                      <span className="text-gray-500 text-xs">
                        [{entry.rolls.join(", ")}]
                      </span>
                      {!entry.isDigit && entry.modifier !== 0 && (
                        <span className="text-gray-500 text-xs">
                          {entry.rawSum}{" "}
                          {entry.modifier > 0 ? `+${entry.modifier}` : entry.modifier}
                        </span>
                      )}
                      <span
                        className={`text-2xl font-bold ml-auto ${
                          isLatest ? "text-amber-300" : "text-gray-300"
                        }`}
                      >
                        {entry.total}
                      </span>
                    </div>
                    {entry.otherRolls && (
                      <div className="mt-1 flex items-baseline gap-2 line-through text-gray-600 text-xs">
                        <span>[{entry.otherRolls.join(", ")}]</span>
                        <span className="ml-auto">{entry.otherTotal}</span>
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })}

          <div ref={historyEndRef} />
        </div>

        {history.length > 0 && (
          <div className="border-t border-gray-800 px-6 py-2 bg-gray-900 flex justify-end">
            <button
              onClick={() => setHistory([])}
              className="text-xs text-gray-600 hover:text-gray-400 uppercase tracking-widest transition-colors"
            >
              Clear history
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

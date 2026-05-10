"use client";

import { useEffect, useRef, useState } from "react";

const SIDES_OPTIONS = [3, 4, 5, 6, 7, 8, 10, 12, 14, 16, 20, 24, 30, 100] as const;

const SUIT_SYMBOLS: Record<string, string> = {
  Hearts: "♥",
  Diamonds: "♦",
  Spades: "♠",
  Clubs: "♣",
  Joker: "★",
};

function suitColor(suit: string, isLatest: boolean): string {
  if (suit === "Hearts" || suit === "Diamonds") return "text-red-400";
  if (suit === "Joker") return "text-purple-400";
  return isLatest ? "text-gray-200" : "text-gray-500";
}

type AdvantageMode = "disadvantage" | "normal" | "advantage";
type ActiveTab = "dice" | "cards";

interface PresetSettings {
  numDice: number;
  sides: number;
  modifier: string;
  dropLowest: boolean;
  advantage: AdvantageMode;
}

interface Preset {
  name: string;
  settings: PresetSettings;
}

interface RollEntry {
  id: number;
  label: string;
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
  isCard?: boolean;
  cards?: { suit: string; rank: string }[];
  cardsRemaining?: number;
  deckWasReset?: boolean;
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
  const [activeTab, setActiveTab] = useState<ActiveTab>("dice");
  const [numDice, setNumDice] = useState(2);
  const [sides, setSides] = useState<(typeof SIDES_OPTIONS)[number]>(6);
  const [modifier, setModifier] = useState("");
  const [dropLowest, setDropLowest] = useState(false);
  const [advantage, setAdvantage] = useState<AdvantageMode>("normal");
  const [numRolls, setNumRolls] = useState(1);
  const [numCards, setNumCards] = useState(1);
  const [history, setHistory] = useState<RollEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [presets, setPresets] = useState<Preset[]>([]);
  const [deleteMode, setDeleteMode] = useState(false);
  const [cardsRemaining, setCardsRemaining] = useState<number | null>(null);
  const [includeJokers, setIncludeJokers] = useState(false);
  const historyEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    historyEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("traveller-presets");
      if (stored) setPresets(JSON.parse(stored));
    } catch {}
  }, []);

  useEffect(() => {
    fetch("/api/deck/status")
      .then((r) => r.json())
      .then((d) => {
        setCardsRemaining(d.remaining);
        setIncludeJokers(d.include_jokers ?? false);
      })
      .catch(() => {});
  }, []);

  // Clamp numCards when remaining decreases
  useEffect(() => {
    if (cardsRemaining !== null && cardsRemaining > 0) {
      setNumCards((prev) => Math.min(prev, cardsRemaining));
    }
  }, [cardsRemaining]);

  function savePresetsToStorage(updated: Preset[]) {
    localStorage.setItem("traveller-presets", JSON.stringify(updated));
    setPresets(updated);
  }

  function serializeSettings(): PresetSettings {
    return { numDice, sides, modifier, dropLowest, advantage };
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

  async function applyPresetRoll(settings: PresetSettings, label?: string, count = 1) {
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
        setHistory((prev) => [
          ...prev,
          {
            id: Date.now(),
            label: label ?? notation,
            notation,
            rolls: [],
            rawSum: 0,
            modifier: mod,
            total: 0,
            timestamp: new Date().toLocaleTimeString(),
            statRolls: results,
          },
        ]);
      } else {
        const r = await rollOnce(settings);
        const rawSum = r.rolls.reduce((a, b) => a + b, 0);
        setHistory((prev) => [
          ...prev,
          {
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
          },
        ]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  async function handleRoll() {
    await applyPresetRoll(serializeSettings(), undefined, numRolls);
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
          label: "OSR Stats",
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
          label: notation,
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

  async function handleDrawCard() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/deck/draw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ count: numCards }),
      });
      const data = await parseJsonOrThrow(res);
      if (!res.ok) throw new Error(data.error ?? "Draw failed");
      setCardsRemaining(data.remaining);
      const drawnCards: { suit: string; rank: string }[] = data.cards;
      const label =
        drawnCards.length === 1
          ? `${drawnCards[0].rank} of ${drawnCards[0].suit}`
          : `${drawnCards.length} Cards`;
      setHistory((prev) => [
        ...prev,
        {
          id: Date.now(),
          label,
          notation: label,
          rolls: [],
          rawSum: 0,
          modifier: 0,
          total: 0,
          timestamp: new Date().toLocaleTimeString(),
          isCard: true,
          cards: drawnCards,
          cardsRemaining: data.remaining,
          deckWasReset: data.deck_was_reset,
        },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  async function handleResetDeck() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/deck/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ include_jokers: includeJokers }),
      });
      const data = await parseJsonOrThrow(res);
      if (!res.ok) throw new Error(data.error ?? "Reset failed");
      setCardsRemaining(data.remaining);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleJokers(checked: boolean) {
    const action = checked ? "add 2 Jokers to" : "remove the 2 Jokers from";
    if (!window.confirm(`This will reset and reshuffle the deck to ${action} it. Continue?`)) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/deck/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ include_jokers: checked }),
      });
      const data = await parseJsonOrThrow(res);
      if (!res.ok) throw new Error(data.error ?? "Reset failed");
      setCardsRemaining(data.remaining);
      setIncludeJokers(data.include_jokers);
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

  const deckSize = includeJokers ? 54 : 52;
  const cardMax = cardsRemaining || deckSize;

  return (
    <div className="flex h-screen overflow-hidden font-mono">

      {/* ── Tabbed panel ── */}
      <div className="w-[480px] shrink-0 border-r border-gray-800 bg-gray-900 flex flex-col overflow-hidden">

        {/* App header + tab bar */}
        <div className="shrink-0 border-b border-gray-800">
          <div className="px-6 pt-5">
            <h1 className="text-xl font-bold tracking-widest text-amber-400 uppercase">Traveller</h1>
            <p className="text-xs text-gray-500 mt-1 tracking-wider">Dice Roller</p>
          </div>
          <div className="flex px-6 mt-4">
            {(["dice", "cards"] as ActiveTab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-3 mr-6 text-xs font-bold uppercase tracking-widest transition-colors border-b-2 -mb-px ${
                  activeTab === tab
                    ? "text-amber-400 border-amber-400"
                    : "text-gray-500 hover:text-gray-300 border-transparent"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <p className="text-red-400 text-xs text-center px-6 py-2 shrink-0">{error}</p>
        )}

        {/* ── Dice tab ── */}
        {activeTab === "dice" && (
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
                      onChange={(e) => setNumRolls(Math.max(1, parseInt(e.target.value) || 1))}
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
                      onChange={(e) => setNumDice(Math.max(1, parseInt(e.target.value) || 1))}
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

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs text-gray-400 uppercase tracking-widest">Modifier (optional)</label>
                    <input
                      type="number"
                      value={modifier}
                      onChange={(e) => setModifier(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="0"
                      className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-gray-100 text-lg w-full focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 placeholder-gray-600"
                    />
                  </div>

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
            </div>

            {/* Column 2: Special + Presets */}
            <div className="flex-1 p-6 overflow-y-auto flex flex-col gap-6">

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
                          : applyPresetRoll(preset.settings, preset.name, numRolls)
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
        )}

        {/* ── Cards tab ── */}
        {activeTab === "cards" && (
          <div className="flex-1 p-6 overflow-y-auto flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500 uppercase tracking-widest">Cards</span>
                {cardsRemaining !== null && (
                  <span className="text-xs text-gray-600 tabular-nums">{cardsRemaining} / {deckSize}</span>
                )}
              </div>
              <div className="border border-gray-800 rounded-lg p-4 flex flex-col gap-4" suppressHydrationWarning>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-gray-400 uppercase tracking-widest">Number of cards</label>
                  <input
                    type="number"
                    min={1}
                    max={cardMax}
                    value={numCards}
                    onChange={(e) =>
                      setNumCards(Math.max(1, Math.min(parseInt(e.target.value) || 1, cardMax)))
                    }
                    className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-gray-100 text-lg w-full focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                  />
                </div>

                <label className="flex items-center gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={includeJokers}
                    onChange={(e) => handleToggleJokers(e.target.checked)}
                    disabled={loading}
                    className="w-4 h-4 accent-amber-500 disabled:cursor-not-allowed cursor-pointer"
                  />
                  <span className="text-xs text-gray-400 uppercase tracking-widest">Include jokers</span>
                </label>

                <button
                  onClick={handleDrawCard}
                  disabled={loading}
                  className="w-full py-2.5 rounded bg-amber-500 hover:bg-amber-400 disabled:bg-gray-700 disabled:text-gray-500 text-gray-900 font-bold uppercase tracking-widest transition-colors text-sm"
                >
                  {loading ? "Drawing..." : "Draw"}
                </button>

                <button
                  onClick={handleResetDeck}
                  disabled={loading}
                  className="w-full py-2 rounded bg-gray-800 hover:bg-gray-700 disabled:opacity-40 text-gray-400 hover:text-gray-200 text-xs font-bold uppercase tracking-widest transition-colors"
                >
                  Reset Deck
                </button>

              </div>
            </div>
          </div>
        )}

      </div>

      {/* ── History panel ── */}
      <main className="flex-1 flex flex-col bg-gray-950 overflow-hidden">
        <div className="border-b border-gray-800 px-6 py-3 bg-gray-900">
          <h2 className="text-xs uppercase tracking-widest text-gray-500">History</h2>
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
                  isLatest ? "border-amber-600 bg-gray-800" : "border-gray-800 bg-gray-900"
                }`}
              >
                <div className="flex items-center justify-between gap-4">
                  <span className={`text-sm font-bold tracking-wider ${isLatest ? "text-amber-400" : "text-gray-400"}`}>
                    {entry.label}
                  </span>
                  <span className="text-xs text-gray-600">{entry.timestamp}</span>
                </div>

                {entry.isCard && entry.cards && entry.cards.length > 0 ? (
                  entry.cards.length === 1 ? (
                    <div className="mt-2 flex items-center gap-4">
                      <span className={`text-3xl leading-none ${suitColor(entry.cards[0].suit, isLatest)}`}>
                        {SUIT_SYMBOLS[entry.cards[0].suit] ?? "?"}
                      </span>
                      <div className="flex flex-col">
                        <span className={`text-2xl font-bold leading-none ${isLatest ? "text-amber-300" : "text-gray-300"}`}>
                          {entry.cards[0].rank}
                        </span>
                        <span className="text-xs text-gray-600 mt-1">
                          {entry.cardsRemaining} remaining{entry.deckWasReset && " · deck reset"}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-2">
                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
                        {entry.cards.map((card, i) => (
                          <div key={i} className="flex items-center gap-1">
                            <span className={`text-sm leading-none ${suitColor(card.suit, isLatest)}`}>
                              {SUIT_SYMBOLS[card.suit] ?? "?"}
                            </span>
                            <span className={`text-sm font-bold ${isLatest ? "text-amber-300" : "text-gray-300"}`}>
                              {card.rank}
                            </span>
                          </div>
                        ))}
                      </div>
                      <span className="text-xs text-gray-600 mt-1.5 block">
                        {entry.cardsRemaining} remaining{entry.deckWasReset && " · deck reset"}
                      </span>
                    </div>
                  )
                ) : entry.statRolls ? (
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
                      <span className="text-gray-500 text-xs">[{entry.rolls.join(", ")}]</span>
                      {!entry.isDigit && entry.modifier !== 0 && (
                        <span className="text-gray-500 text-xs">
                          {entry.rawSum}{" "}
                          {entry.modifier > 0 ? `+${entry.modifier}` : entry.modifier}
                        </span>
                      )}
                      <span className={`text-2xl font-bold ml-auto ${isLatest ? "text-amber-300" : "text-gray-300"}`}>
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

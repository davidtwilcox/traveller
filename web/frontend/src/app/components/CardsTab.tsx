"use client";

import { useEffect, useState } from "react";
import type { RollEntry } from "../types";
import { parseJsonOrThrow } from "../api";

interface CardsTabProps {
  loading: boolean;
  setLoading: (v: boolean) => void;
  setError: (v: string | null) => void;
  addHistoryEntry: (entry: RollEntry) => void;
}

export default function CardsTab({ loading, setLoading, setError, addHistoryEntry }: CardsTabProps) {
  const [numCards, setNumCards] = useState(1);
  const [cardsRemaining, setCardsRemaining] = useState<number | null>(null);
  const [includeJokers, setIncludeJokers] = useState(false);

  useEffect(() => {
    fetch("/api/deck/status")
      .then((r) => r.json())
      .then((d) => {
        setCardsRemaining(d.remaining);
        setIncludeJokers(d.include_jokers ?? false);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (cardsRemaining !== null && cardsRemaining > 0) {
      setNumCards((prev) => Math.min(prev, cardsRemaining));
    }
  }, [cardsRemaining]);

  const deckSize = includeJokers ? 54 : 52;
  const cardMax = cardsRemaining || deckSize;

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
      addHistoryEntry({
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
      });
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

  return (
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
  );
}

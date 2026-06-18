"use client";

import { useEffect, useRef } from "react";
import type { RollEntry } from "../types";
import { SUIT_SYMBOLS, suitColor } from "../constants";

interface HistoryPanelProps {
  history: RollEntry[];
  onClear: () => void;
}

export default function HistoryPanel({ history, onClear }: HistoryPanelProps) {
  const historyEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    historyEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history]);

  return (
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

              {entry.isGenerator && entry.generatorFields ? (
                <div className="mt-2 flex flex-col gap-2.5">
                  {entry.generatorFields.map((field, i) => (
                    <div key={i}>
                      <span className="text-xs text-gray-500 uppercase tracking-widest">{field.label}</span>
                      <div className="flex items-center gap-2 mt-0.5">
                        {(field.cards ?? (field.card ? [field.card] : [])).map((c, ci) => (
                          <span key={ci} className={`text-base leading-none ${suitColor(c.suit, false)}`}>
                            {SUIT_SYMBOLS[c.suit] ?? "?"}
                          </span>
                        ))}
                        <span className={`text-sm font-bold ${isLatest ? "text-amber-300" : "text-gray-300"}`}>
                          {field.value}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : entry.isOracle && entry.oracleResult ? (
                <div className="mt-2">
                  <span className={`text-2xl font-bold ${isLatest ? "text-amber-300" : "text-gray-300"}`}>
                    {entry.oracleResult}
                  </span>
                  <div className="mt-1.5 flex flex-col gap-1">
                    {entry.oracleRolls && (
                      <div className="text-xs text-gray-600 flex gap-2">
                        {entry.oracleType === "yesno" && entry.oracleOdds && (
                          <span className="capitalize">{entry.oracleOdds} ·</span>
                        )}
                        <span>d6: [{entry.oracleRolls.join(", ")}]</span>
                      </div>
                    )}
                    {entry.oracleCards && entry.oracleCards.length > 0 && (
                      <div className="flex flex-wrap gap-x-4 gap-y-0.5">
                        {entry.oracleCards.map((c, i) => (
                          <div key={i} className="flex items-center gap-1.5 text-xs text-gray-600">
                            <span className={suitColor(c.suit, false)}>{SUIT_SYMBOLS[c.suit] ?? "?"}</span>
                            <span>{c.rank}</span>
                            <span>· {c.domain}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : entry.isCard && entry.cards && entry.cards.length > 0 ? (
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
            onClick={onClear}
            className="text-xs text-gray-600 hover:text-gray-400 uppercase tracking-widest transition-colors"
          >
            Clear history
          </button>
        </div>
      )}
    </main>
  );
}

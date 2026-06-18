"use client";

import { useState } from "react";
import type { OracleOdds, RollEntry } from "../types";
import { ACTION_MAP, DETAIL_MAP, HOW_RESULTS, TOPIC_MAP } from "../constants";
import { buildRandomEvent, drawAndInterpret } from "../api";

interface OracleTabProps {
  loading: boolean;
  setLoading: (v: boolean) => void;
  setError: (v: string | null) => void;
  addHistoryEntry: (entry: RollEntry) => void;
}

export default function OracleTab({ loading, setLoading, setError, addHistoryEntry }: OracleTabProps) {
  const [oracleOdds, setOracleOdds] = useState<OracleOdds>("even");

  function handleOracleYesNo() {
    const roll = Math.floor(Math.random() * 6) + 1;
    const qualRoll = Math.floor(Math.random() * 6) + 1;

    let answer: string;
    if (oracleOdds === "likely") answer = roll <= 2 ? "No" : "Yes";
    else if (oracleOdds === "even") answer = roll <= 3 ? "No" : "Yes";
    else answer = roll <= 4 ? "No" : "Yes";

    const qualifier = qualRoll === 1 ? ", but..." : qualRoll === 6 ? ", and..." : "";
    const result = answer + qualifier;

    addHistoryEntry({
      id: Date.now(),
      label: "Yes/No Oracle",
      notation: `Yes/No (${oracleOdds})`,
      rolls: [],
      rawSum: 0,
      modifier: 0,
      total: 0,
      timestamp: new Date().toLocaleTimeString(),
      isOracle: true,
      oracleType: "yesno",
      oracleOdds,
      oracleResult: result,
      oracleRolls: [roll, qualRoll],
    });
  }

  function handleOracleHow() {
    const roll = Math.floor(Math.random() * 6) + 1;
    addHistoryEntry({
      id: Date.now(),
      label: "How Oracle",
      notation: "How Oracle",
      rolls: [],
      rawSum: 0,
      modifier: 0,
      total: 0,
      timestamp: new Date().toLocaleTimeString(),
      isOracle: true,
      oracleType: "how",
      oracleResult: HOW_RESULTS[roll],
      oracleRolls: [roll],
    });
  }

  async function handleFocusDraw(
    oracleType: "action" | "detail" | "topic",
    map: Record<string, string>,
    label: string
  ) {
    setLoading(true);
    setError(null);
    try {
      const { card, result, domain } = await drawAndInterpret(map);
      addHistoryEntry({
        id: Date.now(),
        label,
        notation: label,
        rolls: [],
        rawSum: 0,
        modifier: 0,
        total: 0,
        timestamp: new Date().toLocaleTimeString(),
        isOracle: true,
        oracleType,
        oracleResult: result,
        oracleCards: [{ ...card, result, domain }],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  async function handleFocusRandomEvent() {
    setLoading(true);
    setError(null);
    try {
      const { oracleResult, oracleCards } = await buildRandomEvent();
      addHistoryEntry({
        id: Date.now(),
        label: "Random Event",
        notation: "Random Event",
        rolls: [],
        rawSum: 0,
        modifier: 0,
        total: 0,
        timestamp: new Date().toLocaleTimeString(),
        isOracle: true,
        oracleType: "randomevent" as const,
        oracleResult,
        oracleCards,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  async function handleGMPacing() {
    const roll = Math.floor(Math.random() * 6) + 1;
    setLoading(true);
    setError(null);
    try {
      if (roll === 6) {
        const { oracleResult, oracleCards } = await buildRandomEvent();
        addHistoryEntry({
          id: Date.now(),
          label: "Pacing",
          notation: "GM Pacing",
          rolls: [],
          rawSum: 0,
          modifier: 0,
          total: 0,
          timestamp: new Date().toLocaleTimeString(),
          isOracle: true,
          oracleType: "pacing" as const,
          oracleResult: `Random event: ${oracleResult}`,
          oracleRolls: [roll],
          oracleCards,
        });
      } else {
        const PACING_RESULTS: Record<number, string> = {
          1: "Foreshadow trouble",
          2: "Reveal a new detail",
          3: "An NPC takes action",
          4: "Advance a threat",
          5: "Advance a plot",
        };
        addHistoryEntry({
          id: Date.now(),
          label: "Pacing",
          notation: "GM Pacing",
          rolls: [],
          rawSum: 0,
          modifier: 0,
          total: 0,
          timestamp: new Date().toLocaleTimeString(),
          isOracle: true,
          oracleType: "pacing" as const,
          oracleResult: PACING_RESULTS[roll],
          oracleRolls: [roll],
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  function handleGMFailure() {
    const roll = Math.floor(Math.random() * 6) + 1;
    const FAILURE_RESULTS: Record<number, string> = {
      1: "Cause harm",
      2: "Put someone in a spot",
      3: "Offer a choice",
      4: "Advance a threat",
      5: "Reveal an unwelcome truth",
      6: "Foreshadow trouble",
    };
    addHistoryEntry({
      id: Date.now(),
      label: "Failure",
      notation: "GM Failure",
      rolls: [],
      rawSum: 0,
      modifier: 0,
      total: 0,
      timestamp: new Date().toLocaleTimeString(),
      isOracle: true,
      oracleType: "failure" as const,
      oracleResult: FAILURE_RESULTS[roll],
      oracleRolls: [roll],
    });
  }

  return (
    <div className="flex-1 p-6 overflow-y-auto flex flex-col gap-6">

      <div className="flex flex-col gap-2">
        <span className="text-xs text-gray-500 uppercase tracking-widest">Yes/No</span>
        <div className="border border-gray-800 rounded-lg p-4 flex flex-col gap-4">

          <div className="flex flex-col gap-1.5">
            <span className="text-xs text-gray-400 uppercase tracking-widest">Odds</span>
            <div className="flex rounded overflow-hidden border border-gray-700">
              {(["likely", "even", "unlikely"] as OracleOdds[]).map((odds) => (
                <button
                  key={odds}
                  onClick={() => setOracleOdds(odds)}
                  className={`flex-1 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors ${
                    oracleOdds === odds
                      ? "bg-amber-500 text-gray-900"
                      : "bg-gray-800 text-gray-400 hover:text-gray-200"
                  }`}
                >
                  {odds}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleOracleYesNo}
            className="w-full py-2.5 rounded bg-amber-500 hover:bg-amber-400 text-gray-900 font-bold uppercase tracking-widest transition-colors text-sm"
          >
            Answer
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-xs text-gray-500 uppercase tracking-widest">How</span>
        <div className="border border-gray-800 rounded-lg p-4 flex flex-col gap-4">
          <button
            onClick={handleOracleHow}
            className="w-full py-2.5 rounded bg-amber-500 hover:bg-amber-400 text-gray-900 font-bold uppercase tracking-widest transition-colors text-sm"
          >
            Answer
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-xs text-gray-500 uppercase tracking-widest">Focus</span>
        <div className="border border-gray-800 rounded-lg p-4 flex flex-col gap-2">
          <button
            onClick={() => handleFocusDraw("action", ACTION_MAP, "Action")}
            disabled={loading}
            className="w-full py-2.5 rounded bg-amber-500 hover:bg-amber-400 disabled:bg-gray-700 disabled:text-gray-500 text-gray-900 font-bold uppercase tracking-widest transition-colors text-sm"
          >
            Action
          </button>
          <button
            onClick={() => handleFocusDraw("detail", DETAIL_MAP, "Detail")}
            disabled={loading}
            className="w-full py-2.5 rounded bg-amber-500 hover:bg-amber-400 disabled:bg-gray-700 disabled:text-gray-500 text-gray-900 font-bold uppercase tracking-widest transition-colors text-sm"
          >
            Detail
          </button>
          <button
            onClick={() => handleFocusDraw("topic", TOPIC_MAP, "Topic")}
            disabled={loading}
            className="w-full py-2.5 rounded bg-amber-500 hover:bg-amber-400 disabled:bg-gray-700 disabled:text-gray-500 text-gray-900 font-bold uppercase tracking-widest transition-colors text-sm"
          >
            Topic
          </button>
          <button
            onClick={handleFocusRandomEvent}
            disabled={loading}
            className="w-full py-2.5 rounded bg-amber-500 hover:bg-amber-400 disabled:bg-gray-700 disabled:text-gray-500 text-gray-900 font-bold uppercase tracking-widest transition-colors text-sm"
          >
            Random Event
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-xs text-gray-500 uppercase tracking-widest">GM Moves</span>
        <div className="border border-gray-800 rounded-lg p-4 flex flex-col gap-2">
          <button
            onClick={handleGMPacing}
            disabled={loading}
            className="w-full py-2.5 rounded bg-amber-500 hover:bg-amber-400 disabled:bg-gray-700 disabled:text-gray-500 text-gray-900 font-bold uppercase tracking-widest transition-colors text-sm"
          >
            Pacing
          </button>
          <button
            onClick={handleGMFailure}
            className="w-full py-2.5 rounded bg-amber-500 hover:bg-amber-400 text-gray-900 font-bold uppercase tracking-widest transition-colors text-sm"
          >
            Failure
          </button>
        </div>
      </div>

    </div>
  );
}

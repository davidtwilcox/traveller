"use client";

import { useState } from "react";
import type { ActiveTab, RollEntry } from "./types";
import DiceTab from "./components/DiceTab";
import CardsTab from "./components/CardsTab";
import OracleTab from "./components/OracleTab";
import GeneratorTab from "./components/GeneratorTab";
import HistoryPanel from "./components/HistoryPanel";

export default function Home() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("dice");
  const [history, setHistory] = useState<RollEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function addHistoryEntry(entry: RollEntry) {
    setHistory((prev) => [...prev, entry]);
  }

  const tabProps = { loading, setLoading, setError, addHistoryEntry };

  return (
    <div className="flex h-screen overflow-hidden font-mono">

      {/* Tabbed panel */}
      <div className="w-[480px] shrink-0 border-r border-gray-800 bg-gray-900 flex flex-col overflow-hidden">

        {/* App header + tab bar */}
        <div className="shrink-0 border-b border-gray-800">
          <div className="px-6 pt-5">
            <h1 className="text-xl font-bold tracking-widest text-amber-400 uppercase">Traveller</h1>
            <p className="text-xs text-gray-500 mt-1 tracking-wider">Dice Roller</p>
          </div>
          <div className="flex px-6 mt-4">
            {(["dice", "cards", "oracle", "generator"] as ActiveTab[]).map((tab) => (
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

        {activeTab === "dice" && <DiceTab {...tabProps} />}
        {activeTab === "cards" && <CardsTab {...tabProps} />}
        {activeTab === "oracle" && <OracleTab {...tabProps} />}
        {activeTab === "generator" && <GeneratorTab {...tabProps} />}

      </div>

      {/* History panel */}
      <HistoryPanel history={history} onClear={() => setHistory([])} />
    </div>
  );
}

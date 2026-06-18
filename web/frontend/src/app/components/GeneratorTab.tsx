"use client";

import type { RollEntry } from "../types";
import {
  DETAIL_MAP, DUNGEON_LOCATION, HEX_CONTENTS_SPECIAL, HOW_RESULTS,
  NPC_GOAL_MAP, NPC_IDENTITY_MAP, NOTABLE_FEATURE, PLOT_ADVERSARIES,
  PLOT_OBJECTIVE, ACTION_MAP, TOPIC_MAP,
} from "../constants";
import { buildRandomEvent, drawAndInterpret } from "../api";

interface GeneratorTabProps {
  loading: boolean;
  setLoading: (v: boolean) => void;
  setError: (v: string | null) => void;
  addHistoryEntry: (entry: RollEntry) => void;
}

export default function GeneratorTab({ loading, setLoading, setError, addHistoryEntry }: GeneratorTabProps) {

  function handleGeneratePlotHook() {
    const rewRoll = Math.floor(Math.random() * 6) + 1;
    const reward =
      rewRoll <= 2 ? "Money or valuables"
      : rewRoll === 3 ? "Knowledge and secrets"
      : rewRoll === 4 ? "Support of an ally"
      : rewRoll === 5 ? "Advance a plot arc"
      : "A unique item of power";

    addHistoryEntry({
      id: Date.now(),
      label: "Plot Hook",
      notation: "Plot Hook",
      rolls: [],
      rawSum: 0,
      modifier: 0,
      total: 0,
      timestamp: new Date().toLocaleTimeString(),
      isGenerator: true,
      generatorType: "plothook" as const,
      generatorFields: [
        { label: "Objective", value: PLOT_OBJECTIVE[Math.floor(Math.random() * 6) + 1] },
        { label: "Adversaries", value: PLOT_ADVERSARIES[Math.floor(Math.random() * 6) + 1] },
        { label: "Rewards", value: reward },
      ],
    });
  }

  async function handleGenerateNPC() {
    setLoading(true);
    setError(null);
    try {
      const identityDraw = await drawAndInterpret(NPC_IDENTITY_MAP);
      const goalDraw = await drawAndInterpret(NPC_GOAL_MAP);

      const featureRoll = Math.floor(Math.random() * 6) + 1;
      let featureValue = NOTABLE_FEATURE[featureRoll];
      let featureCard: { suit: string; rank: string } | undefined;
      if (featureRoll >= 2) {
        const detail = await drawAndInterpret(DETAIL_MAP);
        featureValue += ` — ${detail.result}`;
        featureCard = detail.card;
      }

      const convDraw = await drawAndInterpret(TOPIC_MAP);
      const attitudeRoll = Math.floor(Math.random() * 6) + 1;

      addHistoryEntry({
        id: Date.now(),
        label: "NPC",
        notation: "NPC",
        rolls: [],
        rawSum: 0,
        modifier: 0,
        total: 0,
        timestamp: new Date().toLocaleTimeString(),
        isGenerator: true,
        generatorType: "npc" as const,
        generatorFields: [
          {
            label: "Identity",
            value: `${identityDraw.result} — ${identityDraw.domain}`,
            card: identityDraw.card,
          },
          {
            label: "Goal",
            value: `${goalDraw.result} — ${goalDraw.domain}`,
            card: goalDraw.card,
          },
          {
            label: "Notable feature",
            value: featureValue,
            card: featureCard,
          },
          {
            label: "Attitude to PCs",
            value: HOW_RESULTS[attitudeRoll],
          },
          {
            label: "Conversation",
            value: `${convDraw.result} — ${convDraw.domain}`,
            card: convDraw.card,
          },
        ],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  async function handleDungeonTheme() {
    setLoading(true);
    setError(null);
    try {
      const appearance = await drawAndInterpret(DETAIL_MAP);
      const use = await drawAndInterpret(ACTION_MAP);
      addHistoryEntry({
        id: Date.now(),
        label: "Dungeon Theme",
        notation: "Dungeon Theme",
        rolls: [],
        rawSum: 0,
        modifier: 0,
        total: 0,
        timestamp: new Date().toLocaleTimeString(),
        isGenerator: true,
        generatorType: "dungeontheme" as const,
        generatorFields: [
          { label: "Appearance", value: `${appearance.result} — ${appearance.domain}`, card: appearance.card },
          { label: "Use", value: `${use.result} — ${use.domain}`, card: use.card },
        ],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  function handleDungeonArea() {
    const encRoll = Math.floor(Math.random() * 6) + 1;
    const encounter =
      encRoll <= 2 ? "None"
      : encRoll <= 4 ? "Hostile enemies"
      : encRoll === 5 ? "An obstacle blocks the way"
      : "Unique NPC or adversary";

    const objRoll = Math.floor(Math.random() * 6) + 1;
    const object =
      objRoll <= 2 ? "Nothing, or mundane objects"
      : objRoll === 3 ? "An interesting item or clue"
      : objRoll === 4 ? "A useful tool, key, or device"
      : objRoll === 5 ? "Something valuable"
      : "Rare or special item";

    const exitRoll = Math.floor(Math.random() * 6) + 1;
    const exits = exitRoll <= 2 ? "Dead end" : exitRoll <= 4 ? "1 additional exit" : "2 additional exits";

    addHistoryEntry({
      id: Date.now(),
      label: "Dungeon Area",
      notation: "Dungeon Area",
      rolls: [],
      rawSum: 0,
      modifier: 0,
      total: 0,
      timestamp: new Date().toLocaleTimeString(),
      isGenerator: true,
      generatorType: "dungeonarea" as const,
      generatorFields: [
        { label: "Location", value: DUNGEON_LOCATION[Math.floor(Math.random() * 6) + 1] },
        { label: "Encounter", value: encounter },
        { label: "Object", value: object },
        { label: "Total exits", value: exits },
      ],
    });
  }

  function handleHexCurrent() {
    const terrainRoll = Math.floor(Math.random() * 6) + 1;
    const terrain =
      terrainRoll <= 2 ? "Same as current hex"
      : terrainRoll <= 4 ? "Common terrain"
      : terrainRoll === 5 ? "Uncommon terrain"
      : "Rare terrain";

    const contentsRoll = Math.floor(Math.random() * 6) + 1;
    const contents =
      contentsRoll <= 5 ? "Nothing remarkable" : HEX_CONTENTS_SPECIAL[Math.floor(Math.random() * 6) + 1];

    addHistoryEntry({
      id: Date.now(),
      label: "Current Hex",
      notation: "Current Hex",
      rolls: [],
      rawSum: 0,
      modifier: 0,
      total: 0,
      timestamp: new Date().toLocaleTimeString(),
      isGenerator: true,
      generatorType: "hexcurrent" as const,
      generatorFields: [
        { label: "Terrain", value: terrain },
        { label: "Contents", value: contents },
      ],
    });
  }

  async function handleHexEvent() {
    const roll = Math.floor(Math.random() * 6) + 1;
    if (roll <= 4) {
      addHistoryEntry({
        id: Date.now(),
        label: "Hex Event",
        notation: "Hex Event",
        rolls: [],
        rawSum: 0,
        modifier: 0,
        total: 0,
        timestamp: new Date().toLocaleTimeString(),
        isGenerator: true,
        generatorType: "hexevent" as const,
        generatorFields: [{ label: "Random event", value: "None" }],
      });
    } else {
      setLoading(true);
      setError(null);
      try {
        const { oracleResult, oracleCards } = await buildRandomEvent();
        addHistoryEntry({
          id: Date.now(),
          label: "Hex Event",
          notation: "Hex Event",
          rolls: [],
          rawSum: 0,
          modifier: 0,
          total: 0,
          timestamp: new Date().toLocaleTimeString(),
          isGenerator: true,
          generatorType: "hexevent" as const,
          generatorFields: [
            {
              label: "Random event",
              value: oracleResult,
              cards: oracleCards.map((c) => ({ suit: c.suit, rank: c.rank })),
            },
          ],
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }
  }

  return (
    <div className="flex-1 p-6 overflow-y-auto flex flex-col gap-6">

      <div className="flex flex-col gap-2">
        <span className="text-xs text-gray-500 uppercase tracking-widest">Plot hook</span>
        <div className="border border-gray-800 rounded-lg p-4">
          <button
            onClick={handleGeneratePlotHook}
            className="w-full py-2.5 rounded bg-amber-500 hover:bg-amber-400 text-gray-900 font-bold uppercase tracking-widest transition-colors text-sm"
          >
            Generate
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-xs text-gray-500 uppercase tracking-widest">NPC</span>
        <div className="border border-gray-800 rounded-lg p-4">
          <button
            onClick={handleGenerateNPC}
            disabled={loading}
            className="w-full py-2.5 rounded bg-amber-500 hover:bg-amber-400 disabled:bg-gray-700 disabled:text-gray-500 text-gray-900 font-bold uppercase tracking-widest transition-colors text-sm"
          >
            {loading ? "Generating..." : "Generate"}
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-xs text-gray-500 uppercase tracking-widest">Dungeon crawler</span>
        <div className="border border-gray-800 rounded-lg p-4 flex flex-col gap-2">
          <button
            onClick={handleDungeonTheme}
            disabled={loading}
            className="w-full py-2.5 rounded bg-amber-500 hover:bg-amber-400 disabled:bg-gray-700 disabled:text-gray-500 text-gray-900 font-bold uppercase tracking-widest transition-colors text-sm"
          >
            {loading ? "Generating..." : "Theme"}
          </button>
          <button
            onClick={handleDungeonArea}
            className="w-full py-2.5 rounded bg-amber-500 hover:bg-amber-400 text-gray-900 font-bold uppercase tracking-widest transition-colors text-sm"
          >
            Area
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-xs text-gray-500 uppercase tracking-widest">Hex crawler</span>
        <div className="border border-gray-800 rounded-lg p-4 flex flex-col gap-2">
          <button
            onClick={handleHexCurrent}
            className="w-full py-2.5 rounded bg-amber-500 hover:bg-amber-400 text-gray-900 font-bold uppercase tracking-widest transition-colors text-sm"
          >
            Current hex
          </button>
          <button
            onClick={handleHexEvent}
            disabled={loading}
            className="w-full py-2.5 rounded bg-amber-500 hover:bg-amber-400 disabled:bg-gray-700 disabled:text-gray-500 text-gray-900 font-bold uppercase tracking-widest transition-colors text-sm"
          >
            {loading ? "Generating..." : "Random event"}
          </button>
        </div>
      </div>

    </div>
  );
}

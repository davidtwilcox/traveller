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

const ACTION_MAP: Record<string, string> = {
  "2": "Seek", "3": "Oppose", "4": "Communicate", "5": "Move",
  "6": "Harm", "7": "Create", "8": "Reveal", "9": "Command",
  "10": "Take", Jack: "Protect", Queen: "Assist", King: "Transform", Ace: "Deceive",
};

const DETAIL_MAP: Record<string, string> = {
  "2": "Small", "3": "Large", "4": "Old", "5": "New",
  "6": "Mundane", "7": "Simple", "8": "Complex", "9": "Unsavory",
  "10": "Specialized", Jack: "Unexpected", Queen: "Exotic", King: "Dignified", Ace: "Unique",
};

const TOPIC_MAP: Record<string, string> = {
  "2": "Current need", "3": "Allies", "4": "Community", "5": "History",
  "6": "Future plans", "7": "Enemies", "8": "Knowledge", "9": "Rumors",
  "10": "A plot arc", Jack: "Recent events", Queen: "Equipment", King: "A faction", Ace: "The PCs",
};

const DOMAIN_MAP: Record<string, string> = {
  Clubs: "Physical (appearance, existence)",
  Diamonds: "Technical (mental, operation)",
  Spades: "Mystical (meaning, capability)",
  Hearts: "Social (personal, connection)",
};

const HOW_RESULTS: Record<number, string> = {
  1: "Surprisingly lacking", 2: "Less than expected", 3: "About average",
  4: "About average", 5: "More than expected", 6: "Extraordinary",
};

const NPC_IDENTITY_MAP: Record<string, string> = {
  "2": "Outlaw", "3": "Drifter", "4": "Tradesman", "5": "Commoner",
  "6": "Soldier", "7": "Merchant", "8": "Specialist", "9": "Entertainer",
  "10": "Adherent", Jack: "Leader", Queen: "Mystic", King: "Adventurer", Ace: "Noble",
};

const NPC_GOAL_MAP: Record<string, string> = {
  "2": "Obtain", "3": "Learn", "4": "Harm", "5": "Restore",
  "6": "Find", "7": "Travel", "8": "Protect", "9": "Enrich self",
  "10": "Avenge", Jack: "Fulfill duty", Queen: "Escape", King: "Create", Ace: "Serve",
};

const PLOT_OBJECTIVE: Record<number, string> = {
  1: "Eliminate a threat", 2: "Learn the truth", 3: "Recover something valuable",
  4: "Escort or deliver to safety", 5: "Restore something broken", 6: "Save an ally in peril",
};

const PLOT_ADVERSARIES: Record<number, string> = {
  1: "A powerful organization", 2: "Outlaws", 3: "Guardians",
  4: "Local inhabitants", 5: "Enemy horde or force", 6: "A new or recurring villain",
};

const NOTABLE_FEATURE: Record<number, string> = {
  1: "Unremarkable", 2: "Notable nature", 3: "Obvious physical trait",
  4: "Quirk or mannerism", 5: "Unusual equipment", 6: "Unexpected age or origin",
};

const DUNGEON_LOCATION: Record<number, string> = {
  1: "Typical area", 2: "Transition area", 3: "Living area or meeting place",
  4: "Working or utility area", 5: "Area with a special feature",
  6: "Location for a specialized purpose",
};

const HEX_CONTENTS_SPECIAL: Record<number, string> = {
  1: "Notable structure", 2: "Dangerous hazard", 3: "A settlement",
  4: "Strange natural feature", 5: "New region (set new terrain types)",
  6: "Dungeon crawler entrance",
};

function suitColor(suit: string, isLatest: boolean): string {
  if (suit === "Hearts" || suit === "Diamonds") return "text-red-400";
  if (suit === "Joker") return "text-purple-400";
  return isLatest ? "text-gray-200" : "text-gray-500";
}

type AdvantageMode = "disadvantage" | "normal" | "advantage";
type OracleOdds = "likely" | "even" | "unlikely";
type ActiveTab = "dice" | "cards" | "oracle" | "generator";

interface PresetSettings {
  numRolls: number;
  numDice: number;
  sides: number;
  modifier: string;
  dropLowest: boolean;
  advantage: AdvantageMode;
  digitDice?: boolean;
}

interface Preset {
  name: string;
  settings: PresetSettings;
}

interface GeneratorField {
  label: string;
  value: string;
  card?: { suit: string; rank: string };
  cards?: { suit: string; rank: string }[];
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
  isOracle?: boolean;
  oracleType?: "yesno" | "how" | "action" | "detail" | "topic" | "randomevent" | "pacing" | "failure";
  oracleOdds?: OracleOdds;
  oracleResult?: string;
  oracleRolls?: number[];
  oracleCards?: { suit: string; rank: string; result: string; domain: string }[];
  isGenerator?: boolean;
  generatorType?: "plothook" | "npc" | "dungeontheme" | "dungeonarea" | "hexcurrent" | "hexevent";
  generatorFields?: GeneratorField[];
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
  const [numDice, setNumDice] = useState(3);
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
  const [digitDice, setDigitDice] = useState(false);
  const [cardsRemaining, setCardsRemaining] = useState<number | null>(null);
  const [includeJokers, setIncludeJokers] = useState(false);
  const [oracleOdds, setOracleOdds] = useState<OracleOdds>("even");
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

  async function handleDigitRoll(numDice: number, sides: number, label: string, count = 1) {
    setLoading(true);
    setError(null);
    try {
      for (let i = 0; i < count; i++) {
        const res = await fetch("/api/roll", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ num_dice: numDice, sides, modifier: 0, drop_lowest: false, advantage: "normal" }),
        });
        const data = await parseJsonOrThrow(res);
        if (!res.ok) throw new Error(data.error ?? "Roll failed");
        const total = parseInt((data.rolls as number[]).join(""), 10);
        setHistory((prev) => [
          ...prev,
          {
            id: Date.now() + i,
            label,
            notation: label,
            rolls: data.rolls,
            rawSum: 0,
            modifier: 0,
            total,
            timestamp: new Date().toLocaleTimeString(),
            isDigit: true,
          },
        ]);
      }
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

  function handleOracleYesNo() {
    const roll = Math.ceil(Math.random() * 6);
    const qualRoll = Math.ceil(Math.random() * 6);

    let answer: string;
    if (oracleOdds === "likely") answer = roll <= 2 ? "No" : "Yes";
    else if (oracleOdds === "even") answer = roll <= 3 ? "No" : "Yes";
    else answer = roll <= 4 ? "No" : "Yes";

    const qualifier = qualRoll === 1 ? ", but..." : qualRoll === 6 ? ", and..." : "";
    const result = answer + qualifier;

    setHistory((prev) => [
      ...prev,
      {
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
      },
    ]);
  }

  function handleOracleHow() {
    const roll = Math.ceil(Math.random() * 6);
    setHistory((prev) => [
      ...prev,
      {
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
      },
    ]);
  }

  async function drawAndInterpret(map: Record<string, string>) {
    const res = await fetch("/api/oracle-deck/draw", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ count: 1 }),
    });
    const data = await parseJsonOrThrow(res);
    if (!res.ok) throw new Error(data.error ?? "Draw failed");
    const card: { suit: string; rank: string } = data.cards[0];
    return {
      card,
      result: map[card.rank] ?? card.rank,
      domain: DOMAIN_MAP[card.suit] ?? "",
    };
  }

  async function buildRandomEvent() {
    const action = await drawAndInterpret(ACTION_MAP);
    const topic = await drawAndInterpret(TOPIC_MAP);
    return {
      oracleResult: `${action.result} — ${topic.result}`,
      oracleCards: [
        { ...action.card, result: action.result, domain: action.domain },
        { ...topic.card, result: topic.result, domain: topic.domain },
      ],
    };
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
          isOracle: true,
          oracleType,
          oracleResult: result,
          oracleCards: [{ ...card, result, domain }],
        },
      ]);
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
      setHistory((prev) => [
        ...prev,
        {
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
        },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  async function handleGMPacing() {
    const roll = Math.ceil(Math.random() * 6);
    setLoading(true);
    setError(null);
    try {
      if (roll === 6) {
        const { oracleResult, oracleCards } = await buildRandomEvent();
        setHistory((prev) => [
          ...prev,
          {
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
          },
        ]);
      } else {
        const PACING_RESULTS: Record<number, string> = {
          1: "Foreshadow trouble",
          2: "Reveal a new detail",
          3: "An NPC takes action",
          4: "Advance a threat",
          5: "Advance a plot",
        };
        setHistory((prev) => [
          ...prev,
          {
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
          },
        ]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  function handleGMFailure() {
    const roll = Math.ceil(Math.random() * 6);
    const FAILURE_RESULTS: Record<number, string> = {
      1: "Cause harm",
      2: "Put someone in a spot",
      3: "Offer a choice",
      4: "Advance a threat",
      5: "Reveal an unwelcome truth",
      6: "Foreshadow trouble",
    };
    setHistory((prev) => [
      ...prev,
      {
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
      },
    ]);
  }

  function handleGeneratePlotHook() {
    const rewRoll = Math.ceil(Math.random() * 6);
    const reward =
      rewRoll <= 2 ? "Money or valuables"
      : rewRoll === 3 ? "Knowledge and secrets"
      : rewRoll === 4 ? "Support of an ally"
      : rewRoll === 5 ? "Advance a plot arc"
      : "A unique item of power";

    setHistory((prev) => [
      ...prev,
      {
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
          { label: "Objective", value: PLOT_OBJECTIVE[Math.ceil(Math.random() * 6)] },
          { label: "Adversaries", value: PLOT_ADVERSARIES[Math.ceil(Math.random() * 6)] },
          { label: "Rewards", value: reward },
        ],
      },
    ]);
  }

  async function handleGenerateNPC() {
    setLoading(true);
    setError(null);
    try {
      const identityDraw = await drawAndInterpret(NPC_IDENTITY_MAP);
      const goalDraw = await drawAndInterpret(NPC_GOAL_MAP);

      const featureRoll = Math.ceil(Math.random() * 6);
      let featureValue = NOTABLE_FEATURE[featureRoll];
      let featureCard: { suit: string; rank: string } | undefined;
      if (featureRoll >= 2) {
        const detail = await drawAndInterpret(DETAIL_MAP);
        featureValue += ` — ${detail.result}`;
        featureCard = detail.card;
      }

      const convDraw = await drawAndInterpret(TOPIC_MAP);
      const attitudeRoll = Math.ceil(Math.random() * 6);

      setHistory((prev) => [
        ...prev,
        {
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
        },
      ]);
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
      setHistory((prev) => [
        ...prev,
        {
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
        },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  function handleDungeonArea() {
    const encRoll = Math.ceil(Math.random() * 6);
    const encounter =
      encRoll <= 2 ? "None"
      : encRoll <= 4 ? "Hostile enemies"
      : encRoll === 5 ? "An obstacle blocks the way"
      : "Unique NPC or adversary";

    const objRoll = Math.ceil(Math.random() * 6);
    const object =
      objRoll <= 2 ? "Nothing, or mundane objects"
      : objRoll === 3 ? "An interesting item or clue"
      : objRoll === 4 ? "A useful tool, key, or device"
      : objRoll === 5 ? "Something valuable"
      : "Rare or special item";

    const exitRoll = Math.ceil(Math.random() * 6);
    const exits = exitRoll <= 2 ? "Dead end" : exitRoll <= 4 ? "1 additional exit" : "2 additional exits";

    setHistory((prev) => [
      ...prev,
      {
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
          { label: "Location", value: DUNGEON_LOCATION[Math.ceil(Math.random() * 6)] },
          { label: "Encounter", value: encounter },
          { label: "Object", value: object },
          { label: "Total exits", value: exits },
        ],
      },
    ]);
  }

  function handleHexCurrent() {
    const terrainRoll = Math.ceil(Math.random() * 6);
    const terrain =
      terrainRoll <= 2 ? "Same as current hex"
      : terrainRoll <= 4 ? "Common terrain"
      : terrainRoll === 5 ? "Uncommon terrain"
      : "Rare terrain";

    const contentsRoll = Math.ceil(Math.random() * 6);
    const contents =
      contentsRoll <= 5 ? "Nothing remarkable" : HEX_CONTENTS_SPECIAL[Math.ceil(Math.random() * 6)];

    setHistory((prev) => [
      ...prev,
      {
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
      },
    ]);
  }

  async function handleHexEvent() {
    const roll = Math.ceil(Math.random() * 6);
    if (roll <= 4) {
      setHistory((prev) => [
        ...prev,
        {
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
        },
      ]);
    } else {
      setLoading(true);
      setError(null);
      try {
        const { oracleResult, oracleCards } = await buildRandomEvent();
        setHistory((prev) => [
          ...prev,
          {
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
          },
        ]);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
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
                      onChange={(e) => {
                        const n = Math.max(1, parseInt(e.target.value) || 1);
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
                      {SIDES_OPTIONS.map((s) => {
                        const disabledByDigit = digitDice && s > 9;
                        return (
                          <button
                            key={s}
                            onClick={() => { if (!disabledByDigit) setSides(s); }}
                            disabled={disabledByDigit}
                            className={`rounded px-2 py-2 text-sm font-bold transition-colors ${
                              sides === s
                                ? "bg-amber-500 text-gray-900"
                                : disabledByDigit
                                ? "bg-gray-800 text-gray-700 border border-gray-800 cursor-not-allowed"
                                : "bg-gray-800 text-gray-300 border border-gray-700 hover:border-amber-600 hover:text-amber-400"
                            }`}
                          >
                            d{s}
                          </button>
                        );
                      })}
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

        {/* ── Oracle tab ── */}
        {activeTab === "oracle" && (
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
        )}

        {/* ── Generator tab ── */}
        {activeTab === "generator" && (
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

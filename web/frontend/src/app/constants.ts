export const SIDES_OPTIONS = [3, 4, 5, 6, 7, 8, 10, 12, 14, 16, 20, 24, 30, 60, 100, 1000] as const;

export const SUIT_SYMBOLS: Record<string, string> = {
  Hearts: "♥",
  Diamonds: "♦",
  Spades: "♠",
  Clubs: "♣",
  Joker: "★",
};

export const ACTION_MAP: Record<string, string> = {
  "2": "Seek", "3": "Oppose", "4": "Communicate", "5": "Move",
  "6": "Harm", "7": "Create", "8": "Reveal", "9": "Command",
  "10": "Take", Jack: "Protect", Queen: "Assist", King: "Transform", Ace: "Deceive",
};

export const DETAIL_MAP: Record<string, string> = {
  "2": "Small", "3": "Large", "4": "Old", "5": "New",
  "6": "Mundane", "7": "Simple", "8": "Complex", "9": "Unsavory",
  "10": "Specialized", Jack: "Unexpected", Queen: "Exotic", King: "Dignified", Ace: "Unique",
};

export const TOPIC_MAP: Record<string, string> = {
  "2": "Current need", "3": "Allies", "4": "Community", "5": "History",
  "6": "Future plans", "7": "Enemies", "8": "Knowledge", "9": "Rumors",
  "10": "A plot arc", Jack: "Recent events", Queen: "Equipment", King: "A faction", Ace: "The PCs",
};

export const DOMAIN_MAP: Record<string, string> = {
  Clubs: "Physical (appearance, existence)",
  Diamonds: "Technical (mental, operation)",
  Spades: "Mystical (meaning, capability)",
  Hearts: "Social (personal, connection)",
};

export const HOW_RESULTS: Record<number, string> = {
  1: "Surprisingly lacking", 2: "Less than expected", 3: "About average",
  4: "About average", 5: "More than expected", 6: "Extraordinary",
};

export const NPC_IDENTITY_MAP: Record<string, string> = {
  "2": "Outlaw", "3": "Drifter", "4": "Tradesman", "5": "Commoner",
  "6": "Soldier", "7": "Merchant", "8": "Specialist", "9": "Entertainer",
  "10": "Adherent", Jack: "Leader", Queen: "Mystic", King: "Adventurer", Ace: "Noble",
};

export const NPC_GOAL_MAP: Record<string, string> = {
  "2": "Obtain", "3": "Learn", "4": "Harm", "5": "Restore",
  "6": "Find", "7": "Travel", "8": "Protect", "9": "Enrich self",
  "10": "Avenge", Jack: "Fulfill duty", Queen: "Escape", King: "Create", Ace: "Serve",
};

export const PLOT_OBJECTIVE: Record<number, string> = {
  1: "Eliminate a threat", 2: "Learn the truth", 3: "Recover something valuable",
  4: "Escort or deliver to safety", 5: "Restore something broken", 6: "Save an ally in peril",
};

export const PLOT_ADVERSARIES: Record<number, string> = {
  1: "A powerful organization", 2: "Outlaws", 3: "Guardians",
  4: "Local inhabitants", 5: "Enemy horde or force", 6: "A new or recurring villain",
};

export const NOTABLE_FEATURE: Record<number, string> = {
  1: "Unremarkable", 2: "Notable nature", 3: "Obvious physical trait",
  4: "Quirk or mannerism", 5: "Unusual equipment", 6: "Unexpected age or origin",
};

export const DUNGEON_LOCATION: Record<number, string> = {
  1: "Typical area", 2: "Transition area", 3: "Living area or meeting place",
  4: "Working or utility area", 5: "Area with a special feature",
  6: "Location for a specialized purpose",
};

export const HEX_CONTENTS_SPECIAL: Record<number, string> = {
  1: "Notable structure", 2: "Dangerous hazard", 3: "A settlement",
  4: "Strange natural feature", 5: "New region (set new terrain types)",
  6: "Dungeon crawler entrance",
};

export function suitColor(suit: string, isLatest: boolean): string {
  if (suit === "Hearts" || suit === "Diamonds") return "text-red-400";
  if (suit === "Joker") return "text-purple-400";
  return isLatest ? "text-gray-200" : "text-gray-500";
}

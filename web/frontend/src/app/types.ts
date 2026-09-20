export type AdvantageMode = "disadvantage" | "normal" | "advantage";
export type OracleOdds = "likely" | "even" | "unlikely";
export type ActiveTab = "dice" | "cards" | "oracle" | "generator" | "user data";
export type DeckType = "standard" | "tarot";

export interface UserDataRoll {
  roll: number;
  result: string[];
}

export interface UserDataTable {
  table: string;
  die: string;
  die_rolls: number;
  rolls: UserDataRoll[];
}

export interface UserDataGroup {
  heading: string;
  tables: UserDataTable[];
}

export interface PresetSettings {
  numRolls: number;
  numDice: number;
  sides: number;
  modifier: string;
  dropLowest: boolean;
  advantage: AdvantageMode;
  digitDice?: boolean;
}

export interface Preset {
  name: string;
  settings: PresetSettings;
}

export interface GeneratorField {
  label: string;
  value: string;
  card?: { suit: string; rank: string };
  cards?: { suit: string; rank: string }[];
}

export interface RollEntry {
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
  deckType?: DeckType;
  isOracle?: boolean;
  oracleType?: "yesno" | "how" | "action" | "detail" | "topic" | "randomevent" | "pacing" | "failure";
  oracleOdds?: OracleOdds;
  oracleResult?: string;
  oracleRolls?: number[];
  oracleCards?: { suit: string; rank: string; result: string; domain: string }[];
  isGenerator?: boolean;
  generatorType?: "plothook" | "npc" | "dungeontheme" | "dungeonarea" | "hexcurrent" | "hexevent";
  generatorFields?: GeneratorField[];
  isUserData?: boolean;
  userDataHeading?: string;
  userDataResult?: string;
}

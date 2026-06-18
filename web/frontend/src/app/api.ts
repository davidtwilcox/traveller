import { ACTION_MAP, DOMAIN_MAP, TOPIC_MAP } from "./constants";

export async function parseJsonOrThrow(res: Response) {
  const text = await res.text();
  if (!text) throw new Error("No response from API server. Is the Flask server running?");
  try {
    return JSON.parse(text);
  } catch {
    throw new Error("Invalid response from API server.");
  }
}

export async function drawAndInterpret(map: Record<string, string>) {
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

export async function buildRandomEvent() {
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

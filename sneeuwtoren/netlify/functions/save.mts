import type { Config } from "@netlify/functions";
import { getStore } from "@netlify/blobs";

// Bewaart de voortgang van Felix en Tommy, zodat die op elk apparaat gelijk is.
// Wie de spelcode niet meestuurt komt er niet in; de code staat als omgevingsvariabele
// SPELCODE bij de site ingesteld en hoort niet in de code of de repository.

const PLAYER_IDS = ["felix", "tommy"] as const;

interface Player {
  money: number;
  ski: number;
  hill: number;
  bestJump: number;
  bestSpeed: number;
  runs: number;
  earned: number;
  seen: string[];
  /** Telt elke wijziging; de stand met het hoogste getal is de nieuwste. */
  rev: number;
}

const noStore = { "cache-control": "no-store" };

function num(value: unknown, min: number, max: number): number {
  const n = Number(value);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : min;
}
const int = (value: unknown, min: number, max: number) => Math.round(num(value, min, max));

/** Laat alleen waarden door die in het spel kunnen voorkomen. */
function clean(p: Record<string, unknown>): Player {
  return {
    money: int(p.money, 0, 1e9),
    ski: int(p.ski, 1, 20),
    hill: int(p.hill, 1, 200),
    bestJump: num(p.bestJump, 0, 60000),
    bestSpeed: int(p.bestSpeed, 0, 1000),
    runs: int(p.runs, 0, 1e7),
    earned: int(p.earned, 0, 1e11),
    seen: Array.isArray(p.seen)
      ? p.seen.filter((s): s is string => typeof s === "string" && /^j\d{1,6}$/.test(s)).slice(0, 20)
      : [],
    rev: int(p.rev, 0, 1e9),
  };
}

function sameCode(given: string, expected: string): boolean {
  if (given.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= given.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}

export default async (req: Request) => {
  const expected = Netlify.env.get("SPELCODE");
  const given = req.headers.get("x-spelcode") ?? "";
  if (!expected || !sameCode(given, expected)) {
    return Response.json({ error: "spelcode" }, { status: 403, headers: noStore });
  }

  const store = getStore({ name: "sneeuwtoren", consistency: "strong" });

  if (req.method === "PUT") {
    const text = await req.text();
    if (text.length > 8000) return Response.json({ error: "te groot" }, { status: 413, headers: noStore });
    let body: { players?: Record<string, unknown> };
    try {
      body = JSON.parse(text);
    } catch {
      return Response.json({ error: "geen geldige gegevens" }, { status: 400, headers: noStore });
    }
    for (const id of PLAYER_IDS) {
      const incoming = body?.players?.[id];
      if (!incoming || typeof incoming !== "object") continue;
      const next = clean(incoming as Record<string, unknown>);
      const current = await store.getWithMetadata(id, { type: "json" });
      if (current === null) {
        await store.setJSON(id, next, { onlyIfNew: true });
      } else if (next.rev > ((current.data as Player | null)?.rev ?? 0)) {
        // Alleen opslaan als niemand anders er intussen overheen schreef; anders krijgt
        // dit apparaat hieronder de nieuwere stand terug.
        await store.setJSON(id, next, { onlyIfMatch: current.etag });
      }
    }
  }

  const players: Record<string, Player | null> = {};
  for (const id of PLAYER_IDS) players[id] = (await store.get(id, { type: "json" })) as Player | null;
  return Response.json({ players }, { headers: noStore });
};

export const config: Config = {
  path: "/api/save",
  method: ["GET", "PUT"],
};

import { NextResponse } from "next/server";
import type { Fixture, FixturePayload } from "@/lib/types";
import { FALLBACK_FIXTURES, formatRange } from "@/lib/fallback";

export const revalidate = 21600; // 6h

const MONTHS = ["january","february","march","april","may","june","july","august",
  "september","october","november","december"];

const strip = (html: string) =>
  html.replace(/<[^>]+>/g, "")
      .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&")
      .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)))
      .replace(/&[a-z]+;/g, " ")
      .trim();

/** "29 September – 4 October" | "3–8 March" -> [startISO, endISO] */
function parseRange(raw: string, year: number): [string, string] | null {
  const parts = raw.split(/[–—-]/).map((p) => p.trim()).filter(Boolean);
  if (!parts.length) return null;
  const right = parts[parts.length - 1];
  const left = parts.length > 1 ? parts[0] : right;

  const read = (s: string) => {
    const day = s.match(/\d{1,2}/)?.[0];
    const mon = s.match(/[A-Za-z]+/)?.[0]?.toLowerCase();
    return { day: day ? Number(day) : null, mon: mon ? MONTHS.indexOf(mon) : -1 };
  };
  const r = read(right);
  const l = read(left);
  if (r.day == null || r.mon < 0) return null;
  const lMon = l.mon >= 0 ? l.mon : r.mon;
  const lDay = l.day ?? r.day;

  // A range that wraps the new year (e.g. 29 Dec – 3 Jan)
  const startYear = lMon > r.mon ? year - 1 : year;
  const iso = (y: number, m: number, d: number) =>
    `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  return [iso(startYear, lMon, lDay), iso(year, r.mon, r.day)];
}

function parseSeason(html: string, year: number): Fixture[] {
  const out: Fixture[] = [];
  const seen = new Set<string>();
  const rows = html.match(/<tr[\s\S]*?<\/tr>/g) ?? [];

  for (const row of rows) {
    const cells = (row.match(/<t[dh][\s\S]*?<\/t[dh]>/g) ?? []).map(strip);
    if (cells.length < 2) continue;
    const [dateRaw, info] = cells;
    if (!/Host:/.test(info)) continue;
    if (/cancell?ed/i.test(info) || /cancell?ed/i.test(dateRaw)) continue;

    const range = parseRange(dateRaw, year);
    if (!range) continue;

    const name = info.split("\n")[0].replace(/\(Draw\)/gi, "").replace(/\s+/g, " ").trim();
    if (!name || seen.has(name)) continue;
    seen.add(name);

    const grab = (k: string) =>
      info.match(new RegExp(`${k}:\\s*([^\\n]+)`))?.[1]?.trim() ?? "";
    const host = grab("Host");
    const bits = host.split(",").map((s) => s.trim());

    out.push({
      id: name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      name,
      level: grab("Level") || "BWF World Tour",
      city: bits[0] ?? host,
      country: bits.length > 1 ? bits[bits.length - 1] : bits[0] ?? "",
      venue: grab("Venue"),
      prize: grab("Prize"),
      startISO: range[0],
      endISO: range[1],
      dateLabel: formatRange(range[0], range[1]),
    });
  }
  return out;
}

async function loadSeason(year: number): Promise<Fixture[]> {
  const res = await fetch(
    `https://en.wikipedia.org/api/rest_v1/page/html/${year}_BWF_World_Tour`,
    {
      headers: { "User-Agent": "courtside-3d/1.0 (badminton fixtures viewer)" },
      next: { revalidate },
    },
  );
  if (!res.ok) throw new Error(`wikipedia ${res.status}`);
  return parseSeason(await res.text(), year);
}

export async function GET() {
  const now = new Date();
  // UTC everywhere: the client computes countdowns in UTC too, and Vercel
  // runs in UTC while local dev may not.
  const cutoff = now.toISOString().slice(0, 10);
  const year = now.getUTCFullYear();

  try {
    let all = await loadSeason(year);
    let upcoming = all.filter((f) => f.endISO >= cutoff);

    // Late in the season the current year runs dry — roll into the next one.
    if (upcoming.length < 4) {
      const next = await loadSeason(year + 1).catch(() => [] as Fixture[]);
      all = [...all, ...next];
      upcoming = all.filter((f) => f.endISO >= cutoff);
    }
    if (!upcoming.length) throw new Error("no upcoming fixtures parsed");

    upcoming.sort((a, b) => a.startISO.localeCompare(b.startISO));

    const payload: FixturePayload = {
      fixtures: upcoming.slice(0, 16),
      source: "wikipedia",
      season: year,
      fetchedAt: new Date().toISOString(),
    };
    return NextResponse.json(payload, {
      headers: { "Cache-Control": "public, s-maxage=21600, stale-while-revalidate=86400" },
    });
  } catch {
    const payload: FixturePayload = {
      fixtures: FALLBACK_FIXTURES.filter((f) => f.endISO >= cutoff).slice(0, 16),
      source: "fallback",
      season: year,
      fetchedAt: new Date().toISOString(),
    };
    return NextResponse.json(payload, {
      headers: { "Cache-Control": "public, s-maxage=600" },
    });
  }
}

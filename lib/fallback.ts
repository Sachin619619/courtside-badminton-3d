import type { Fixture } from "./types";

// Snapshot of the 2026 BWF World Tour used only when the live Wikipedia
// fetch fails. Kept deliberately small — the live parser is the source of truth.
export const FALLBACK_FIXTURES: Fixture[] = [
  ["Vietnam Open", "Super 100", "Ho Chi Minh City", "Vietnam", "Nguyen Du Gymnasium", "$110,000", "2026-09-08", "2026-09-13"],
  ["Arctic Open", "Super 500", "Vantaa", "Finland", "Energia Areena", "$475,000", "2026-10-06", "2026-10-11"],
  ["Denmark Open", "Super 750", "Odense", "Denmark", "Jyske Bank Arena", "$900,000", "2026-10-13", "2026-10-18"],
  ["French Open", "Super 750", "Tremblay-en-France", "France", "Glaz Arena", "$900,000", "2026-10-20", "2026-10-25"],
  ["Hylo Open", "Super 500", "Saarbrücken", "Germany", "Saarlandhalle", "$475,000", "2026-10-27", "2026-11-01"],
  ["Korea Open", "Super 500", "Yeosu", "South Korea", "Jinnam Stadium", "$475,000", "2026-11-03", "2026-11-08"],
  ["Japan Masters", "Super 500", "Kumamoto", "Japan", "Kumamoto Prefectural Gym", "$475,000", "2026-11-10", "2026-11-15"],
  ["Hong Kong Open", "Super 500", "Hong Kong", "Hong Kong", "Hong Kong Coliseum", "$475,000", "2026-11-17", "2026-11-22"],
  ["Syed Modi International", "Super 300", "Lucknow", "India", "BBD Badminton Stadium", "$240,000", "2026-11-24", "2026-11-29"],
  ["Guwahati Masters", "Super 100", "Guwahati", "India", "Karmabir Nabin Chandra Bordoloi Hall", "$110,000", "2026-12-01", "2026-12-06"],
  ["Odisha Masters", "Super 100", "Cuttack", "India", "Jawaharlal Nehru Indoor Stadium", "$110,000", "2026-12-08", "2026-12-13"],
  ["BWF World Tour Finals", "World Tour Finals", "Hangzhou", "China", "Hangzhou Olympic Sports Centre", "$2,500,000", "2026-12-09", "2026-12-13"],
].map(([name, level, city, country, venue, prize, startISO, endISO]) => ({
  id: name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
  name, level, city, country, venue, prize, startISO, endISO,
  dateLabel: formatRange(startISO, endISO),
}));

export function formatRange(startISO: string, endISO: string): string {
  const s = new Date(startISO + "T00:00:00Z");
  const e = new Date(endISO + "T00:00:00Z");
  const mon = (d: Date) => d.toLocaleDateString("en-GB", { month: "short", timeZone: "UTC" });
  const day = (d: Date) => d.getUTCDate();
  return mon(s) === mon(e)
    ? `${day(s)}–${day(e)} ${mon(e)}`
    : `${day(s)} ${mon(s)} – ${day(e)} ${mon(e)}`;
}

import { NextResponse } from "next/server";
import type { TexturePayload, TextureSet } from "@/lib/types";

export const revalidate = 86400; // 24h — Poly Haven URLs are stable

// Court surfaces, resolved live from the Poly Haven CC0 library.
const SURFACES = [
  { slug: "wooden_floor_02", label: "Championship Timber" },
  { slug: "herringbone_parquet", label: "Herringbone" },
  { slug: "diagonal_parquet", label: "Diagonal Amber" },
  { slug: "laminate_floor_02", label: "Pale Maple" },
  { slug: "rubber_tiles", label: "Synthetic Mat" },
  { slug: "wood_floor_deck", label: "Night Ebony" },
] as const;

const RES = "1k";

type PHFiles = Record<string, Record<string, Record<string, { url?: string }>>>;

function pick(files: PHFiles, key: string): string | undefined {
  return files?.[key]?.[RES]?.jpg?.url;
}

async function resolve(slug: string, label: string): Promise<TextureSet | null> {
  const [filesRes, infoRes] = await Promise.all([
    fetch(`https://api.polyhaven.com/files/${slug}`, { next: { revalidate } }),
    fetch(`https://api.polyhaven.com/info/${slug}`, { next: { revalidate } }).catch(() => null),
  ]);
  if (!filesRes.ok) return null;

  const files = (await filesRes.json()) as PHFiles;
  const diffuse = pick(files, "Diffuse") ?? pick(files, "diffuse");
  if (!diffuse) return null;

  let authors = "Poly Haven";
  if (infoRes?.ok) {
    const info = (await infoRes.json()) as { authors?: Record<string, string> };
    const names = Object.keys(info.authors ?? {});
    if (names.length) authors = names.join(", ");
  }

  return {
    id: slug,
    label,
    authors,
    maps: {
      diffuse,
      normal: pick(files, "nor_gl") ?? pick(files, "nor_dx"),
      rough: pick(files, "Rough"),
      ao: pick(files, "AO"),
    },
  };
}

export async function GET() {
  try {
    const resolved = await Promise.all(SURFACES.map((s) => resolve(s.slug, s.label)));
    const surfaces = resolved.filter((s): s is TextureSet => s !== null);
    if (!surfaces.length) throw new Error("no surfaces resolved");

    const payload: TexturePayload = {
      surfaces,
      source: "polyhaven",
      fetchedAt: new Date().toISOString(),
    };
    return NextResponse.json(payload, {
      headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800" },
    });
  } catch {
    // Deterministic CDN paths — the same files the API would have handed back.
    const base = "https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k";
    const payload: TexturePayload = {
      surfaces: SURFACES.map(({ slug, label }) => ({
        id: slug,
        label,
        authors: "Poly Haven",
        maps: {
          diffuse: `${base}/${slug}/${slug}_diff_${RES}.jpg`,
          normal: `${base}/${slug}/${slug}_nor_gl_${RES}.jpg`,
          rough: `${base}/${slug}/${slug}_rough_${RES}.jpg`,
          ao: `${base}/${slug}/${slug}_ao_${RES}.jpg`,
        },
      })),
      source: "fallback",
      fetchedAt: new Date().toISOString(),
    };
    return NextResponse.json(payload, { headers: { "Cache-Control": "public, s-maxage=600" } });
  }
}

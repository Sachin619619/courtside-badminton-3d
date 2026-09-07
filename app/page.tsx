"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { FixturePayload, TexturePayload, TextureSet } from "@/lib/types";

const Scene = dynamic(() => import("@/components/Scene").then((m) => m.Scene), { ssr: false });

const TIER: Record<string, string> = {
  "World Tour Finals": "#ffc94d",
  "Super 1000": "#ff4d3d",
  "Super 750": "#c8ff2f",
  "Super 500": "#6ea8ff",
  "Super 300": "#8d97ab",
  "Super 100": "#6b7488",
};
const tierColor = (level: string) =>
  Object.entries(TIER).find(([k]) => level.includes(k))?.[1] ?? "#8d97ab";

function daysUntil(iso: string) {
  const now = new Date();
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.round((new Date(iso + "T00:00:00Z").getTime() - today) / 86_400_000);
}

function whenLabel(startISO: string, endISO: string) {
  const d = daysUntil(startISO);
  if (d > 1) return `in ${d} days`;
  if (d === 1) return "tomorrow";
  if (d === 0) return "starts today";
  return daysUntil(endISO) >= 0 ? "in play" : "finished";
}

const WORD = "COURTSIDE";

export default function Page() {
  const [fx, setFx] = useState<FixturePayload | null>(null);
  const [tx, setTx] = useState<TexturePayload | null>(null);
  const [surface, setSurface] = useState<TextureSet | null>(null);
  const [surfaceReady, setSurfaceReady] = useState(false);
  const [paused, setPaused] = useState(false);
  const [interactive, setInteractive] = useState(false);
  const [booted, setBooted] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch("/api/fixtures")
      .then((r) => r.json())
      .then((d: FixturePayload) => alive && setFx(d))
      .catch(() => alive && setFx({ fixtures: [], source: "fallback", season: new Date().getFullYear(), fetchedAt: "" }));
    fetch("/api/textures")
      .then((r) => r.json())
      .then((d: TexturePayload) => {
        if (!alive) return;
        setTx(d);
        setSurface(d.surfaces[0] ?? null);
      })
      .catch(() => alive && setTx({ surfaces: [], source: "fallback", fetchedAt: "" }));
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (surfaceReady && fx) {
      const t = setTimeout(() => setBooted(true), 420);
      return () => clearTimeout(t);
    }
    // Never trap the viewer behind a stalled CDN.
    const t = setTimeout(() => setBooted(true), 8000);
    return () => clearTimeout(t);
  }, [surfaceReady, fx]);

  const onSurfaceReady = useCallback((r: boolean) => setSurfaceReady(r), []);

  const next = fx?.fixtures[0];
  const live = useMemo(
    () => (next ? daysUntil(next.startISO) <= 0 && daysUntil(next.endISO) >= 0 : false),
    [next],
  );

  return (
    <>
      <div className="boot" data-done={booted}>
        <div className="bx">
          <div className="bt">Courtside</div>
          <div className="bs">
            {surfaceReady ? "Entering the arena" : "Streaming court surface…"}
          </div>
          <div className="bar">
            <i />
          </div>
        </div>
      </div>

      <div className="stage">
        <Scene
          surface={surface}
          paused={paused}
          interactive={interactive}
          onSurfaceReady={onSurfaceReady}
        />
      </div>
      <div className="stage-veil" />

      <header className="topbar">
        <div className="mark">
          Court<span>side</span>
        </div>
        <div className="topbar-actions">
          <span className={`chip ${live ? "" : "dim"}`}>
            <i className={`pulse ${live ? "red" : ""}`} />
            {live ? "Tournament in play" : "Season live"}
          </span>
          <button className="ctl" data-on={interactive} onClick={() => setInteractive((v) => !v)}>
            {interactive ? "Free look" : "Auto cam"}
          </button>
          <button className="ctl" data-on={paused} onClick={() => setPaused((v) => !v)}>
            {paused ? "Paused" : "Rally"}
          </button>
        </div>
      </header>

      <main className="content">
        <section className="hero">
          <div className="hero-type">
            <p className="eyebrow">Badminton · Real-time 3D · BWF World Tour</p>
            <h1 className="wordmark">
              {WORD.split("").map((ch, i) => (
                <i
                  key={i}
                  className={i >= 5 ? "accent" : ""}
                  style={{ animationDelay: `${0.12 + i * 0.055}s` }}
                >
                  {ch}
                </i>
              ))}
            </h1>
            <p className="hero-sub">
              A regulation 13.4 × 6.1 m show court rendered live in your browser — with the
              playing surface <b>streamed as real PBR texture maps</b> and the calendar pulled
              from the <b>current BWF World Tour season</b>. Drag to walk the arena.
            </p>
          </div>

          <div className="hero-foot">
            {next ? (
              <div className="nextcard">
                <div className="k">Next on tour</div>
                <div className="n">{next.name}</div>
                <div className="m">
                  {next.dateLabel} · {next.city}, {next.country} ·{" "}
                  <span className="cd">{whenLabel(next.startISO, next.endISO)}</span>
                </div>
              </div>
            ) : (
              <div className="nextcard">
                <div className="k">Next on tour</div>
                <div className="n">Loading fixtures…</div>
                <div className="m">Reading the current World Tour calendar</div>
              </div>
            )}
            <div className="scrollcue">Scroll for the calendar</div>
          </div>
        </section>

        <section className="slab">
          <div className="shell">
            <div className="sec-head">
              <h2>
                Live <em>surface</em>
              </h2>
              <p>
                {tx
                  ? `${tx.surfaces.length} sets · ${tx.source === "polyhaven" ? "Poly Haven API" : "CDN fallback"}`
                  : "Resolving…"}
              </p>
            </div>
            <div className="surfaces">
              {(tx?.surfaces ?? []).map((s) => {
                const on = surface?.id === s.id;
                return (
                  <button
                    key={s.id}
                    className="swatch"
                    data-on={on}
                    onClick={() => setSurface(s)}
                    aria-pressed={on}
                  >
                    {on && <span className="on">On court</span>}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={s.maps.diffuse} alt={`${s.label} surface`} loading="lazy" />
                    <span className="meta">
                      <span className="t">{s.label}</span>
                      <span className="s">
                        {s.id} · {Object.values(s.maps).filter(Boolean).length} maps · {s.authors}
                      </span>
                    </span>
                  </button>
                );
              })}
              {!tx && <div className="fx-when">Fetching texture manifests…</div>}
            </div>
          </div>
        </section>

        <section className="slab">
          <div className="shell">
            <div className="sec-head">
              <h2>
                Upcoming <em>fixtures</em>
              </h2>
              <p>
                {fx
                  ? `${fx.fixtures.length} events · ${fx.season} season · ${
                      fx.source === "wikipedia" ? "live feed" : "cached"
                    }`
                  : "Loading…"}
              </p>
            </div>
            <div className="fixtures">
              {(fx?.fixtures ?? []).map((f, i) => {
                const start = new Date(f.startISO + "T00:00:00Z");
                return (
                  <article
                    key={f.id + f.startISO}
                    className={`fx ${i === 0 ? "lead" : ""}`}
                    style={{ ["--tier" as string]: tierColor(f.level) }}
                  >
                    <div className="fx-date">
                      <span className="d">{String(start.getUTCDate()).padStart(2, "0")}</span>
                      <span className="mo">
                        {start.toLocaleDateString("en-GB", { month: "short", timeZone: "UTC" })}
                      </span>
                    </div>
                    <div className="fx-main">
                      <h3>{f.name}</h3>
                      <div className="fx-loc">
                        <b>
                          {f.city}
                          {f.country && f.country !== f.city ? `, ${f.country}` : ""}
                        </b>
                        {f.venue && <span>{f.venue}</span>}
                        <span>{f.dateLabel}</span>
                      </div>
                    </div>
                    <div className="fx-right">
                      <span className="tier">{f.level}</span>
                      <span className="fx-when">{whenLabel(f.startISO, f.endISO)}</span>
                      {f.prize && <span className="fx-prize">{f.prize}</span>}
                    </div>
                  </article>
                );
              })}
              {!fx && <div className="fx-when">Reading the World Tour calendar…</div>}
              {fx && fx.fixtures.length === 0 && (
                <div className="fx-when">No fixtures left in this season&apos;s calendar.</div>
              )}
            </div>
          </div>
        </section>

        <footer className="slab foot">
          <div className="shell row">
            <span>
              Fixtures parsed live from{" "}
              <a href="https://en.wikipedia.org/wiki/2026_BWF_World_Tour" target="_blank" rel="noreferrer">
                Wikipedia · BWF World Tour
              </a>
              , refreshed every 6 hours.
            </span>
            <span>
              Court surfaces streamed from{" "}
              <a href="https://polyhaven.com/textures" target="_blank" rel="noreferrer">
                Poly Haven
              </a>{" "}
              (CC0).
            </span>
            <span>Built with Three.js · React Three Fiber · Next.js</span>
          </div>
        </footer>
      </main>
    </>
  );
}

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { COURT, makeLineTexture } from "@/lib/court";
import type { TextureSet } from "@/lib/types";

/** Streams the PBR maps for a surface straight off the Poly Haven CDN. */
function useLiveSurface(set: TextureSet | null, repeat: [number, number]) {
  const [maps, setMaps] = useState<{
    map?: THREE.Texture;
    normalMap?: THREE.Texture;
    roughnessMap?: THREE.Texture;
    aoMap?: THREE.Texture;
  }>({});
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!set) return;
    let cancelled = false;
    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin("anonymous");
    setReady(false);

    const load = (url?: string, srgb = false, aoChannel = false) =>
      !url
        ? Promise.resolve(undefined)
        : new Promise<THREE.Texture | undefined>((resolve) =>
            loader.load(
              url,
              (t) => {
                t.wrapS = t.wrapT = THREE.RepeatWrapping;
                t.repeat.set(repeat[0], repeat[1]);
                t.anisotropy = 8;
                if (srgb) t.colorSpace = THREE.SRGBColorSpace;
                // PlaneGeometry only ships uv0 — point the AO map at it.
                if (aoChannel) t.channel = 0;
                resolve(t);
              },
              undefined,
              () => resolve(undefined),
            ),
          );

    Promise.all([
      load(set.maps.diffuse, true),
      load(set.maps.normal),
      load(set.maps.rough),
      load(set.maps.ao, false, true),
    ]).then(([map, normalMap, roughnessMap, aoMap]) => {
      if (cancelled) {
        [map, normalMap, roughnessMap, aoMap].forEach((t) => t?.dispose());
        return;
      }
      setMaps({ map, normalMap, roughnessMap, aoMap });
      setReady(true);
    });

    return () => {
      cancelled = true;
    };
  }, [set, repeat]);

  return { ...maps, ready };
}

function NetTexture() {
  return useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 512;
    c.height = 72;
    const ctx = c.getContext("2d")!;
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.strokeStyle = "rgba(232,238,248,0.85)";
    ctx.lineWidth = 1;
    const step = 11;
    for (let x = 0; x <= c.width; x += step) {
      ctx.beginPath();
      ctx.moveTo(x + 0.5, 8);
      ctx.lineTo(x + 0.5, c.height);
      ctx.stroke();
    }
    for (let y = 8; y <= c.height; y += step) {
      ctx.beginPath();
      ctx.moveTo(0, y + 0.5);
      ctx.lineTo(c.width, y + 0.5);
      ctx.stroke();
    }
    // white tape along the top edge
    ctx.fillStyle = "#fbf8ef";
    ctx.fillRect(0, 0, c.width, 8);

    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = THREE.RepeatWrapping;
    tex.repeat.set(1, 1);
    return tex;
  }, []);
}

function Net() {
  const tex = NetTexture();
  const netDepth = 0.76;
  const topY = COURT.netCentreHeight;
  const postX = COURT.doublesWidth / 2;

  return (
    <group>
      <mesh position={[0, topY - netDepth / 2, 0]}>
        <planeGeometry args={[COURT.doublesWidth, netDepth]} />
        <meshStandardMaterial
          map={tex}
          transparent
          side={THREE.DoubleSide}
          roughness={0.85}
          alphaTest={0.04}
          emissive="#22304a"
          emissiveIntensity={0.25}
        />
      </mesh>
      {[-postX, postX].map((x) => (
        <group key={x} position={[x, 0, 0]}>
          <mesh position={[0, COURT.netPostHeight / 2, 0]} castShadow>
            <cylinderGeometry args={[0.032, 0.038, COURT.netPostHeight, 16]} />
            <meshStandardMaterial color="#11151f" roughness={0.34} metalness={0.72} />
          </mesh>
          <mesh position={[0, 0.018, 0]}>
            <cylinderGeometry args={[0.24, 0.28, 0.036, 24]} />
            <meshStandardMaterial color="#0c0f17" roughness={0.4} metalness={0.6} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

export function Court({
  surface,
  onReady,
}: {
  surface: TextureSet | null;
  onReady?: (ready: boolean) => void;
}) {
  const repeat = useMemo<[number, number]>(() => [7, 12], []);
  const { map, normalMap, roughnessMap, aoMap, ready } = useLiveSurface(surface, repeat);
  const lineTex = useMemo(() => makeLineTexture(), []);
  const lastReady = useRef(false);
  const deckMat = useRef<THREE.MeshStandardMaterial>(null);

  // three compiles the shader with USE_MAP baked in. The maps arrive from the
  // CDN *after* first compile, so without this flag the deck renders flat.
  useEffect(() => {
    if (deckMat.current) deckMat.current.needsUpdate = true;
  }, [map, normalMap, roughnessMap, aoMap]);

  useEffect(() => {
    if (lastReady.current !== ready) {
      lastReady.current = ready;
      onReady?.(ready);
    }
  }, [ready, onReady]);

  const deckW = 10.4;
  const deckL = 18.2;
  const normalScale = useMemo(() => new THREE.Vector2(1.35, 1.35), []);

  return (
    <group>
      {/* hall floor beyond the deck */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.14, 0]} receiveShadow>
        <planeGeometry args={[120, 120]} />
        <meshStandardMaterial color="#05070c" roughness={0.52} metalness={0.34} />
      </mesh>

      {/* the live-textured playing deck */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[deckW, deckL]} />
        <meshStandardMaterial
          ref={deckMat}
          map={map}
          normalMap={normalMap}
          roughnessMap={roughnessMap}
          aoMap={aoMap}
          color={map ? "#ffffff" : "#3a2c1c"}
          normalScale={normalScale}
          roughness={map ? 0.62 : 0.6}
          metalness={0.05}
          envMapIntensity={0.22}
        />
      </mesh>

      {/* deck edge trim — sits strictly below the playing surface, otherwise its
          top face is coplanar with the deck and z-fights the wood away */}
      <mesh position={[0, -0.055, 0]}>
        <boxGeometry args={[deckW + 0.16, 0.08, deckL + 0.16]} />
        <meshStandardMaterial color="#0a0d14" roughness={0.35} metalness={0.7} />
      </mesh>

      {/* regulation markings, laid over whatever surface is live */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.004, 0]}>
        <planeGeometry args={[COURT.doublesWidth, COURT.length]} />
        <meshStandardMaterial
          map={lineTex}
          transparent
          alphaTest={0.12}
          roughness={0.42}
          emissive="#ffffff"
          emissiveIntensity={0.04}
          polygonOffset
          polygonOffsetFactor={-2}
        />
      </mesh>

      <Net />
    </group>
  );
}

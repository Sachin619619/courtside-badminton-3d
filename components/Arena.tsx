"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

/** Tiered seating banks, drawn as instanced blocks so the hall stays cheap. */
function Crowd() {
  const ref = useRef<THREE.InstancedMesh>(null);
  const seats = useMemo(() => {
    const out: { p: [number, number, number]; c: THREE.Color }[] = [];
    const palette = ["#16203a", "#1d2b4d", "#101827", "#243257", "#0d1420"];
    const rnd = (seed: number) => {
      const x = Math.sin(seed * 127.1) * 43758.5453;
      return x - Math.floor(x);
    };
    let n = 0;
    for (const side of [-1, 1]) {
      for (let tier = 0; tier < 9; tier++) {
        const x = side * (7.6 + tier * 0.86);
        const y = 0.55 + tier * 0.62;
        for (let i = 0; i < 34; i++) {
          const z = -13 + i * 0.79;
          const r = rnd(++n);
          if (r < 0.12) continue;
          out.push({
            p: [x + (r - 0.5) * 0.18, y, z],
            c: new THREE.Color(palette[Math.floor(rnd(n * 3) * palette.length)]),
          });
        }
      }
    }
    return out;
  }, []);

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const m = new THREE.Matrix4();
    seats.forEach((s, i) => {
      m.makeTranslation(s.p[0], s.p[1], s.p[2]);
      mesh.setMatrixAt(i, m);
      mesh.setColorAt(i, s.c);
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [seats]);

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, seats.length]} frustumCulled={false}>
      <boxGeometry args={[0.42, 0.46, 0.5]} />
      <meshStandardMaterial roughness={0.9} metalness={0.05} />
    </instancedMesh>
  );
}

function Stands() {
  return (
    <group>
      {[-1, 1].map((side) => (
        <group key={side}>
          {Array.from({ length: 9 }, (_, tier) => (
            <mesh
              key={tier}
              position={[side * (7.6 + tier * 0.86), 0.28 + tier * 0.62, 0]}
              receiveShadow
            >
              <boxGeometry args={[0.88, 0.62, 28]} />
              <meshStandardMaterial color="#070a12" roughness={0.86} metalness={0.08} />
            </mesh>
          ))}
          {/* LED perimeter board facing the court */}
          <mesh position={[side * 7.0, 0.24, 0]} rotation={[0, side * -Math.PI / 2, 0]}>
            <planeGeometry args={[26, 0.46]} />
            <meshStandardMaterial
              color="#05070c"
              emissive="#c8ff2f"
              emissiveIntensity={0.22}
              toneMapped={false}
            />
          </mesh>
        </group>
      ))}
      <Crowd />
    </group>
  );
}

function Floodlight({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh>
        <boxGeometry args={[2.2, 0.3, 1.25]} />
        <meshStandardMaterial color="#0b0e16" roughness={0.4} metalness={0.8} />
      </mesh>
      <mesh position={[0, -0.16, 0]}>
        <boxGeometry args={[1.98, 0.05, 1.05]} />
        <meshBasicMaterial color="#ffeccd" toneMapped={false} />
      </mesh>
      <spotLight
        position={[0, -0.2, 0]}
        target-position={[position[0] * 0.16, 0, position[2] * 0.16]}
        angle={0.72}
        penumbra={0.85}
        intensity={130}
        distance={48}
        decay={2}
        color="#fff0d8"
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0006}
      />
    </group>
  );
}

/** Slow drift on the roof truss keeps the hall from feeling like a still. */
function Truss() {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (ref.current) ref.current.position.y = 11.4 + Math.sin(clock.elapsedTime * 0.22) * 0.04;
  });
  return (
    <group ref={ref} position={[0, 11.4, 0]}>
      {[-6, -2, 2, 6].map((z) => (
        <mesh key={z} position={[0, 0.5, z * 1.6]}>
          <boxGeometry args={[22, 0.12, 0.12]} />
          <meshStandardMaterial color="#0d1119" roughness={0.44} metalness={0.85} />
        </mesh>
      ))}
      {[-8, 0, 8].map((x) => (
        <mesh key={x} position={[x, 0.5, 0]}>
          <boxGeometry args={[0.12, 0.12, 24]} />
          <meshStandardMaterial color="#0d1119" roughness={0.44} metalness={0.85} />
        </mesh>
      ))}
      <Floodlight position={[-4.4, 0, -5.2]} />
      <Floodlight position={[4.4, 0, -5.2]} />
      <Floodlight position={[-4.4, 0, 5.2]} />
      <Floodlight position={[4.4, 0, 5.2]} />
      <Floodlight position={[0, 0, 0]} />
    </group>
  );
}

export function Arena() {
  return (
    <group>
      <Stands />
      <Truss />
    </group>
  );
}

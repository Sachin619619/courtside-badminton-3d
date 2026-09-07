"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { shuttlePoint } from "@/lib/court";

const SCALE = 4.2; // a real shuttle is ~8cm — scaled up so it reads on a 13m court

/** Cork base + 16 goose-feather blades, built procedurally. */
function ShuttleBody() {
  const feathers = useMemo(() => {
    const blades: { rot: number }[] = [];
    for (let i = 0; i < 16; i++) blades.push({ rot: (i / 16) * Math.PI * 2 });
    return blades;
  }, []);

  return (
    <group scale={SCALE}>
      {/* cork */}
      <mesh position={[0, -0.012, 0]} castShadow>
        <sphereGeometry args={[0.0128, 24, 16, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]} />
        <meshStandardMaterial color="#f6f1e2" roughness={0.62} metalness={0.02} />
      </mesh>
      {/* leather skin band */}
      <mesh position={[0, -0.002, 0]}>
        <cylinderGeometry args={[0.0128, 0.0128, 0.02, 24]} />
        <meshStandardMaterial color="#fffdf6" roughness={0.5} />
      </mesh>
      {/* feather skirt */}
      {feathers.map(({ rot }, i) => (
        <mesh
          key={i}
          position={[Math.sin(rot) * 0.019, 0.035, Math.cos(rot) * 0.019]}
          rotation={[Math.cos(rot) * 0.34, -rot, -Math.sin(rot) * 0.34]}
        >
          <boxGeometry args={[0.0075, 0.062, 0.0009]} />
          <meshStandardMaterial
            color="#ffffff"
            roughness={0.82}
            transparent
            opacity={0.94}
            side={THREE.DoubleSide}
            emissive="#8fa4c8"
            emissiveIntensity={0.12}
          />
        </mesh>
      ))}
      {/* binding thread */}
      <mesh position={[0, 0.041, 0]}>
        <torusGeometry args={[0.0225, 0.0011, 8, 32]} />
        <meshStandardMaterial color="#d8cfae" roughness={0.7} />
      </mesh>
    </group>
  );
}

type Rally = { from: THREE.Vector3; to: THREE.Vector3; peak: number; dur: number };

/** A looping rally: the shuttle is played end to end, alternating sides. */
export function Shuttlecock({ paused }: { paused: boolean }) {
  const group = useRef<THREE.Group>(null);
  const trailRef = useRef<THREE.Line>(null);

  const rallies = useMemo<Rally[]>(() => {
    const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
    return [
      { from: v(-1.6, 0.9, 5.4), to: v(1.4, 0.5, -5.2), peak: 3.1, dur: 2.15 },
      { from: v(1.4, 0.5, -5.2), to: v(-2.1, 1.2, 4.2), peak: 1.5, dur: 1.5 },
      { from: v(-2.1, 1.2, 4.2), to: v(2.3, 0.4, -1.9), peak: 0.9, dur: 1.1 },
      { from: v(2.3, 0.4, -1.9), to: v(-0.4, 1.6, 2.4), peak: 0.7, dur: 0.95 },
      { from: v(-0.4, 1.6, 2.4), to: v(2.0, 0.6, -5.9), peak: 2.7, dur: 2.0 },
      { from: v(2.0, 0.6, -5.9), to: v(-1.6, 0.9, 5.4), peak: 3.4, dur: 2.25 },
    ];
  }, []);

  const TRAIL = 46;
  const trail = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(TRAIL * 3), 3));
    const mat = new THREE.LineBasicMaterial({
      color: "#c8ff2f",
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    return new THREE.Line(geo, mat);
  }, []);

  const state = useRef({ idx: 0, t: 0, seeded: false });
  const pos = useMemo(() => new THREE.Vector3(), []);
  const prev = useMemo(() => new THREE.Vector3(), []);

  useFrame((_, delta) => {
    if (!group.current) return;
    const s = state.current;
    const r = rallies[s.idx];

    if (!paused) {
      s.t += delta / r.dur;
      while (s.t >= 1) {
        s.t -= 1;
        s.idx = (s.idx + 1) % rallies.length;
      }
    }

    prev.copy(pos);
    shuttlePoint(r.from, r.to, r.peak, s.t, pos);
    group.current.position.copy(pos);

    // Cork leads the flight: point the base along the direction of travel.
    const dir = prev.clone().sub(pos);
    if (dir.lengthSq() > 1e-8) {
      group.current.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
    }

    const attr = trail.geometry.getAttribute("position") as THREE.BufferAttribute;
    const arr = attr.array as Float32Array;
    if (!s.seeded) {
      for (let i = 0; i < TRAIL; i++) arr.set([pos.x, pos.y, pos.z], i * 3);
      s.seeded = true;
    } else {
      arr.copyWithin(3, 0, (TRAIL - 1) * 3);
      arr.set([pos.x, pos.y, pos.z], 0);
    }
    attr.needsUpdate = true;
  });

  return (
    <>
      <primitive object={trail} ref={trailRef} />
      <group ref={group}>
        <ShuttleBody />
        <pointLight color="#dfffa0" intensity={2.4} distance={3.2} decay={2} />
      </group>
    </>
  );
}

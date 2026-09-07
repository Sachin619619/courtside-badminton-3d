"use client";

import { Suspense, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Lightformer, OrbitControls, AdaptiveDpr } from "@react-three/drei";
import { EffectComposer, Bloom, Vignette, Noise, ChromaticAberration } from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";
import * as THREE from "three";
import { Court } from "./Court";
import { Arena } from "./Arena";
import { Shuttlecock } from "./Shuttlecock";
import type { TextureSet } from "@/lib/types";

/** Broadcast-style camera: a slow arc that eases between two framings. */
function CameraRig({ locked }: { locked: boolean }) {
  const { camera } = useThree();
  const target = useMemo(() => new THREE.Vector3(0, 1.1, 0), []);
  const desired = useMemo(() => new THREE.Vector3(), []);

  useFrame(({ clock }) => {
    if (locked) return;
    const t = clock.elapsedTime * 0.085;
    const radius = 12.6 + Math.sin(t * 0.7) * 2.1;
    const height = 4.3 + Math.sin(t * 0.45) * 1.7;
    desired.set(Math.sin(t) * radius, height, Math.cos(t) * radius);
    camera.position.lerp(desired, 0.02);
    camera.lookAt(target);
  });
  return null;
}

function Lighting() {
  return (
    <>
      <ambientLight intensity={0.09} color="#9aa8c4" />
      <hemisphereLight args={["#8d8397", "#140f09", 0.2]} />
      {/* straight-down warm key — this is what makes the timber read as timber.
          A directional light has no falloff and its default target is the origin. */}
      <directionalLight position={[0, 20, 0]} intensity={0.52} color="#ffdcaf" />
      <directionalLight
        position={[6, 14, 8]}
        intensity={0.38}
        color="#fff3e2"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
        shadow-camera-near={1}
        shadow-camera-far={46}
        shadow-camera-left={-16}
        shadow-camera-right={16}
        shadow-camera-top={16}
        shadow-camera-bottom={-16}
      />
      {/* four warm pools so the whole deck reads, not just centre court */}
      {([[-2.6, -4.4], [2.6, -4.4], [-2.6, 4.4], [2.6, 4.4]] as const).map(([x, z]) => (
        <pointLight
          key={`${x}:${z}`}
          position={[x, 5.6, z]}
          intensity={15}
          distance={22}
          decay={2}
          color="#ffe2b8"
        />
      ))}
      {/* cool rim picks the net and shuttle out of the dark */}
      <directionalLight position={[-9, 4, -9]} intensity={0.45} color="#7fa6ff" />
      <Environment resolution={128} frames={1}>
        <Lightformer intensity={1.5} position={[0, 8, 0]} scale={[14, 14, 1]} rotation-x={Math.PI / 2} color="#fff2e0" />
        <Lightformer intensity={0.85} position={[-9, 3, 0]} scale={[3, 12, 1]} rotation-y={Math.PI / 2} color="#6a7593" />
        <Lightformer intensity={0.85} position={[9, 3, 0]} scale={[3, 12, 1]} rotation-y={-Math.PI / 2} color="#6a7593" />
        <Lightformer intensity={0.5} position={[0, 3, -14]} scale={[16, 5, 1]} color="#42598f" />
      </Environment>
    </>
  );
}

export function Scene({
  surface,
  paused,
  interactive,
  onSurfaceReady,
}: {
  surface: TextureSet | null;
  paused: boolean;
  interactive: boolean;
  onSurfaceReady?: (ready: boolean) => void;
}) {
  const dpr = useRef<[number, number]>([1, 1.8]);

  return (
    <Canvas
      shadows
      dpr={dpr.current}
      gl={{ antialias: true, powerPreference: "high-performance" }}
      camera={{ position: [11, 5.2, 11], fov: 42, near: 0.1, far: 220 }}
      onCreated={({ gl, scene }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 0.86;
        scene.fog = new THREE.FogExp2("#04060b", 0.0105);
      }}
    >
      <color attach="background" args={["#04060b"]} />
      <Suspense fallback={null}>
        <Lighting />
        <Arena />
        <Court surface={surface} onReady={onSurfaceReady} />
        <Shuttlecock paused={paused} />
      </Suspense>

      <CameraRig locked={interactive} />
      {interactive && (
        <OrbitControls
          makeDefault
          target={[0, 1.1, 0]}
          enablePan={false}
          minDistance={7}
          maxDistance={34}
          minPolarAngle={0.18}
          maxPolarAngle={Math.PI / 2.15}
          enableDamping
          dampingFactor={0.06}
        />
      )}

      <AdaptiveDpr pixelated />
      <EffectComposer enableNormalPass={false}>
        <Bloom intensity={0.38} luminanceThreshold={0.86} luminanceSmoothing={0.2} mipmapBlur radius={0.55} />
        <ChromaticAberration
          blendFunction={BlendFunction.NORMAL}
          offset={new THREE.Vector2(0.00016, 0.00022)}
          radialModulation={false}
          modulationOffset={0}
        />
        <Noise opacity={0.028} blendFunction={BlendFunction.OVERLAY} />
        <Vignette eskil={false} offset={0.24} darkness={0.82} />
      </EffectComposer>
    </Canvas>
  );
}

import * as THREE from "three";

/** BWF regulation court, in metres. Net sits on z = 0. */
export const COURT = {
  length: 13.4,
  doublesWidth: 6.1,
  singlesWidth: 5.18,
  halfLength: 6.7,
  shortService: 1.98,
  doublesLongService: 5.94,
  netPostHeight: 1.55,
  netCentreHeight: 1.524,
  lineWidth: 0.04,
} as const;

const PX_PER_M = 84;

/**
 * Draws regulation line markings onto a transparent canvas so they can be
 * laid over whichever live PBR surface is currently loaded.
 */
export function makeLineTexture(): THREE.CanvasTexture {
  const w = Math.round(COURT.doublesWidth * PX_PER_M);
  const h = Math.round(COURT.length * PX_PER_M);
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d")!;

  // Canvas origin is top-left; court centre maps to the middle of the canvas.
  const X = (m: number) => w / 2 + m * PX_PER_M;
  const Z = (m: number) => h / 2 + m * PX_PER_M;
  const lw = Math.max(3, COURT.lineWidth * PX_PER_M);

  ctx.clearRect(0, 0, w, h);
  ctx.strokeStyle = "#fdfbf4";
  ctx.lineWidth = lw;
  ctx.lineCap = "square";

  const seg = (x1: number, z1: number, x2: number, z2: number) => {
    ctx.beginPath();
    ctx.moveTo(X(x1), Z(z1));
    ctx.lineTo(X(x2), Z(z2));
    ctx.stroke();
  };

  const dw = COURT.doublesWidth / 2;
  const sw = COURT.singlesWidth / 2;
  const hl = COURT.halfLength;

  // Outer (doubles) boundary + back lines
  ctx.strokeRect(X(-dw) + lw / 2, Z(-hl) + lw / 2, dw * 2 * PX_PER_M - lw, hl * 2 * PX_PER_M - lw);
  // Singles side lines
  seg(-sw, -hl, -sw, hl);
  seg(sw, -hl, sw, hl);
  // Short service lines
  seg(-dw, -COURT.shortService, dw, -COURT.shortService);
  seg(-dw, COURT.shortService, dw, COURT.shortService);
  // Doubles long service lines
  seg(-dw, -COURT.doublesLongService, dw, -COURT.doublesLongService);
  seg(-dw, COURT.doublesLongService, dw, COURT.doublesLongService);
  // Centre lines, service courts only
  seg(0, COURT.shortService, 0, hl);
  seg(0, -COURT.shortService, 0, -hl);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

/** Parabolic rally arc with the steep late drop a real shuttle has. */
export function shuttlePoint(
  from: THREE.Vector3,
  to: THREE.Vector3,
  peak: number,
  t: number,
  out: THREE.Vector3,
): THREE.Vector3 {
  // Horizontal travel decelerates hard — shuttles bleed speed fast.
  const e = 1 - Math.pow(1 - t, 2.4);
  out.x = from.x + (to.x - from.x) * e;
  out.z = from.z + (to.z - from.z) * e;
  const base = from.y + (to.y - from.y) * e;
  out.y = base + Math.sin(Math.PI * Math.pow(t, 0.82)) * peak;
  return out;
}

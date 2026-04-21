"use client";

import { useTheme } from "next-themes";
import { type MutableRefObject, useCallback, useEffect, useRef } from "react";

const ARM_COUNT = 12;
/** How many arms are picked from farther rings (larger Chebyshev distance) for longer lines. */
const FAR_CONNECTIONS = 4;
const FAR_RING_MIN = 5;
const FAR_RING_MAX = 9;
/** Delay between arms starting (farther-from-hub arms start first). */
const ARM_SNAP_STAGGER_MS = 200;
/** Duration (ms) for each arm's connection line to grow from outer point toward hub. */
const CONNECTION_DURATION_MS = 1400;
/** How long previous connections linger and fade (echo) after the hub cell changes. */
const ECHO_FADE_MS = 2000;
/** Pull committed outer endpoints toward cursor at wave start (0 = grid only). */
const CURSOR_PULL = 0.28;
/** Exponential smoothing time constant (ms); higher = calmer, less jitter. */
const HUB_SMOOTH_TAU_MS = 110;
/** Snap hub to exact cell center when this close (CSS px) — keeps the disc on a dot at rest. */
const HUB_SNAP_EPS_PX = 0.45;
/** Time to reach full settled glow once the hub is at rest (no pre-delay). */
const GLOW_SETTLE_RAMP_MS = 1000;
/** Smoothing for glow level (ms time constant, up / down). */
const GLOW_SMOOTH_TAU_UP_MS = 320;
const GLOW_SMOOTH_TAU_DOWN_MS = 140;
/** Faster follow while connections are attaching so glow tracks each arm start. */
const GLOW_ATTACH_TAU_MS = 85;
/** After the lead line crosses `CONVERGE_BLOOM_LEAD_START`, this gate eases 0→1 so the halo rises calmly (not a step). */
const CONVERGE_BLOOM_GATE_OPEN_TAU_MS = 820;
/** Snap gate closed while the lead line is below this linear progress (0–1); below full arrival so the halo starts as the stroke nears the hub. */
const CONVERGE_BLOOM_LEAD_START = 0.52;
/** Snap gate closed when idle or the wave hasn’t reached the lead threshold yet. */
const CONVERGE_BLOOM_GATE_CLOSE_TAU_MS = 140;
/** Bloom follows its target slowly on the way up, quicker on the way down. */
const CONVERGE_BLOOM_ATTACK_TAU_MS = 520;
const CONVERGE_BLOOM_RELEASE_TAU_MS = 200;
/** Hub core/ring brightness floor while diffuse bloom is low (same drive as glow). */
const HUB_BLOOM_DIM_FLOOR = 0.88;
/** When the wave is idle and glow has settled past this, hub returns to full brightness (not held dim). */
const HUB_DIM_RELEASE_SETTLE = 0.5;
/** Hub core disc radius (hub-local px, before `hubScale`); must match `drawHub`. */
const HUB_CORE_R_PX = 6.15;
/** Diffuse glow begins this far outside the animated outer ring — not flush on the ring. */
const CONVERGE_GLOW_PAST_RING_PX = 3.5;
/** Hub must be this close to its target (px) to count as “at rest” for settling. */
const GLOW_AT_TARGET_PX = 2.8;
/** Pointer speed (px/s) at or below → hub at full scale. */
const POINTER_SPEED_SLOW_PX_S = 85;
/** Pointer speed (px/s) at or above → hub at minimum scale. */
const POINTER_SPEED_FAST_PX_S = 1050;
/** Smooth pointer speed estimate (ms time constant). */
const POINTER_SPEED_SMOOTH_TAU_MS = 100;
/** Hub scale when pointer is slow or still (1 = default art size). */
const HUB_SCALE_AT_SLOW = 1;
/** Hub scale when pointer is moving fast. */
const HUB_SCALE_AT_FAST = 0.74;
/** Ease applied scale toward target so the hub does not jitter. */
const HUB_SCALE_RENDER_SMOOTH_TAU_MS = 75;
/** Base Chebyshev span for the soft outer halo (before motion multiplier). */
const HUB_OUTER_RING_BASE = 2.55;
/** Outer halo radius multiplier when pointer is calm (ring expands). */
const HUB_OUTER_RING_AT_SLOW = 1.68;
/** Outer halo radius multiplier when pointer is moving fast (ring contracts). */
const HUB_OUTER_RING_AT_FAST = 0.92;
/** Calm, slow follow for outer ring size (ms time constant). */
const HUB_OUTER_RING_SMOOTH_TAU_MS = 270;
/** Smoothed pointer velocity for chroma direction (ms time constant). */
const HUB_VELOCITY_SMOOTH_TAU_MS = 125;
/** Smoothed chromatic offset strength (ms time constant). */
const HUB_CHROMA_SMOOTH_TAU_MS = 215;
/** Max lateral separation (CSS px) for subtle RGB fringes. */
const HUB_CHROMA_MAX_OFFSET_PX = 1.75;

const COLS = 27;
const ROWS = 21;
const MAX_CANVAS_DPR = 1.5;

type NetColors = {
  field: string;
  ring: string;
  ringHalo: string;
  hubFill: string;
  hubStroke: string;
  hubGlowInner: string;
  hubGlowMid: string;
  hubGlowOuter: string;
  hubHighlight: string;
  lineHub: string;
  lineMid: string;
  lineEnd: string;
};

function themeColors(light: boolean): NetColors {
  if (light) {
    return {
      field: "rgba(15, 23, 42, 0.16)",
      ring: "rgba(15, 23, 42, 0.55)",
      ringHalo: "rgba(15, 23, 42, 0.14)",
      hubFill: "rgba(15, 23, 42, 0.48)",
      hubStroke: "rgba(15, 23, 42, 0.58)",
      hubGlowInner: "rgba(45, 120, 240, 0.5)",
      hubGlowMid: "rgba(170, 95, 220, 0.18)",
      hubGlowOuter: "rgba(59, 130, 246, 0)",
      hubHighlight: "rgba(255, 255, 255, 0.34)",
      lineHub: "rgba(200, 120, 180, 0.16)",
      lineMid: "rgba(80, 130, 200, 0.1)",
      lineEnd: "rgba(40, 100, 190, 0.45)",
    };
  }
  return {
    field: "rgba(255, 255, 255, 0.18)",
    ring: "rgba(200, 230, 255, 0.52)",
    ringHalo: "rgba(180, 210, 255, 0.14)",
    hubFill: "rgba(255, 255, 255, 0.44)",
    hubStroke: "rgba(255, 255, 255, 0.62)",
    hubGlowInner: "rgba(64, 148, 255, 0.55)",
    hubGlowMid: "rgba(180, 110, 255, 0.22)",
    hubGlowOuter: "rgba(147, 197, 253, 0)",
    hubHighlight: "rgba(255, 255, 255, 0.42)",
    lineHub: "rgba(255, 200, 240, 0.2)",
    lineMid: "rgba(160, 210, 255, 0.12)",
    lineEnd: "rgba(130, 200, 255, 0.5)",
  };
}

type GridCell = { gi: number; gj: number };

type EchoLayer = {
  outer: { x: number; y: number }[];
  tips: { x: number; y: number }[];
  startMs: number;
  hubX: number;
  hubY: number;
};

function rng(): number {
  return Math.random();
}

function chebDist(i: number, j: number, hubI: number, hubJ: number): number {
  return Math.max(Math.abs(i - hubI), Math.abs(j - hubJ));
}

function poolCellsInRing(hubI: number, hubJ: number, dMin: number, dMax: number): GridCell[] {
  const pool: GridCell[] = [];
  for (let j = 0; j < ROWS; j++) {
    for (let i = 0; i < COLS; i++) {
      if (i === hubI && j === hubJ) continue;
      const d = chebDist(i, j, hubI, hubJ);
      if (d >= dMin && d <= dMax) pool.push({ gi: i, gj: j });
    }
  }
  return pool;
}

function appendDistance1IfNeeded(pool: GridCell[], hubI: number, hubJ: number): void {
  if (pool.length >= ARM_COUNT) return;
  const seen = new Set(pool.map((p) => `${p.gi},${p.gj}`));
  for (let j = 0; j < ROWS; j++) {
    for (let i = 0; i < COLS; i++) {
      if (i === hubI && j === hubJ) continue;
      if (chebDist(i, j, hubI, hubJ) !== 1) continue;
      const key = `${i},${j}`;
      if (seen.has(key)) continue;
      seen.add(key);
      pool.push({ gi: i, gj: j });
    }
  }
}

function shuffleInPlace<T>(arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const ai = arr[i];
    const aj = arr[j];
    if (ai === undefined || aj === undefined) continue;
    arr[i] = aj;
    arr[j] = ai;
  }
}

/** Random cells: some from far rings (longer lines), rest from 2–4 (+ d1 fallback) — different pattern each hub change. */
function pickRandomSlots(hubI: number, hubJ: number): GridCell[] {
  const farPool = poolCellsInRing(hubI, hubJ, FAR_RING_MIN, FAR_RING_MAX);
  const nearPool = poolCellsInRing(hubI, hubJ, 2, 4);
  appendDistance1IfNeeded(nearPool, hubI, hubJ);
  shuffleInPlace(farPool);
  shuffleInPlace(nearPool);

  const out: GridCell[] = [];
  const seen = new Set<string>();

  const pushUnique = (c: GridCell): boolean => {
    const k = `${c.gi},${c.gj}`;
    if (seen.has(k)) return false;
    seen.add(k);
    out.push(c);
    return true;
  };

  for (const c of farPool) {
    if (out.length >= FAR_CONNECTIONS) break;
    pushUnique(c);
  }

  for (const c of nearPool) {
    if (out.length >= ARM_COUNT) break;
    pushUnique(c);
  }

  if (out.length < ARM_COUNT) {
    const wide = poolCellsInRing(hubI, hubJ, 3, FAR_RING_MAX);
    shuffleInPlace(wide);
    for (const c of wide) {
      if (out.length >= ARM_COUNT) break;
      pushUnique(c);
    }
  }

  while (out.length < ARM_COUNT) {
    out.push({ gi: hubI, gj: hubJ });
  }
  return out.slice(0, ARM_COUNT);
}

function cellCenter(gi: number, gj: number, cellW: number, cellH: number): { x: number; y: number } {
  return { x: (gi + 0.5) * cellW, y: (gj + 0.5) * cellH };
}

function pullTowardCursor(
  gx: number,
  gy: number,
  mouse: { x: number; y: number },
  w: number,
  h: number
): { x: number; y: number } {
  const o = 1 - CURSOR_PULL;
  return {
    x: Math.max(0, Math.min(w, gx * o + mouse.x * CURSOR_PULL)),
    y: Math.max(0, Math.min(h, gy * o + mouse.y * CURSOR_PULL)),
  };
}

/** Farthest Chebyshev arms start first (wave travels outer → hub). */
function snapIndicesOuterToCenter(hubI: number, hubJ: number, slots: GridCell[]): number[] {
  const scored = slots.map((s, idx) => ({
    idx,
    d: chebDist(s.gi, s.gj, hubI, hubJ),
  }));
  scored.sort((a, b) => {
    if (b.d !== a.d) return b.d - a.d;
    return a.idx - b.idx;
  });
  return scored.map((s) => s.idx);
}

function easeOutCubic(t: number): number {
  const u = 1 - t;
  return 1 - u * u * u;
}

function rgbaFromComponents(r: number, g: number, b: number, a: number): string {
  return `rgba(${Math.round(r)},${Math.round(g)},${Math.round(b)},${a})`;
}

type HubMotionAccent = {
  chromaStrength01: number;
  perpX: number;
  perpY: number;
  flowT: number;
  /** 0 slow … 1 fast — thins the outer ring overall. */
  pointerSpeedU: number;
};

/** RGB channel-style glow fringes (spectral tear); always somewhat visible. */
function drawHubGlowChromaFringes(
  ctx: CanvasRenderingContext2D,
  hubX: number,
  hubY: number,
  settle01: number,
  motion: HubMotionAccent
): void {
  const kVis = Math.min(1, Math.max(0.12, motion.chromaStrength01 * 0.72 + 0.12));
  const w = easeOutCubic(kVis);
  const amp = w * HUB_CHROMA_MAX_OFFSET_PX;
  const px = motion.perpX;
  const py = motion.perpY;
  const tx = py;
  const ty = -px;
  const drawRgbBlob = (
    cx: number,
    cy: number,
    rgb: readonly [number, number, number],
    coreA: number,
    midA: number,
    rScale: number
  ) => {
    const r1 = (7 + 2.2 * settle01) * rScale;
    const r0 = r1 * 0.68;
    const g = ctx.createRadialGradient(cx, cy, r0, cx, cy, r1);
    g.addColorStop(0, rgbaFromComponents(rgb[0], rgb[1], rgb[2], 0));
    g.addColorStop(0.55, rgbaFromComponents(rgb[0], rgb[1], rgb[2], midA * w * 0.5));
    g.addColorStop(0.88, rgbaFromComponents(rgb[0], rgb[1], rgb[2], coreA * w));
    g.addColorStop(1, rgbaFromComponents(rgb[0], rgb[1], rgb[2], 0));
    ctx.beginPath();
    ctx.arc(cx, cy, r1, 0, Math.PI * 2);
    ctx.fillStyle = g;
    ctx.fill();
  };
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  drawRgbBlob(hubX + px * amp * 0.55, hubY + py * amp * 0.55, [255, 70, 95], 0.052, 0.026, 1.03);
  drawRgbBlob(hubX + tx * amp * 0.2, hubY + ty * amp * 0.2, [70, 255, 150], 0.044, 0.022, 1);
  drawRgbBlob(hubX - px * amp * 0.55, hubY - py * amp * 0.55, [65, 165, 255], 0.05, 0.024, 1.03);
  ctx.restore();
}

function drawFieldDots(
  ctx: CanvasRenderingContext2D,
  c: NetColors,
  cols: number,
  rows: number,
  cellW: number,
  cellH: number,
  hubI: number,
  hubJ: number,
  excludeCells: GridCell[]
) {
  const skip = new Set(excludeCells.map((p) => `${p.gi},${p.gj}`));
  const r = 1.1;
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      if (i === hubI && j === hubJ) continue;
      if (skip.has(`${i},${j}`)) continue;
      const px = (i + 0.5) * cellW;
      const py = (j + 0.5) * cellH;
      ctx.beginPath();
      ctx.arc(px, py, r, 0, Math.PI * 2);
      ctx.fillStyle = c.field;
      ctx.fill();
    }
  }
}

function computeTipSnapshot(
  outer: { x: number; y: number }[],
  hubFrozen: { x: number; y: number },
  snapAt: number[],
  nowMs: number,
  waveActive: boolean,
  hubLive: { x: number; y: number }
): { x: number; y: number }[] {
  const tips: { x: number; y: number }[] = [];
  for (let i = 0; i < ARM_COUNT; i++) {
    const ox = outer[i].x;
    const oy = outer[i].y;
    if (waveActive) {
      if (nowMs < snapAt[i]) {
        tips.push({ x: ox, y: oy });
      } else {
        const tRaw = (nowMs - snapAt[i]) / CONNECTION_DURATION_MS;
        const t = easeOutCubic(Math.min(1, Math.max(0, tRaw)));
        tips.push({
          x: ox + (hubFrozen.x - ox) * t,
          y: oy + (hubFrozen.y - oy) * t,
        });
      }
    } else {
      tips.push({ x: hubLive.x, y: hubLive.y });
    }
  }
  return tips;
}

function drawEchoConnectionLines(
  ctx: CanvasRenderingContext2D,
  c: NetColors,
  outer: { x: number; y: number }[],
  tips: { x: number; y: number }[],
  alpha: number
) {
  if (alpha <= 0.01) return;
  const lineW = 0.72;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (let i = 0; i < ARM_COUNT; i++) {
    const { x: ox, y: oy } = outer[i];
    const { x: tx, y: ty } = tips[i];
    const dx = tx - ox;
    const dy = ty - oy;
    if (dx * dx + dy * dy < 0.4) continue;
    const g = ctx.createLinearGradient(ox, oy, tx, ty);
    g.addColorStop(0, c.lineEnd);
    g.addColorStop(0.35, c.lineMid);
    g.addColorStop(0.65, c.lineMid);
    g.addColorStop(1, c.lineHub);
    ctx.beginPath();
    ctx.moveTo(ox, oy);
    ctx.lineTo(tx, ty);
    ctx.strokeStyle = g;
    ctx.lineWidth = lineW;
    ctx.stroke();
  }
  ctx.restore();
}

function drawConnectionLines(
  ctx: CanvasRenderingContext2D,
  c: NetColors,
  outer: { x: number; y: number }[],
  snapAt: number[],
  hubFrozen: { x: number; y: number },
  hubLive: { x: number; y: number },
  nowMs: number,
  waveActive: boolean
) {
  const lineW = 0.72;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  for (let i = 0; i < ARM_COUNT; i++) {
    const { x: ox, y: oy } = outer[i];
    let tx: number;
    let ty: number;
    if (waveActive) {
      if (nowMs < snapAt[i]) continue;
      const tRaw = (nowMs - snapAt[i]) / CONNECTION_DURATION_MS;
      const t = easeOutCubic(Math.min(1, Math.max(0, tRaw)));
      tx = ox + (hubFrozen.x - ox) * t;
      ty = oy + (hubFrozen.y - oy) * t;
    } else {
      tx = hubLive.x;
      ty = hubLive.y;
    }
    const dx = tx - ox;
    const dy = ty - oy;
    if (dx * dx + dy * dy < 0.4) continue;

    const g = ctx.createLinearGradient(ox, oy, tx, ty);
    g.addColorStop(0, c.lineEnd);
    g.addColorStop(0.35, c.lineMid);
    g.addColorStop(0.65, c.lineMid);
    g.addColorStop(1, c.lineHub);

    ctx.beginPath();
    ctx.moveTo(ox, oy);
    ctx.lineTo(tx, ty);
    ctx.strokeStyle = g;
    ctx.lineWidth = lineW;
    ctx.stroke();
  }
}

/** Soft radial glow: tight, bright core; reach scales with grid cell so it never dominates small layouts. */
function drawRadialGlowSpot(
  ctx: CanvasRenderingContext2D,
  _c: NetColors,
  cx: number,
  cy: number,
  settle01: number,
  echoStrength: number,
  cellSpan: number
): void {
  const isEcho = echoStrength > 0;
  if (isEcho && echoStrength < 0.006) return;

  const calmCore = 0.042;
  const brightCore = 0.36;
  const coreA = isEcho ? 0.042 * echoStrength : calmCore + (brightCore - calmCore) * settle01;
  if (coreA < 0.002) return;

  const span = Math.max(5, cellSpan);
  /** Size stays tiny while idle: radius barely depends on settle (brightness uses settle via `coreA` only). */
  const r1 = isEcho
    ? Math.max(2.2, span * (0.042 + 0.028 * echoStrength))
    : Math.max(2.2, span * (0.03 + 0.0045 * settle01));
  const r0 = Math.max(1.1, r1 * (isEcho ? 0.38 : 0.44));

  const g = ctx.createRadialGradient(cx, cy, r0, cx, cy, r1);
  g.addColorStop(0, `rgba(255, 255, 255, ${coreA})`);
  g.addColorStop(0.22, `rgba(255, 255, 255, ${coreA * 0.9})`);
  g.addColorStop(0.42, `rgba(255, 255, 255, ${coreA * 0.42})`);
  g.addColorStop(0.68, `rgba(248, 252, 255, ${coreA * 0.1})`);
  g.addColorStop(1, "rgba(255, 255, 255, 0)");

  ctx.save();
  ctx.globalCompositeOperation = "screen";
  ctx.beginPath();
  ctx.arc(cx, cy, r1, 0, Math.PI * 2);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.restore();
}

/**
 * Wide, soft halo past the hub ring: long gentle falloff (not a tight band).
 * `strength01` is smoothed convergence brightness (0 until the first line completes).
 */
function drawConvergeDiffuseGlow(
  ctx: CanvasRenderingContext2D,
  hubX: number,
  hubY: number,
  strength01: number,
  hubScale: number,
  outerRingMul: number,
  cellSpan: number,
  light: boolean
): void {
  const u = Math.min(1, Math.max(0, strength01));
  if (u < 0.004) return;
  const uEase = easeOutCubic(u);
  const span = Math.max(5, cellSpan);
  const rSoft = HUB_CORE_R_PX * HUB_OUTER_RING_BASE * outerRingMul;
  const rInner = rSoft + CONVERGE_GLOW_PAST_RING_PX;
  /** Large radius so energy sits in a broad, diffuse pool — stops keep the inner edge nearly invisible. */
  const spread = Math.max(46, span * 1.45) * (0.62 + 0.38 * uEase);
  const rOuter = rInner + spread;
  ctx.save();
  ctx.translate(hubX, hubY);
  ctx.scale(hubScale, hubScale);
  ctx.translate(-hubX, -hubY);
  const g = ctx.createRadialGradient(hubX, hubY, rInner, hubX, hubY, rOuter);
  const a = uEase;
  if (light) {
    g.addColorStop(0, "rgba(255, 255, 255, 0)");
    g.addColorStop(0.28, `rgba(120, 158, 230, ${0.018 * a})`);
    g.addColorStop(0.52, `rgba(115, 152, 228, ${0.052 * a})`);
    g.addColorStop(0.68, `rgba(125, 168, 238, ${0.038 * a})`);
    g.addColorStop(0.86, `rgba(140, 182, 248, ${0.016 * a})`);
    g.addColorStop(1, "rgba(160, 195, 255, 0)");
  } else {
    g.addColorStop(0, "rgba(0, 0, 0, 0)");
    g.addColorStop(0.26, `rgba(110, 165, 255, ${0.022 * a})`);
    g.addColorStop(0.5, `rgba(125, 178, 255, ${0.065 * a})`);
    g.addColorStop(0.62, `rgba(145, 140, 240, ${0.042 * a})`);
    g.addColorStop(0.8, `rgba(100, 150, 235, ${0.028 * a})`);
    g.addColorStop(0.94, `rgba(90, 130, 215, ${0.01 * a})`);
    g.addColorStop(1, "rgba(80, 120, 200, 0)");
  }
  ctx.globalCompositeOperation = light ? "source-over" : "screen";
  ctx.globalAlpha = light ? 0.92 : 0.95;
  ctx.beginPath();
  ctx.arc(hubX, hubY, rOuter, 0, Math.PI * 2);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.restore();
}

function drawHubGlow(
  ctx: CanvasRenderingContext2D,
  c: NetColors,
  hubX: number,
  hubY: number,
  settle01: number,
  convergeBloom01: number,
  echoLayers: EchoLayer[],
  nowMs: number,
  hubScale: number,
  motion: HubMotionAccent,
  outerRingMul: number,
  cellSpan: number,
  light: boolean
): void {
  for (const el of echoLayers) {
    const age = nowMs - el.startMs;
    if (age >= ECHO_FADE_MS) continue;
    const u = age / ECHO_FADE_MS;
    const fade = (1 - u) * (1 - u);
    drawRadialGlowSpot(ctx, c, el.hubX, el.hubY, 0, fade * 0.42, cellSpan);
  }

  const drawSettle = Math.min(1, Math.max(0, settle01));
  drawConvergeDiffuseGlow(ctx, hubX, hubY, convergeBloom01, hubScale, outerRingMul, cellSpan, light);
  ctx.save();
  ctx.translate(hubX, hubY);
  ctx.scale(hubScale, hubScale);
  ctx.translate(-hubX, -hubY);
  drawRadialGlowSpot(ctx, c, hubX, hubY, drawSettle, 0, cellSpan);
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = 0.48;
  drawHubGlowChromaFringes(ctx, hubX, hubY, drawSettle, motion);
  ctx.restore();
}

/** Bright opaque center disc (no glass / frost / specular stack). */
function drawHubBrightCore(ctx: CanvasRenderingContext2D, hubX: number, hubY: number, r: number, light: boolean): void {
  const g = ctx.createRadialGradient(hubX, hubY, 0, hubX, hubY, r);
  if (light) {
    g.addColorStop(0, "rgb(255, 255, 255)");
    g.addColorStop(0.42, "rgb(236, 242, 255)");
    g.addColorStop(1, "rgb(200, 216, 248)");
  } else {
    g.addColorStop(0, "rgb(255, 255, 255)");
    g.addColorStop(0.38, "rgb(228, 238, 255)");
    g.addColorStop(0.72, "rgb(140, 185, 255)");
    g.addColorStop(1, "rgb(95, 150, 235)");
  }
  ctx.beginPath();
  ctx.arc(hubX, hubY, r, 0, Math.PI * 2);
  ctx.fillStyle = g;
  ctx.fill();
}

const OUTER_RING_SEGMENTS = 112;

function drawHubOuterRingDynamic(
  ctx: CanvasRenderingContext2D,
  hubX: number,
  hubY: number,
  rSoft: number,
  motion: HubMotionAccent,
  nowMs: number,
  light: boolean,
  alpha: number
): void {
  const n = OUTER_RING_SEGMENTS;
  const su = motion.pointerSpeedU;
  const thinOverall = 0.32 + 0.68 * (1 - su * 0.92);
  const t = nowMs * 0.0041;
  const flow = motion.flowT * Math.PI * 2;
  const ph = Math.atan2(motion.perpY, motion.perpX);

  ctx.strokeStyle = light ? "rgba(255, 255, 255, 0.3)" : "rgba(255, 255, 255, 0.24)";
  ctx.globalAlpha = alpha * 0.52;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * Math.PI * 2;
    const a1 = ((i + 1) / n) * Math.PI * 2;
    const mid = (a0 + a1) / 2;
    const wobble =
      0.5 + 0.5 * Math.sin(mid * 6 + ph + t) * (0.55 + 0.45 * Math.cos(mid * 13 - flow + t * 1.15 + ph * 2));
    const lw = (0.06 + 0.22 * wobble) * thinOverall;
    ctx.lineWidth = Math.max(0.045, lw);
    ctx.beginPath();
    ctx.arc(hubX, hubY, rSoft, a0, a1);
    ctx.stroke();
  }
}

function hubBloomDimScale(attachBright01: number, convergeBloom01: number, waveActive: boolean): number {
  const settled = !waveActive && attachBright01 >= HUB_DIM_RELEASE_SETTLE;
  const drive = settled ? 1 : convergeBloom01;
  return HUB_BLOOM_DIM_FLOOR + (1 - HUB_BLOOM_DIM_FLOOR) * Math.min(1, Math.max(0, drive));
}

function drawHub(
  ctx: CanvasRenderingContext2D,
  _c: NetColors,
  hubX: number,
  hubY: number,
  hubScale: number,
  outerRingMul: number,
  motion: HubMotionAccent,
  light: boolean,
  nowMs: number,
  attachBright01: number,
  convergeBloom01: number,
  waveActive: boolean,
  alpha = 1
) {
  if (alpha <= 0.01) return;
  const r = HUB_CORE_R_PX;
  const rSoft = r * HUB_OUTER_RING_BASE * outerRingMul;
  const dim = hubBloomDimScale(attachBright01, convergeBloom01, waveActive);
  const coreVivid = Math.min(1, (0.94 + 0.06 * Math.min(1, Math.max(0, attachBright01))) * dim);
  const ringVivid = Math.min(1, (0.72 + 0.28 * Math.min(1, Math.max(0, attachBright01))) * dim);
  ctx.save();
  ctx.translate(hubX, hubY);
  ctx.scale(hubScale, hubScale);
  ctx.translate(-hubX, -hubY);

  ctx.globalAlpha = alpha * coreVivid;
  drawHubBrightCore(ctx, hubX, hubY, r, light);

  /** Outer ring sets its own globalAlpha (`alpha * 0.52`); fold ringVivid into that alpha. */
  drawHubOuterRingDynamic(ctx, hubX, hubY, rSoft, motion, nowMs, light, alpha * ringVivid);

  ctx.restore();
}

function updateHubPointerVisuals(
  smoothSpeedRef: MutableRefObject<number>,
  hubScaleRenderedRef: MutableRefObject<number>,
  hubOuterRingMulRef: MutableRefObject<number>,
  velSmoothRef: MutableRefObject<{ x: number; y: number }>,
  chromaStrengthRef: MutableRefObject<number>,
  lastSampleRef: MutableRefObject<{ x: number; y: number; ms: number } | null>,
  mouse: { x: number; y: number },
  pointerInside: boolean,
  nowMs: number,
  prevFramePaintMs: number | null
): { hubScale: number; outerRingMul: number; motion: HubMotionAccent } {
  if (!pointerInside) {
    lastSampleRef.current = null;
  }

  let instSpeed = 0;
  let vx = 0;
  let vy = 0;
  if (pointerInside && lastSampleRef.current !== null) {
    const prev = lastSampleRef.current;
    const dt = nowMs - prev.ms;
    if (dt > 0.5 && dt < 90) {
      vx = (mouse.x - prev.x) / dt;
      vy = (mouse.y - prev.y) / dt;
      instSpeed = (Math.hypot(mouse.x - prev.x, mouse.y - prev.y) / dt) * 1000;
    }
  }

  const dtSmooth = prevFramePaintMs === null ? 16 : Math.min(80, Math.max(0, nowMs - prevFramePaintMs));
  const kSp = 1 - Math.exp(-dtSmooth / POINTER_SPEED_SMOOTH_TAU_MS);
  if (!pointerInside) {
    smoothSpeedRef.current += (0 - smoothSpeedRef.current) * kSp;
  } else {
    smoothSpeedRef.current += (instSpeed - smoothSpeedRef.current) * kSp;
  }

  const kVel = 1 - Math.exp(-dtSmooth / HUB_VELOCITY_SMOOTH_TAU_MS);
  const vs = velSmoothRef.current;
  if (!pointerInside) {
    vs.x += (0 - vs.x) * kVel * 1.05;
    vs.y += (0 - vs.y) * kVel * 1.05;
  } else {
    vs.x += (vx - vs.x) * kVel;
    vs.y += (vy - vs.y) * kVel;
  }

  if (pointerInside) {
    lastSampleRef.current = { x: mouse.x, y: mouse.y, ms: nowMs };
  }

  const sp = smoothSpeedRef.current;
  const denom = POINTER_SPEED_FAST_PX_S - POINTER_SPEED_SLOW_PX_S;
  const u = denom > 0 ? Math.min(1, Math.max(0, (sp - POINTER_SPEED_SLOW_PX_S) / denom)) : 0;
  const targetScale = HUB_SCALE_AT_SLOW + (HUB_SCALE_AT_FAST - HUB_SCALE_AT_SLOW) * u;

  const ringU = easeOutCubic(u);
  const targetOuterRingMul = HUB_OUTER_RING_AT_SLOW + (HUB_OUTER_RING_AT_FAST - HUB_OUTER_RING_AT_SLOW) * ringU;

  const kScale = 1 - Math.exp(-dtSmooth / HUB_SCALE_RENDER_SMOOTH_TAU_MS);
  hubScaleRenderedRef.current += (targetScale - hubScaleRenderedRef.current) * kScale;

  const kRing = 1 - Math.exp(-dtSmooth / HUB_OUTER_RING_SMOOTH_TAU_MS);
  hubOuterRingMulRef.current += (targetOuterRingMul - hubOuterRingMulRef.current) * kRing;

  const vmag = Math.hypot(vs.x, vs.y);
  const caTarget = Math.min(1, vmag / (POINTER_SPEED_FAST_PX_S * 0.5));
  const caU = easeOutCubic(caTarget);
  const kCh = 1 - Math.exp(-dtSmooth / HUB_CHROMA_SMOOTH_TAU_MS);
  chromaStrengthRef.current += (caU - chromaStrengthRef.current) * kCh;

  let perpX = 0;
  let perpY = 1;
  let flowT = 0.5 + Math.sin(nowMs * 0.00028) * 0.055;
  if (vmag > 7) {
    const inv = 1 / vmag;
    const dx = vs.x * inv;
    const dy = vs.y * inv;
    perpX = -dy;
    perpY = dx;
    flowT = Math.atan2(dy, dx) / (Math.PI * 2) + 0.5;
  }

  const motion: HubMotionAccent = {
    chromaStrength01: chromaStrengthRef.current,
    perpX,
    perpY,
    flowT,
    pointerSpeedU: u,
  };

  return {
    hubScale: hubScaleRenderedRef.current,
    outerRingMul: hubOuterRingMulRef.current,
    motion,
  };
}

function drawRingDots(
  ctx: CanvasRenderingContext2D,
  c: NetColors,
  outer: { x: number; y: number }[],
  snapAt: number[],
  nowMs: number,
  waveActive: boolean
) {
  const r = 2.45;
  for (let i = 0; i < ARM_COUNT; i++) {
    if (waveActive && nowMs < snapAt[i]) continue;
    const { x, y } = outer[i];
    ctx.beginPath();
    ctx.arc(x, y, r + 2.2, 0, Math.PI * 2);
    ctx.strokeStyle = c.ringHalo;
    ctx.lineWidth = 1.1;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x, y, r + 0.6, 0, Math.PI * 2);
    ctx.strokeStyle = c.ring;
    ctx.lineWidth = 0.55;
    ctx.globalAlpha = 0.55;
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = c.ring;
    ctx.fill();
  }
}

function hubCellFromMouse(
  mouse: { x: number; y: number },
  cellW: number,
  cellH: number,
  pointerInside: boolean
): { hubI: number; hubJ: number } {
  if (!pointerInside) {
    return { hubI: Math.floor(COLS / 2), hubJ: Math.floor(ROWS / 2) };
  }
  return {
    hubI: Math.max(0, Math.min(COLS - 1, Math.floor(mouse.x / cellW))),
    hubJ: Math.max(0, Math.min(ROWS - 1, Math.floor(mouse.y / cellH))),
  };
}

function setupWave(
  armSnapAtRef: number[],
  armSlotsRef: MutableRefObject<GridCell[]>,
  frozenHubRef: MutableRefObject<{ x: number; y: number }>,
  frozenOuterRef: MutableRefObject<{ x: number; y: number }[]>,
  hubI: number,
  hubJ: number,
  hubCssX: number,
  hubCssY: number,
  mouse: { x: number; y: number },
  w: number,
  h: number,
  cellW: number,
  cellH: number,
  nowMs: number
): void {
  const slots = pickRandomSlots(hubI, hubJ);
  armSlotsRef.current = slots;
  frozenHubRef.current = { x: hubCssX, y: hubCssY };
  for (let i = 0; i < ARM_COUNT; i++) {
    const { gi, gj } = slots[i];
    const { x: gx, y: gy } = cellCenter(gi, gj, cellW, cellH);
    const p = pullTowardCursor(gx, gy, mouse, w, h);
    frozenOuterRef.current[i] = { x: p.x, y: p.y };
  }
  const order = snapIndicesOuterToCenter(hubI, hubJ, slots);
  for (let k = 0; k < ARM_COUNT; k++) {
    armSnapAtRef[order[k]] = nowMs + k * ARM_SNAP_STAGGER_MS;
  }
}

function waveAnimating(snapAt: number[], nowMs: number): boolean {
  for (let i = 0; i < ARM_COUNT; i++) {
    if (nowMs < snapAt[i] + CONNECTION_DURATION_MS) return true;
  }
  return false;
}

function smoothHubToward(
  hubSmoothRef: MutableRefObject<{ x: number; y: number }>,
  lastPaintMsRef: MutableRefObject<number | null>,
  targetX: number,
  targetY: number,
  nowMs: number
): { x: number; y: number } {
  const prevPaint = lastPaintMsRef.current;
  lastPaintMsRef.current = nowMs;
  const dtMs = prevPaint === null ? 16 : Math.min(100, Math.max(0, nowMs - prevPaint));
  const smoothK = 1 - Math.exp(-dtMs / HUB_SMOOTH_TAU_MS);
  const hs = hubSmoothRef.current;
  if (prevPaint === null) {
    hs.x = targetX;
    hs.y = targetY;
  } else {
    hs.x += (targetX - hs.x) * smoothK;
    hs.y += (targetY - hs.y) * smoothK;
    if (Math.abs(hs.x - targetX) <= HUB_SNAP_EPS_PX && Math.abs(hs.y - targetY) <= HUB_SNAP_EPS_PX) {
      hs.x = targetX;
      hs.y = targetY;
    }
  }
  return hs;
}

function updateGlowSettleSmooth(
  glowSettleRef: MutableRefObject<number>,
  nowMs: number,
  prevFramePaintMs: number | null,
  atTarget: boolean,
  waveActive: boolean,
  hubCellSinceMs: number,
  snapAt: number[]
): number {
  let settleTarget = 0;
  if (waveActive) {
    /** Brightest while each line is early in its travel (`1 - t`); arms still staggered count as dim prep. */
    const armed = 0.4;
    let sum = 0;
    for (let i = 0; i < ARM_COUNT; i++) {
      if (nowMs < snapAt[i]) {
        sum += armed;
        continue;
      }
      const tRaw = (nowMs - snapAt[i]) / CONNECTION_DURATION_MS;
      const t = Math.min(1, Math.max(0, tRaw));
      const te = easeOutCubic(t);
      sum += 1 - te;
    }
    settleTarget = sum / ARM_COUNT;
  } else if (atTarget) {
    const dwell = nowMs - hubCellSinceMs;
    const dwell01 = easeOutCubic(Math.min(1, Math.max(0, dwell / GLOW_SETTLE_RAMP_MS)));
    /** Keep idle calmer than connection-wave peaks. */
    settleTarget = dwell01 * 0.62;
  }
  const dtMs = prevFramePaintMs === null ? 16 : Math.min(100, Math.max(0, nowMs - prevFramePaintMs));
  const g = glowSettleRef.current;
  const tauUp = waveActive ? GLOW_ATTACH_TAU_MS : GLOW_SMOOTH_TAU_UP_MS;
  const tauDown = waveActive ? GLOW_ATTACH_TAU_MS : GLOW_SMOOTH_TAU_DOWN_MS;
  const tau = settleTarget > g ? tauUp : tauDown;
  const k = 1 - Math.exp(-dtMs / tau);
  glowSettleRef.current += (settleTarget - glowSettleRef.current) * k;
  return glowSettleRef.current;
}

function computeConvergeBloomWaveProgress(snapAt: number[], nowMs: number): { meanProgress: number; leadRaw: number } {
  let sumT = 0;
  let leadRaw = 0;
  for (let i = 0; i < ARM_COUNT; i++) {
    if (nowMs < snapAt[i]) continue;
    const tRaw = (nowMs - snapAt[i]) / CONNECTION_DURATION_MS;
    const tClamped = Math.min(1, Math.max(0, tRaw));
    if (tClamped > leadRaw) leadRaw = tClamped;
    const t = easeOutCubic(tClamped);
    sumT += t;
  }
  return { meanProgress: sumT / ARM_COUNT, leadRaw };
}

function smoothConvergeBloomGate(
  gateRef: MutableRefObject<number>,
  dtMs: number,
  waveActive: boolean,
  bloomPrimed: boolean
): void {
  const g = gateRef.current;
  const closing = !waveActive || !bloomPrimed;
  if (closing) {
    const kc = 1 - Math.exp(-dtMs / CONVERGE_BLOOM_GATE_CLOSE_TAU_MS);
    gateRef.current += (0 - g) * kc;
    return;
  }
  const ko = 1 - Math.exp(-dtMs / CONVERGE_BLOOM_GATE_OPEN_TAU_MS);
  gateRef.current += (1 - gateRef.current) * ko;
}

function updateConvergeBloomSmooth(
  convergeBloomRef: MutableRefObject<number>,
  convergeBloomGateRef: MutableRefObject<number>,
  snapAt: number[],
  nowMs: number,
  waveActive: boolean,
  prevFramePaintMs: number | null
): number {
  const dtMs = prevFramePaintMs === null ? 16 : Math.min(100, Math.max(0, nowMs - prevFramePaintMs));

  let meanProgress = 0;
  let leadRaw = 0;
  if (waveActive) {
    const stats = computeConvergeBloomWaveProgress(snapAt, nowMs);
    meanProgress = stats.meanProgress;
    leadRaw = stats.leadRaw;
  }

  const bloomPrimed = waveActive && leadRaw >= CONVERGE_BLOOM_LEAD_START;
  smoothConvergeBloomGate(convergeBloomGateRef, dtMs, waveActive, bloomPrimed);

  const rawTarget = bloomPrimed ? meanProgress * convergeBloomGateRef.current : 0;

  const tau = rawTarget > convergeBloomRef.current ? CONVERGE_BLOOM_ATTACK_TAU_MS : CONVERGE_BLOOM_RELEASE_TAU_MS;
  const kb = 1 - Math.exp(-dtMs / tau);
  convergeBloomRef.current += (rawTarget - convergeBloomRef.current) * kb;
  return convergeBloomRef.current;
}

function paintHubLayer(
  ctx: CanvasRenderingContext2D,
  c: NetColors,
  nowMs: number,
  hubDrawX: number,
  hubDrawY: number,
  echoLayers: EchoLayer[],
  glowSettle01: number,
  convergeBloom01: number,
  hubScale: number,
  outerRingMul: number,
  motion: HubMotionAccent,
  light: boolean,
  cellSpan: number,
  waveActive: boolean
): void {
  drawHubGlow(
    ctx,
    c,
    hubDrawX,
    hubDrawY,
    glowSettle01,
    convergeBloom01,
    echoLayers,
    nowMs,
    hubScale,
    motion,
    outerRingMul,
    cellSpan,
    light
  );
  drawHub(
    ctx,
    c,
    hubDrawX,
    hubDrawY,
    hubScale,
    outerRingMul,
    motion,
    light,
    nowMs,
    glowSettle01,
    convergeBloom01,
    waveActive
  );
}

function pushEchoAndSetupWave(
  nowMs: number,
  prev: { hubI: number; hubJ: number },
  hubI: number,
  hubJ: number,
  hubAnchorX: number,
  hubAnchorY: number,
  mouse: { x: number; y: number },
  w: number,
  h: number,
  cellW: number,
  cellH: number,
  armSnapAtRef: number[],
  armSlotsRef: MutableRefObject<GridCell[]>,
  frozenHubRef: MutableRefObject<{ x: number; y: number }>,
  frozenOuterRef: MutableRefObject<{ x: number; y: number }[]>,
  echoLayersRef: MutableRefObject<EchoLayer[]>
): void {
  const snapOut = frozenOuterRef.current.map((o) => ({ x: o.x, y: o.y }));
  const snapHub = { ...frozenHubRef.current };
  const snapSnap = [...armSnapAtRef];
  const prevWave = waveAnimating(armSnapAtRef, nowMs);
  const prevHubLive = {
    x: (prev.hubI + 0.5) * cellW,
    y: (prev.hubJ + 0.5) * cellH,
  };
  const tips = computeTipSnapshot(snapOut, snapHub, snapSnap, nowMs, prevWave, prevHubLive);
  echoLayersRef.current.push({
    outer: snapOut,
    tips,
    startMs: nowMs,
    hubX: snapHub.x,
    hubY: snapHub.y,
  });
  setupWave(
    armSnapAtRef,
    armSlotsRef,
    frozenHubRef,
    frozenOuterRef,
    hubI,
    hubJ,
    hubAnchorX,
    hubAnchorY,
    mouse,
    w,
    h,
    cellW,
    cellH,
    nowMs
  );
}

function prepareCanvasFrame(canvas: HTMLCanvasElement): { ctx: CanvasRenderingContext2D; w: number; h: number } | null {
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  const rect = canvas.getBoundingClientRect();
  const w = rect.width;
  const h = rect.height;
  if (w < 2 || h < 2) return null;
  const rawDpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
  const dpr = Math.min(rawDpr, MAX_CANVAS_DPR);
  const bw = Math.floor(w * dpr);
  const bh = Math.floor(h * dpr);
  if (canvas.width !== bw || canvas.height !== bh) {
    canvas.width = bw;
    canvas.height = bh;
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  return { ctx, w, h };
}

function paintNetwork(
  canvas: HTMLCanvasElement,
  light: boolean,
  mouse: { x: number; y: number },
  pointerInside: boolean,
  armSnapAtRef: number[],
  armSlotsRef: MutableRefObject<GridCell[]>,
  frozenHubRef: MutableRefObject<{ x: number; y: number }>,
  frozenOuterRef: MutableRefObject<{ x: number; y: number }[]>,
  lastHubRef: MutableRefObject<{ hubI: number; hubJ: number }>,
  echoLayersRef: MutableRefObject<EchoLayer[]>,
  hubSmoothRef: MutableRefObject<{ x: number; y: number }>,
  lastPaintMsRef: MutableRefObject<number | null>,
  hubCellSinceMsRef: MutableRefObject<number>,
  glowSettleRef: MutableRefObject<number>,
  convergeBloomRef: MutableRefObject<number>,
  convergeBloomGateRef: MutableRefObject<number>,
  smoothPointerSpeedRef: MutableRefObject<number>,
  hubScaleRenderedRef: MutableRefObject<number>,
  hubOuterRingMulRef: MutableRefObject<number>,
  velSmoothRef: MutableRefObject<{ x: number; y: number }>,
  chromaStrengthRef: MutableRefObject<number>,
  lastPointerSampleRef: MutableRefObject<{ x: number; y: number; ms: number } | null>,
  nowMs: number,
  skipInitialCollapse: boolean
): void {
  const frame = prepareCanvasFrame(canvas);
  if (!frame) return;
  const { ctx, w, h } = frame;

  const cellW = w / COLS;
  const cellH = h / ROWS;

  const { hubI, hubJ } = hubCellFromMouse(mouse, cellW, cellH, pointerInside);
  const hubAnchorX = (hubI + 0.5) * cellW;
  const hubAnchorY = (hubJ + 0.5) * cellH;

  const prev = lastHubRef.current;
  const hubChanged = !skipInitialCollapse && prev.hubI !== -99 && (hubI !== prev.hubI || hubJ !== prev.hubJ);

  if (hubChanged) {
    hubCellSinceMsRef.current = nowMs;
    pushEchoAndSetupWave(
      nowMs,
      prev,
      hubI,
      hubJ,
      hubAnchorX,
      hubAnchorY,
      mouse,
      w,
      h,
      cellW,
      cellH,
      armSnapAtRef,
      armSlotsRef,
      frozenHubRef,
      frozenOuterRef,
      echoLayersRef
    );
  } else if (prev.hubI === -99) {
    hubCellSinceMsRef.current = nowMs;
  }

  lastHubRef.current = { hubI, hubJ };

  const waveActive = waveAnimating(armSnapAtRef, nowMs);
  const targetX = waveActive ? frozenHubRef.current.x : hubAnchorX;
  const targetY = waveActive ? frozenHubRef.current.y : hubAnchorY;
  const prevFrameMs = lastPaintMsRef.current;
  const { x: hubDrawX, y: hubDrawY } = smoothHubToward(hubSmoothRef, lastPaintMsRef, targetX, targetY, nowMs);
  const atTarget = Math.hypot(hubDrawX - targetX, hubDrawY - targetY) <= GLOW_AT_TARGET_PX;
  const glowSettle01 = updateGlowSettleSmooth(
    glowSettleRef,
    nowMs,
    prevFrameMs,
    atTarget,
    waveActive,
    hubCellSinceMsRef.current,
    armSnapAtRef
  );
  const convergeBloom01 = updateConvergeBloomSmooth(
    convergeBloomRef,
    convergeBloomGateRef,
    armSnapAtRef,
    nowMs,
    waveActive,
    prevFrameMs
  );

  const { hubScale, outerRingMul, motion } = updateHubPointerVisuals(
    smoothPointerSpeedRef,
    hubScaleRenderedRef,
    hubOuterRingMulRef,
    velSmoothRef,
    chromaStrengthRef,
    lastPointerSampleRef,
    mouse,
    pointerInside,
    nowMs,
    prevFrameMs
  );

  const colors = themeColors(light);
  drawFieldDots(ctx, colors, COLS, ROWS, cellW, cellH, hubI, hubJ, armSlotsRef.current);

  const echoKept: EchoLayer[] = [];
  for (const layer of echoLayersRef.current) {
    const age = nowMs - layer.startMs;
    if (age >= ECHO_FADE_MS) continue;
    const t = age / ECHO_FADE_MS;
    const alpha = (1 - t) * (1 - t);
    drawEchoConnectionLines(ctx, colors, layer.outer, layer.tips, alpha);
    echoKept.push(layer);
  }
  echoLayersRef.current = echoKept;

  drawConnectionLines(
    ctx,
    colors,
    frozenOuterRef.current,
    armSnapAtRef,
    frozenHubRef.current,
    { x: hubDrawX, y: hubDrawY },
    nowMs,
    waveActive
  );

  paintHubLayer(
    ctx,
    colors,
    nowMs,
    hubDrawX,
    hubDrawY,
    echoLayersRef.current,
    glowSettle01,
    convergeBloom01,
    hubScale,
    outerRingMul,
    motion,
    light,
    Math.min(cellW, cellH),
    waveActive
  );

  drawRingDots(ctx, colors, frozenOuterRef.current, armSnapAtRef, nowMs, waveActive);
}

function initializeWaveAtCenter(
  armSnapAtRef: number[],
  armSlotsRef: MutableRefObject<GridCell[]>,
  frozenHubRef: MutableRefObject<{ x: number; y: number }>,
  frozenOuterRef: MutableRefObject<{ x: number; y: number }[]>,
  mouse: { x: number; y: number },
  w: number,
  h: number,
  nowMs: number
): void {
  const cellW = w / COLS;
  const cellH = h / ROWS;
  const hubI = Math.floor(COLS / 2);
  const hubJ = Math.floor(ROWS / 2);
  const hubCssX = (hubI + 0.5) * cellW;
  const hubCssY = (hubJ + 0.5) * cellH;
  setupWave(
    armSnapAtRef,
    armSlotsRef,
    frozenHubRef,
    frozenOuterRef,
    hubI,
    hubJ,
    hubCssX,
    hubCssY,
    mouse,
    w,
    h,
    cellW,
    cellH,
    nowMs
  );
}

export function NetworkGraphic() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: 0, y: 0 });
  const insideRef = useRef(false);
  const frozenHubRef = useRef({ x: 0, y: 0 });
  const frozenOuterRef = useRef<{ x: number; y: number }[]>(Array.from({ length: ARM_COUNT }, () => ({ x: 0, y: 0 })));
  const armSnapAtRef = useRef<number[]>(Array.from({ length: ARM_COUNT }, () => 0));
  const armSlotsRef = useRef<GridCell[]>(Array.from({ length: ARM_COUNT }, () => ({ gi: 0, gj: 0 })));
  const lastHubRef = useRef({ hubI: -99, hubJ: -99 });
  const echoLayersRef = useRef<EchoLayer[]>([]);
  const hubSmoothRef = useRef({ x: 0, y: 0 });
  const lastPaintMsRef = useRef<number | null>(null);
  const hubCellSinceMsRef = useRef(0);
  const glowSettleRef = useRef(0);
  const convergeBloomRef = useRef(0);
  const convergeBloomGateRef = useRef(0);
  const smoothPointerSpeedRef = useRef(0);
  const hubScaleRenderedRef = useRef(1);
  const hubOuterRingMulRef = useRef(1);
  const velSmoothRef = useRef({ x: 0, y: 0 });
  const chromaStrengthRef = useRef(0);
  const lastPointerSampleRef = useRef<{ x: number; y: number; ms: number } | null>(null);
  const armsInitializedRef = useRef(false);
  const firstPaintAfterInitRef = useRef(true);
  const rafRef = useRef(0);
  const visibleRef = useRef(true);
  const { resolvedTheme } = useTheme();

  const paint = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    if (w < 2 || h < 2) return;

    if (!armsInitializedRef.current) {
      initializeWaveAtCenter(
        armSnapAtRef.current,
        armSlotsRef,
        frozenHubRef,
        frozenOuterRef,
        mouseRef.current,
        w,
        h,
        performance.now()
      );
      armsInitializedRef.current = true;
      lastHubRef.current = { hubI: -99, hubJ: -99 };
      firstPaintAfterInitRef.current = true;
    }

    const nowMs = performance.now();
    const skipCollapse = firstPaintAfterInitRef.current;
    if (firstPaintAfterInitRef.current) {
      firstPaintAfterInitRef.current = false;
    }

    paintNetwork(
      canvas,
      resolvedTheme === "light",
      mouseRef.current,
      insideRef.current,
      armSnapAtRef.current,
      armSlotsRef,
      frozenHubRef,
      frozenOuterRef,
      lastHubRef,
      echoLayersRef,
      hubSmoothRef,
      lastPaintMsRef,
      hubCellSinceMsRef,
      glowSettleRef,
      convergeBloomRef,
      convergeBloomGateRef,
      smoothPointerSpeedRef,
      hubScaleRenderedRef,
      hubOuterRingMulRef,
      velSmoothRef,
      chromaStrengthRef,
      lastPointerSampleRef,
      nowMs,
      skipCollapse
    );
  }, [resolvedTheme]);

  const scheduleLoop = useCallback(() => {
    if (rafRef.current !== 0) return;
    const loop = () => {
      paint();
      const canvas = canvasRef.current;
      if (!canvas) {
        rafRef.current = 0;
        return;
      }
      const needFrames = visibleRef.current;

      if (needFrames) {
        rafRef.current = requestAnimationFrame(loop);
      } else {
        rafRef.current = 0;
      }
    };
    rafRef.current = requestAnimationFrame(loop);
  }, [paint]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        const e = entries[0];
        if (!e) return;
        visibleRef.current = e.isIntersecting;
        if (e.isIntersecting) scheduleLoop();
      },
      { threshold: 0, rootMargin: "80px 0px 80px 0px" }
    );
    io.observe(el);
    const ro = new ResizeObserver(() => {
      const rect = el.getBoundingClientRect();
      if (rect.width < 2 || rect.height < 2) return;
      armsInitializedRef.current = false;
      firstPaintAfterInitRef.current = true;
      lastHubRef.current = { hubI: -99, hubJ: -99 };
      echoLayersRef.current = [];
      lastPaintMsRef.current = null;
      glowSettleRef.current = 0;
      smoothPointerSpeedRef.current = 0;
      hubScaleRenderedRef.current = 1;
      hubOuterRingMulRef.current = 1;
      velSmoothRef.current = { x: 0, y: 0 };
      chromaStrengthRef.current = 0;
      lastPointerSampleRef.current = null;
      armSnapAtRef.current.fill(0);
      paint();
      scheduleLoop();
    });
    ro.observe(el);
    return () => {
      io.disconnect();
      ro.disconnect();
    };
  }, [paint, scheduleLoop]);

  useEffect(() => {
    const onPointerMove = (e: PointerEvent) => {
      const el = containerRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
      document.body.style.cursor = inside ? "none" : "";
      insideRef.current = inside;
      mouseRef.current = {
        x: Math.max(0, Math.min(r.width, e.clientX - r.left)),
        y: Math.max(0, Math.min(r.height, e.clientY - r.top)),
      };
      scheduleLoop();
    };
    const clearCursor = () => {
      document.body.style.cursor = "";
    };
    document.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("blur", clearCursor);
    return () => {
      document.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("blur", clearCursor);
      clearCursor();
    };
  }, [scheduleLoop]);

  useEffect(() => {
    scheduleLoop();
  }, [scheduleLoop]);

  useEffect(() => {
    return () => {
      if (rafRef.current !== 0) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative h-full min-h-0 w-full"
      style={{
        WebkitMaskImage:
          "radial-gradient(ellipse 108% 128% at 0% 50%, transparent 0%, black 52%), linear-gradient(to left, black 0%, black 52%, transparent 96%)",
        WebkitMaskComposite: "source-in",
        maskImage:
          "radial-gradient(ellipse 108% 128% at 0% 50%, transparent 0%, black 52%), linear-gradient(to left, black 0%, black 52%, transparent 96%)",
        maskComposite: "intersect",
      }}
      role="presentation"
    >
      <canvas ref={canvasRef} className="block size-full min-h-[min(100dvh,100vh)]" aria-hidden />
    </div>
  );
}

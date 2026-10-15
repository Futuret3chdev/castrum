export const ENEMY_KINDS = [
  "raider",
  "gaul",
  "dacian",
  "cataphract",
  "berserker",
  "ram",
  "elephant",
  "warlord",
] as const;
export type EnemyKind = (typeof ENEMY_KINDS)[number];

export const TOWER_KINDS = [
  "scorpio",
  "sagittarii",
  "cohort",
  "ballista",
  "naphtha",
  "onager",
] as const;
export type TowerKind = (typeof TOWER_KINDS)[number];

export type DamageType = "pierce" | "melee" | "siege" | "fire";
export type TargetMode = "first" | "last" | "near" | "strong";

export interface EnemyDef {
  name: string;
  blurb: string;
  hp: number;
  speed: number;
  gold: number;
  leak: number;
  armor: number;
  tags: Array<"armored" | "siege" | "beast" | "cavalry" | "boss">;
  head: number;
  bob: number;
  hz: number;
}

export const ENEMIES: Record<EnemyKind, EnemyDef> = {
  raider: {
    name: "Chatti raider",
    blurb: "Light, quick, and never alone.",
    hp: 32,
    speed: 1.95,
    gold: 7,
    leak: 1,
    armor: 0,
    tags: [],
    head: 1.35,
    bob: 0.07,
    hz: 11,
  },
  gaul: {
    name: "Arverni sword",
    blurb: "Shield high. He soaks the first volley.",
    hp: 96,
    speed: 1.62,
    gold: 11,
    leak: 1,
    armor: 2,
    tags: [],
    head: 1.4,
    bob: 0.06,
    hz: 9,
  },
  dacian: {
    name: "Falxman",
    blurb: "Scale and a hooked blade. Arrows disappoint him.",
    hp: 188,
    speed: 1.4,
    gold: 16,
    leak: 2,
    armor: 6,
    tags: ["armored"],
    head: 1.45,
    bob: 0.055,
    hz: 8,
  },
  cataphract: {
    name: "Cataphract",
    blurb: "Mailed horse. If he reaches the gate, he is already gone.",
    hp: 155,
    speed: 2.45,
    gold: 16,
    leak: 2,
    armor: 4,
    tags: ["armored", "cavalry"],
    head: 1.7,
    bob: 0.05,
    hz: 8,
  },
  berserker: {
    name: "Bare-sark",
    blurb: "He runs faster once the blood is up.",
    hp: 380,
    speed: 1.7,
    gold: 26,
    leak: 3,
    armor: 1,
    tags: [],
    head: 1.65,
    bob: 0.08,
    hz: 10,
  },
  ram: {
    name: "Siege ram",
    blurb: "Hide, timber, and a bronze snout. Burn it. Stone it.",
    hp: 680,
    speed: 0.92,
    gold: 24,
    leak: 4,
    armor: 2,
    tags: ["siege"],
    head: 1.25,
    bob: 0.02,
    hz: 4,
  },
  elephant: {
    name: "War elephant",
    blurb: "The howdah shrugs off darts. Bolts and stones do not.",
    hp: 1200,
    speed: 1.02,
    gold: 42,
    leak: 5,
    armor: 3,
    tags: ["beast", "siege"],
    head: 2.05,
    bob: 0.04,
    hz: 4.5,
  },
  warlord: {
    name: "King of the host",
    blurb: "The banner at the ford. Break him or lose the gate.",
    hp: 3400,
    speed: 1.15,
    gold: 180,
    leak: 8,
    armor: 7,
    tags: ["armored", "boss"],
    head: 1.9,
    bob: 0.05,
    hz: 6,
  },
};

export interface TowerDef {
  name: string;
  latin: string;
  blurb: string;
  cost: number;
  damage: number;
  range: number;
  rate: number;
  dtype: DamageType;
  shot: "home" | "line" | "arc";
  speed: number;
  splash: number;
  slow: number;
  slowM: number;
  burn: number;
  arc: number;
  hotkey: string;
  pennant: string;
}

export const TOWERS: Record<TowerKind, TowerDef> = {
  scorpio: {
    name: "Scorpio",
    latin: "Bolt thrower",
    blurb: "Fast iron. The spine of a thin line.",
    cost: 80,
    damage: 12,
    range: 5.5,
    rate: 1.85,
    dtype: "pierce",
    shot: "home",
    speed: 13,
    splash: 0,
    slow: 0,
    slowM: 1,
    burn: 0,
    arc: 0,
    hotkey: "1",
    pennant: "#c4a15a",
  },
  sagittarii: {
    name: "Sagittarii",
    latin: "Archer tower",
    blurb: "Two Syrian bows. Cheap, and they do not blink.",
    cost: 110,
    damage: 7,
    range: 6.3,
    rate: 1.75,
    dtype: "pierce",
    shot: "home",
    speed: 12,
    splash: 0,
    slow: 0,
    slowM: 1,
    burn: 0,
    arc: 0.35,
    hotkey: "2",
    pennant: "#8ea36a",
  },
  cohort: {
    name: "Cohort",
    latin: "Legionaries",
    blurb: "Pila at arm's length. Whatever they hit, slows.",
    cost: 120,
    damage: 22,
    range: 3.15,
    rate: 1.05,
    dtype: "melee",
    shot: "home",
    speed: 11,
    splash: 0,
    slow: 1.6,
    slowM: 0.6,
    burn: 0,
    arc: 0.2,
    hotkey: "3",
    pennant: "#9e2d2a",
  },
  ballista: {
    name: "Ballista",
    latin: "Siege bow",
    blurb: "A cruel bolt for elephants, rams, and kings.",
    cost: 180,
    damage: 64,
    range: 8.2,
    rate: 0.5,
    dtype: "pierce",
    shot: "line",
    speed: 16,
    splash: 0.45,
    slow: 0,
    slowM: 1,
    burn: 0,
    arc: 0,
    hotkey: "4",
    pennant: "#e3c16e",
  },
  naphtha: {
    name: "Naphtha",
    latin: "Oil cauldron",
    blurb: "Fire on the road. Timber hates it.",
    cost: 170,
    damage: 12,
    range: 4.8,
    rate: 0.58,
    dtype: "fire",
    shot: "arc",
    speed: 7,
    splash: 1.15,
    slow: 0,
    slowM: 1,
    burn: 3.4,
    arc: 2.1,
    hotkey: "5",
    pennant: "#e07a32",
  },
  onager: {
    name: "Onager",
    latin: "Wild ass",
    blurb: "Stones into a crowd. Armor and sheds both crack.",
    cost: 210,
    damage: 44,
    range: 6.8,
    rate: 0.4,
    dtype: "siege",
    shot: "arc",
    speed: 8,
    splash: 1.6,
    slow: 0.4,
    slowM: 0.85,
    burn: 0,
    arc: 2.7,
    hotkey: "6",
    pennant: "#8aa0ad",
  },
};

export interface TowerStats {
  damage: number;
  range: number;
  rate: number;
  splash: number;
  slow: number;
  slowM: number;
  burn: number;
  pierce: number;
  twin: boolean;
}

export function towerStats(kind: TowerKind, level: number): TowerStats {
  const b = TOWERS[kind];
  const dmgMul = level === 1 ? 1 : level === 2 ? 1.48 : 1.48 * 1.38;
  const rangeMul = level === 1 ? 1 : level === 2 ? 1.12 : 1.22;
  let rate = b.rate;
  if (kind === "scorpio" && level >= 3) rate *= 1.34;
  return {
    damage: b.damage * dmgMul,
    range: b.range * rangeMul,
    rate,
    splash: b.splash * (kind === "onager" && level >= 3 ? 1.28 : 1),
    slow: kind === "cohort" && level >= 3 ? b.slow + 0.7 : b.slow,
    slowM: kind === "cohort" && level >= 3 ? 0.45 : b.slowM,
    burn: kind === "naphtha" && level >= 3 ? b.burn * 1.45 : b.burn,
    pierce: kind === "ballista" && level >= 3 ? 2 : 1,
    twin: kind === "sagittarii" && level >= 3,
  };
}

export function upgradeCost(kind: TowerKind, level: number): number | null {
  if (level >= 3) return null;
  const base = TOWERS[kind].cost;
  return Math.round(base * (level === 1 ? 0.9 : 1.3));
}

export function sellRefund(spent: number): number {
  return Math.round(spent * 0.6);
}

export interface MasonryTier {
  name: string;
  blurb: string;
  cost: number;
  hp: number;
}

export const MASONRY: MasonryTier[] = [
  { name: "Bare terrace", blurb: "Packed earth and a command tent.", cost: 0, hp: 0 },
  { name: "Palisade", blurb: "Stake the vallum. The gate gains heart.", cost: 55, hp: 6 },
  { name: "Stone curtain", blurb: "Ashlar. The last stretch of road turns to mud.", cost: 120, hp: 8 },
  { name: "Gatehouse", blurb: "Hung gates. A breach costs less blood.", cost: 200, hp: 10 },
  { name: "Principia", blurb: "The aquila rises. Every engine hits harder.", cost: 280, hp: 12 },
];

export const START_GOLD = 100;
export const START_FORT = 24;
export const WAVE_COUNT = 15;

export interface WaveGroup {
  kind: EnemyKind;
  count: number;
  interval: number;
  delay: number;
}

export interface WaveDef {
  name: string;
  blurb: string;
  groups: WaveGroup[];
  hpScale: number;
  speedScale: number;
}

const SCRIPTED: WaveDef[] = [
  {
    name: "First blood",
    blurb: "Raiders test the ford.",
    groups: [{ kind: "raider", count: 8, interval: 1.5, delay: 0.5 }],
    hpScale: 1,
    speedScale: 1,
  },
  {
    name: "The Gauls answer",
    blurb: "Shields in the reeds.",
    groups: [
      { kind: "raider", count: 6, interval: 1.2, delay: 0.3 },
      { kind: "gaul", count: 5, interval: 1.55, delay: 2.2 },
    ],
    hpScale: 1,
    speedScale: 1,
  },
  {
    name: "Shield wall",
    blurb: "They come in a line now.",
    groups: [
      { kind: "gaul", count: 10, interval: 1.25, delay: 0.3 },
      { kind: "raider", count: 6, interval: 0.7, delay: 6 },
    ],
    hpScale: 1,
    speedScale: 1,
  },
  {
    name: "Iron of Dacia",
    blurb: "Scale shirts. Bring a heavier bow.",
    groups: [
      { kind: "dacian", count: 6, interval: 1.7, delay: 0.4 },
      { kind: "raider", count: 8, interval: 0.85, delay: 1.2 },
    ],
    hpScale: 1,
    speedScale: 1,
  },
  {
    name: "Bare-sarks",
    blurb: "Two giants, and the small ones under their axes.",
    groups: [
      { kind: "berserker", count: 2, interval: 3.5, delay: 1.2 },
      { kind: "raider", count: 10, interval: 0.7, delay: 0.2 },
      { kind: "gaul", count: 4, interval: 1.4, delay: 4 },
    ],
    hpScale: 1,
    speedScale: 1,
  },
  {
    name: "Mailed horses",
    blurb: "Do not let the cavalry have a clean run.",
    groups: [
      { kind: "cataphract", count: 7, interval: 1.55, delay: 0.4 },
      { kind: "gaul", count: 4, interval: 1.2, delay: 3 },
    ],
    hpScale: 1.05,
    speedScale: 1,
  },
  {
    name: "Rams on the causeway",
    blurb: "Timber on wheels. Oil and stones.",
    groups: [
      { kind: "ram", count: 3, interval: 3.2, delay: 0.6 },
      { kind: "gaul", count: 8, interval: 1.05, delay: 0.3 },
      { kind: "dacian", count: 3, interval: 2, delay: 5 },
    ],
    hpScale: 1.05,
    speedScale: 1,
  },
  {
    name: "Hannibal's shadow",
    blurb: "Elephants. Keep the bolts on the big ones.",
    groups: [
      { kind: "elephant", count: 2, interval: 5, delay: 1 },
      { kind: "raider", count: 12, interval: 0.65, delay: 0.2 },
      { kind: "gaul", count: 4, interval: 1.4, delay: 4 },
    ],
    hpScale: 1.08,
    speedScale: 1,
  },
  {
    name: "A mixed host",
    blurb: "Every kind of trouble at once.",
    groups: [
      { kind: "dacian", count: 6, interval: 1.4, delay: 0.3 },
      { kind: "cataphract", count: 5, interval: 1.5, delay: 2 },
      { kind: "berserker", count: 2, interval: 4, delay: 6 },
    ],
    hpScale: 1.1,
    speedScale: 1,
  },
  {
    name: "Sheds and giants",
    blurb: "The midmorning breach attempt.",
    groups: [
      { kind: "elephant", count: 1, interval: 1, delay: 2 },
      { kind: "ram", count: 3, interval: 2.8, delay: 0.4 },
      { kind: "berserker", count: 2, interval: 3, delay: 3 },
      { kind: "dacian", count: 5, interval: 1.3, delay: 1 },
    ],
    hpScale: 1.12,
    speedScale: 1,
  },
  {
    name: "Swarm at dusk",
    blurb: "Count them later.",
    groups: [
      { kind: "raider", count: 22, interval: 0.38, delay: 0.2 },
      { kind: "gaul", count: 8, interval: 0.9, delay: 2 },
    ],
    hpScale: 1.12,
    speedScale: 1.04,
  },
  {
    name: "The return",
    blurb: "Cataphracts with falxmen in the gaps.",
    groups: [
      { kind: "cataphract", count: 8, interval: 1.25, delay: 0.3 },
      { kind: "dacian", count: 7, interval: 1.35, delay: 1.5 },
    ],
    hpScale: 1.15,
    speedScale: 1.04,
  },
  {
    name: "The elephant line",
    blurb: "Three howdahs. Do not split your stones.",
    groups: [
      { kind: "elephant", count: 3, interval: 4.2, delay: 0.8 },
      { kind: "ram", count: 2, interval: 3, delay: 2 },
      { kind: "gaul", count: 8, interval: 0.8, delay: 0.2 },
    ],
    hpScale: 1.18,
    speedScale: 1,
  },
  {
    name: "Siege of the gate",
    blurb: "They mean the doors this time.",
    groups: [
      { kind: "ram", count: 4, interval: 2.4, delay: 0.3 },
      { kind: "berserker", count: 3, interval: 2.5, delay: 1.5 },
      { kind: "dacian", count: 8, interval: 1, delay: 0.4 },
      { kind: "cataphract", count: 4, interval: 1.6, delay: 6 },
    ],
    hpScale: 1.2,
    speedScale: 1.05,
  },
  {
    name: "The king",
    blurb: "His banner, an elephant, and everyone who is left.",
    groups: [
      { kind: "warlord", count: 1, interval: 1, delay: 8 },
      { kind: "elephant", count: 1, interval: 1, delay: 2 },
      { kind: "dacian", count: 8, interval: 1.1, delay: 0.4 },
      { kind: "berserker", count: 2, interval: 3, delay: 4 },
      { kind: "raider", count: 14, interval: 0.45, delay: 0.2 },
      { kind: "ram", count: 2, interval: 4, delay: 5 },
    ],
    hpScale: 1.22,
    speedScale: 1.05,
  },
];

export function makeWave(n: number): WaveDef {
  if (n >= 1 && n <= SCRIPTED.length) return SCRIPTED[n - 1]!;
  const src = SCRIPTED[(n - 1) % SCRIPTED.length]!;
  const night = n - WAVE_COUNT;
  const hpScale = 1.22 + night * 0.16;
  return {
    name: `Night watch ${night}`,
    blurb: "They did not go home.",
    hpScale,
    speedScale: Math.min(1.25, 1.05 + night * 0.015),
    groups: src.groups.map((g) => ({
      ...g,
      count: Math.max(1, Math.round(g.count * (1 + night * 0.14))),
      interval: Math.max(0.32, g.interval * (1 - Math.min(0.25, night * 0.02))),
    })),
  };
}

export function wavePreview(n: number): { kind: EnemyKind; count: number }[] {
  const w = makeWave(n);
  const map = new Map<EnemyKind, number>();
  for (const g of w.groups) map.set(g.kind, (map.get(g.kind) ?? 0) + g.count);
  return [...map.entries()].map(([kind, count]) => ({ kind, count }));
}

export interface Sample {
  x: number;
  z: number;
  tx: number;
  tz: number;
  nx: number;
  nz: number;
}

export interface Path {
  total: number;
  sample: (d: number) => Sample;
}

export function makePath(pts: { x: number; z: number }[]): Path {
  const seg = [0];
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1]!;
    const b = pts[i]!;
    seg.push(seg[i - 1]! + Math.hypot(b.x - a.x, b.z - a.z));
  }
  const total = seg[seg.length - 1]!;
  return {
    total,
    sample(d: number): Sample {
      const dist = Math.max(0, Math.min(total, d));
      let i = 1;
      while (i < seg.length - 1 && seg[i]! < dist) i++;
      const i1 = Math.min(Math.max(i, 1), pts.length - 1);
      const i0 = i1 - 1;
      const span = seg[i1]! - seg[i0]! || 1;
      const t = (dist - seg[i0]!) / span;
      const a = pts[i0]!;
      const b = pts[i1]!;
      const dx = b.x - a.x;
      const dz = b.z - a.z;
      const len = Math.hypot(dx, dz) || 1;
      return {
        x: a.x + dx * t,
        z: a.z + dz * t,
        tx: dx / len,
        tz: dz / len,
        nx: -dz / len,
        nz: dx / len,
      };
    },
  };
}

export interface Pad {
  x: number;
  z: number;
}

export interface Layout {
  path: Path;
  pads: Pad[];
  fort: { x: number; z: number; tx: number; tz: number };
  entry: Sample;
}

const PATH_PTS = [
  { x: -12, z: -7.2 },
  { x: -6.4, z: -6.4 },
  { x: -0.8, z: -5.3 },
  { x: 5.1, z: -6.5 },
  { x: 9.7, z: -3.3 },
  { x: 8.3, z: 0.5 },
  { x: 2.8, z: 1.6 },
  { x: -2.6, z: 0.35 },
  { x: -6.7, z: 2.9 },
  { x: -4.8, z: 6.1 },
  { x: 0.4, z: 7.3 },
  { x: 5.6, z: 8.05 },
  { x: 9.3, z: 8.7 },
];

export function distToPath(path: Path, x: number, z: number): number {
  let min = Infinity;
  for (let i = 0; i <= 40; i++) {
    const s = path.sample((path.total * i) / 40);
    const d = Math.hypot(s.x - x, s.z - z);
    if (d < min) min = d;
  }
  return min;
}

export function makeLayout(): Layout {
  const path = makePath(PATH_PTS);
  const fracs = [0.08, 0.17, 0.27, 0.37, 0.47, 0.57, 0.66, 0.75, 0.84, 0.93];
  const pads: Pad[] = fracs.map((f, i) => {
    const s = path.sample(path.total * f);
    let side = i % 2 === 0 ? 1 : -1;
    let x = s.x + s.nx * side * 2.15;
    let z = s.z + s.nz * side * 2.15;
    if (x < -10.4) {
      side *= -1;
      x = s.x + s.nx * side * 2.15;
      z = s.z + s.nz * side * 2.15;
    }
    return { x, z };
  });
  for (let i = 0; i < pads.length; i++) {
    for (let j = 0; j < i; j++) {
      const a = pads[i]!;
      const b = pads[j]!;
      const dx = a.x - b.x;
      const dz = a.z - b.z;
      const d = Math.hypot(dx, dz) || 1;
      if (d < 2.05) {
        a.x += (dx / d) * (2.05 - d);
        a.z += (dz / d) * (2.05 - d);
      }
    }
  }
  const end = path.sample(path.total);
  return {
    path,
    pads,
    fort: { x: end.x, z: end.z, tx: end.tx, tz: end.tz },
    entry: path.sample(0),
  };
}

export const layout = makeLayout();

export function gloriaOf(s: {
  earned: number;
  kills: number;
  cleared: number;
  fort: number;
}): number {
  return Math.round(s.earned + s.kills * 3 + s.cleared * 140 + Math.max(0, s.fort) * 18);
}

export const SAVE_KEY = "castrum-v1";

export interface SaveData {
  version: 1;
  best: number;
  muted: boolean;
  shake: boolean;
}

export function loadSave(): SaveData {
  const blank: SaveData = { version: 1, best: 0, muted: false, shake: true };
  if (typeof localStorage === "undefined") return blank;
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return blank;
    const p = JSON.parse(raw) as Partial<SaveData>;
    return {
      version: 1,
      best: typeof p.best === "number" ? p.best : 0,
      muted: Boolean(p.muted),
      shake: p.shake !== false,
    };
  } catch {
    return blank;
  }
}

export function writeSave(data: SaveData) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  } catch {
    /* private mode */
  }
}

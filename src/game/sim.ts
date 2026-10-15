import {
  ENEMIES,
  MASONRY,
  START_FORT,
  START_GOLD,
  TOWERS,
  WAVE_COUNT,
  gloriaOf,
  layout,
  makeWave,
  sellRefund,
  towerStats,
  upgradeCost,
  type DamageType,
  type EnemyKind,
  type TargetMode,
  type TowerKind,
} from "./balance";

export interface Enemy {
  id: number;
  kind: EnemyKind;
  dist: number;
  hp: number;
  maxHp: number;
  lane: number;
  slowT: number;
  slowM: number;
  alive: boolean;
}

export interface Tower {
  pad: number;
  kind: TowerKind;
  level: number;
  spent: number;
  cd: number;
  mode: TargetMode;
  kills: number;
}

export interface Projectile {
  id: number;
  mode: "home" | "line" | "arc";
  x: number;
  y: number;
  z: number;
  vx: number;
  vz: number;
  sx: number;
  sz: number;
  tx: number;
  tz: number;
  age: number;
  dur: number;
  arc: number;
  speed: number;
  dmg: number;
  dtype: DamageType;
  splash: number;
  slow: number;
  slowM: number;
  burn: number;
  pierce: number;
  pad: number;
  targetId: number;
  hit: number[];
  alive: boolean;
  visual: "arrow" | "bolt" | "pilum" | "stone" | "pot";
}

export interface Patch {
  id: number;
  x: number;
  z: number;
  r: number;
  ttl: number;
  max: number;
  dps: number;
  tick: number;
  alive: boolean;
}

export type FxEvent =
  | { type: "shoot"; kind: TowerKind; pad: number }
  | { type: "hit"; x: number; z: number; dmg: number; finisher: boolean }
  | { type: "death"; x: number; z: number; kind: EnemyKind; gold: number }
  | { type: "leak"; dmg: number }
  | { type: "boom"; x: number; z: number; r: number; fire: boolean }
  | { type: "build" }
  | { type: "sell" }
  | { type: "masonry"; level: number }
  | { type: "wave"; name: string; blurb: string }
  | { type: "clear"; wave: number; bounty: number }
  | { type: "boss"; name: string }
  | { type: "victory" }
  | { type: "defeat" }
  | { type: "nope"; text: string };

export interface GameState {
  gold: number;
  earned: number;
  fort: number;
  fortMax: number;
  wave: number;
  cleared: number;
  fighting: boolean;
  kills: number;
  masonry: number;
  endless: boolean;
  outcome: "play" | "victory" | "defeat";
  towers: Tower[];
  enemies: Enemy[];
  projectiles: Projectile[];
  patches: Patch[];
  schedule: { t: number; kind: EnemyKind }[];
  spawnCursor: number;
  waveT: number;
  hpScale: number;
  speedScale: number;
  nextId: number;
  seed: number;
  time: number;
}

export function createState(): GameState {
  return {
    gold: START_GOLD,
    earned: 0,
    fort: START_FORT,
    fortMax: START_FORT,
    wave: 0,
    cleared: 0,
    fighting: false,
    kills: 0,
    masonry: 0,
    endless: false,
    outcome: "play",
    towers: [],
    enemies: [],
    projectiles: [],
    patches: [],
    schedule: [],
    spawnCursor: 0,
    waveT: 0,
    hpScale: 1,
    speedScale: 1,
    nextId: 1,
    seed: 0x9e3779b9,
    time: 0,
  };
}

function rand(state: GameState) {
  state.seed = (Math.imul(state.seed, 1664525) + 1013904223) >>> 0;
  return state.seed / 4294967296;
}

export function enemySpeed(state: GameState, e: Enemy) {
  const def = ENEMIES[e.kind];
  let sp = def.speed * state.speedScale;
  if (e.kind === "berserker" && e.hp < e.maxHp * 0.5) sp *= 1.55;
  if (e.slowT > 0) sp *= e.slowM;
  if (state.masonry >= 2 && e.dist > layout.path.total * 0.8) sp *= 0.82;
  return sp;
}

export function enemyPos(e: { dist: number; lane: number }) {
  const s = layout.path.sample(Math.max(0, Math.min(layout.path.total, e.dist)));
  return {
    x: s.x + s.nx * e.lane,
    z: s.z + s.nz * e.lane,
    tx: s.tx,
    tz: s.tz,
  };
}

function predict(state: GameState, e: Enemy, lead: number) {
  const dist = Math.min(layout.path.total, e.dist + enemySpeed(state, e) * lead);
  return enemyPos({ dist, lane: e.lane });
}

function damageAmount(state: GameState, kind: EnemyKind, raw: number, dtype: DamageType) {
  const def = ENEMIES[kind];
  let d = raw * (state.masonry >= 4 ? 1.12 : 1);
  if (dtype === "pierce") {
    if (def.tags.includes("beast")) d *= 1.15;
    d = Math.max(1, d - def.armor);
  } else if (dtype === "melee") {
    if (def.tags.includes("cavalry")) d *= 1.28;
    d = Math.max(1, d - def.armor * 0.4);
  } else if (dtype === "siege") {
    let m = 1;
    if (def.tags.includes("siege")) m *= 1.6;
    if (def.tags.includes("armored")) m *= 1.32;
    if (def.tags.includes("beast")) m *= 1.28;
    d = Math.max(1, d * m - def.armor * 0.2);
  } else {
    let m = 1;
    if (def.tags.includes("siege")) m *= 1.55;
    if (def.tags.includes("beast")) m *= 1.15;
    d = Math.max(1, d * m);
  }
  if (kind === "elephant" && dtype === "pierce" && raw >= 40) d *= 1.35;
  if (kind === "ram" && dtype === "pierce" && raw >= 40) d *= 1.25;
  return d;
}

function kill(state: GameState, e: Enemy, events: FxEvent[], x: number, z: number, tower?: Tower) {
  if (!e.alive) return;
  e.alive = false;
  e.hp = 0;
  const gold = ENEMIES[e.kind].gold;
  state.gold += gold;
  state.earned += gold;
  state.kills += 1;
  if (tower) tower.kills += 1;
  events.push({ type: "death", x, z, kind: e.kind, gold });
}

function hurt(
  state: GameState,
  e: Enemy,
  raw: number,
  dtype: DamageType,
  events: FxEvent[],
  x: number,
  z: number,
  tower?: Tower,
) {
  if (!e.alive) return;
  const d = damageAmount(state, e.kind, raw, dtype);
  e.hp -= d;
  const finisher = e.hp <= 0;
  events.push({ type: "hit", x, z, dmg: Math.max(1, Math.round(d)), finisher });
  if (finisher) kill(state, e, events, x, z, tower);
}

function splashAt(
  state: GameState,
  x: number,
  z: number,
  r: number,
  raw: number,
  dtype: DamageType,
  events: FxEvent[],
  slow: number,
  slowM: number,
  tower?: Tower,
) {
  const r2 = r * r;
  for (const e of state.enemies) {
    if (!e.alive) continue;
    const p = enemyPos(e);
    const dx = p.x - x;
    const dz = p.z - z;
    if (dx * dx + dz * dz > r2) continue;
    if (slow > 0) {
      e.slowT = Math.max(e.slowT, slow);
      e.slowM = Math.min(e.slowM, slowM);
    }
    hurt(state, e, raw, dtype, events, p.x, p.z, tower);
  }
}

export function placeTower(state: GameState, pad: number, kind: TowerKind): { ok: boolean; text?: string } {
  if (state.outcome !== "play") return { ok: false, text: "The battle is already decided." };
  if (pad < 0 || pad >= layout.pads.length) return { ok: false };
  if (state.towers.some((t) => t.pad === pad)) return { ok: false, text: "That pad is already manned." };
  const cost = TOWERS[kind].cost;
  if (state.gold < cost) return { ok: false, text: "The pay chest is short." };
  state.gold -= cost;
  state.towers.push({
    pad,
    kind,
    level: 1,
    spent: cost,
    cd: 0.15,
    mode: "first",
    kills: 0,
  });
  return { ok: true };
}

export function upgradeTower(state: GameState, pad: number): { ok: boolean; text?: string } {
  const tower = state.towers.find((t) => t.pad === pad);
  if (!tower) return { ok: false };
  const cost = upgradeCost(tower.kind, tower.level);
  if (cost == null) return { ok: false, text: "That engine is at its height." };
  if (state.gold < cost) return { ok: false, text: "The pay chest is short." };
  state.gold -= cost;
  tower.spent += cost;
  tower.level += 1;
  return { ok: true };
}

export function sellTower(state: GameState, pad: number): { ok: boolean; text?: string } {
  const i = state.towers.findIndex((t) => t.pad === pad);
  if (i < 0) return { ok: false };
  const tower = state.towers[i]!;
  const refund = sellRefund(tower.spent);
  state.gold += refund;
  state.towers.splice(i, 1);
  return { ok: true, text: `Dismantled for ${refund} denarii.` };
}

export function cycleMode(state: GameState, pad: number, mode?: TargetMode) {
  const tower = state.towers.find((t) => t.pad === pad);
  if (!tower) return;
  if (mode) {
    tower.mode = mode;
    return;
  }
  const order: TargetMode[] = ["first", "last", "near", "strong"];
  const i = order.indexOf(tower.mode);
  tower.mode = order[(i + 1) % order.length]!;
}

export function buyMasonry(state: GameState): { ok: boolean; text?: string } {
  if (state.outcome !== "play") return { ok: false };
  const next = state.masonry + 1;
  if (next >= MASONRY.length) return { ok: false, text: "The castrum is complete." };
  const tier = MASONRY[next]!;
  if (state.gold < tier.cost) return { ok: false, text: "The pay chest is short." };
  state.gold -= tier.cost;
  state.masonry = next;
  state.fort += tier.hp;
  state.fortMax += tier.hp;
  return { ok: true, text: `${tier.name} raised.` };
}

export function startWave(state: GameState): { ok: boolean; text?: string } {
  if (state.outcome !== "play") return { ok: false };
  if (state.fighting) return { ok: false, text: "A host is already on the road." };
  if (!state.endless && state.wave >= WAVE_COUNT) return { ok: false };
  const next = state.wave + 1;
  const wave = makeWave(next);
  const schedule: { t: number; kind: EnemyKind }[] = [];
  for (const g of wave.groups) {
    for (let i = 0; i < g.count; i++) {
      schedule.push({ t: g.delay + i * g.interval, kind: g.kind });
    }
  }
  schedule.sort((a, b) => a.t - b.t);
  state.wave = next;
  state.schedule = schedule;
  state.spawnCursor = 0;
  state.waveT = 0;
  state.hpScale = wave.hpScale;
  state.speedScale = wave.speedScale;
  state.fighting = true;
  return { ok: true };
}

function applySlowBurn(e: Enemy, slow: number, slowM: number) {
  if (slow <= 0) return;
  e.slowT = Math.max(e.slowT, slow);
  e.slowM = Math.min(e.slowM, slowM);
}

function pickTarget(state: GameState, tower: Tower, range: number) {
  const pad = layout.pads[tower.pad];
  if (!pad) return null;
  let best: { enemy: Enemy; score: number } | null = null;
  for (const enemy of state.enemies) {
    if (!enemy.alive) continue;
    const p = enemyPos(enemy);
    const dist = Math.hypot(p.x - pad.x, p.z - pad.z);
    if (dist > range) continue;
    const score =
      tower.mode === "first"
        ? enemy.dist
        : tower.mode === "last"
          ? -enemy.dist
          : tower.mode === "near"
            ? -dist
            : enemy.hp + enemy.maxHp * 0.01;
    if (!best || score > best.score) best = { enemy, score };
  }
  return best;
}

const VISUAL: Record<TowerKind, Projectile["visual"]> = {
  scorpio: "bolt",
  sagittarii: "arrow",
  cohort: "pilum",
  ballista: "bolt",
  naphtha: "pot",
  onager: "stone",
};

function launch(state: GameState, tower: Tower, enemy: Enemy, twin: number, events: FxEvent[]) {
  const def = TOWERS[tower.kind];
  const stats = towerStats(tower.kind, tower.level);
  const pad = layout.pads[tower.pad];
  if (!pad) return;
  const ox = pad.x + (twin ? 0.22 : -0.04);
  const oz = pad.z + (twin ? -0.12 : 0.06);
  const oy = tower.kind === "onager" ? 1.45 : tower.kind === "naphtha" ? 1.25 : 1.05;
  const here = enemyPos(enemy);
  const flightGuess = Math.max(0.25, Math.hypot(here.x - ox, here.z - oz) / Math.max(1, def.speed));
  const aim = def.shot === "home" ? here : predict(state, enemy, flightGuess);
  events.push({ type: "shoot", kind: tower.kind, pad: tower.pad });
  const shot: Projectile = {
    id: state.nextId++,
    mode: def.shot,
    x: ox,
    y: oy,
    z: oz,
    vx: 0,
    vz: 0,
    sx: ox,
    sz: oz,
    tx: aim.x,
    tz: aim.z,
    age: 0,
    dur: flightGuess,
    arc: def.arc,
    speed: def.speed,
    dmg: stats.damage,
    dtype: def.dtype,
    splash: stats.splash,
    slow: stats.slow,
    slowM: stats.slowM,
    burn: stats.burn,
    pierce: stats.pierce,
    pad: tower.pad,
    targetId: enemy.id,
    hit: [],
    alive: true,
    visual: VISUAL[tower.kind],
  };
  if (def.shot === "line") {
    const dx = aim.x - ox;
    const dz = aim.z - oz;
    const len = Math.hypot(dx, dz) || 1;
    shot.vx = (dx / len) * def.speed;
    shot.vz = (dz / len) * def.speed;
    shot.tx = aim.x + (dx / len) * 0.35;
    shot.tz = aim.z + (dz / len) * 0.35;
  } else if (def.shot === "arc") {
    const led = predict(state, enemy, flightGuess);
    shot.tx = led.x;
    shot.tz = led.z;
    shot.dur = Math.max(0.38, Math.hypot(led.x - ox, led.z - oz) / def.speed);
  }
  state.projectiles.push(shot);
}

export function step(state: GameState, dt: number): FxEvent[] {
  const events: FxEvent[] = [];
  if (state.outcome !== "play") return events;
  state.time += dt;

  if (state.fighting) {
    state.waveT += dt;
    while (state.spawnCursor < state.schedule.length && state.schedule[state.spawnCursor]!.t <= state.waveT) {
      const item = state.schedule[state.spawnCursor]!;
      state.spawnCursor += 1;
      const def = ENEMIES[item.kind];
      const hp = def.hp * state.hpScale;
      state.enemies.push({
        id: state.nextId++,
        kind: item.kind,
        dist: 0,
        hp,
        maxHp: hp,
        lane: (rand(state) - 0.5) * 0.62,
        slowT: 0,
        slowM: 1,
        alive: true,
      });
      if (def.tags.includes("boss")) events.push({ type: "boss", name: def.name });
    }
  }

  for (const e of state.enemies) {
    if (!e.alive) continue;
    if (e.slowT > 0) {
      e.slowT -= dt;
      if (e.slowT <= 0) {
        e.slowT = 0;
        e.slowM = 1;
      }
    }
    e.dist += enemySpeed(state, e) * dt;
    if (e.dist >= layout.path.total) {
      e.alive = false;
      e.dist = layout.path.total;
      const leak = Math.max(1, ENEMIES[e.kind].leak - (state.masonry >= 3 ? 1 : 0));
      state.fort -= leak;
      events.push({ type: "leak", dmg: leak });
    }
  }

  if (state.fort <= 0) {
    state.fort = 0;
    state.outcome = "defeat";
    state.fighting = false;
    events.push({ type: "defeat" });
    cleanup(state);
    return events;
  }

  for (const patch of state.patches) {
    if (!patch.alive) continue;
    patch.ttl -= dt;
    patch.tick -= dt;
    if (patch.ttl <= 0) {
      patch.alive = false;
      continue;
    }
    if (patch.tick <= 0) {
      patch.tick += 0.28;
      splashAt(state, patch.x, patch.z, patch.r, patch.dps * 0.28, "fire", events, 0, 1);
    }
  }

  for (const tower of state.towers) {
    tower.cd -= dt;
    if (tower.cd > 0) continue;
    const stats = towerStats(tower.kind, tower.level);
    const found = pickTarget(state, tower, stats.range);
    if (!found) continue;
    tower.cd = 1 / stats.rate;
    launch(state, tower, found.enemy, 0, events);
    if (stats.twin) launch(state, tower, found.enemy, 1, events);
  }

  for (const p of state.projectiles) {
    if (!p.alive) continue;
    p.age += dt;
    if (p.mode === "arc") {
      const u = Math.min(1, p.age / Math.max(0.05, p.dur));
      p.x = p.sx + (p.tx - p.sx) * u;
      p.z = p.sz + (p.tz - p.sz) * u;
      p.y = 0.45 + Math.sin(u * Math.PI) * p.arc;
      if (u >= 1) {
        p.alive = false;
        const fire = p.visual === "pot";
        events.push({ type: "boom", x: p.tx, z: p.tz, r: p.splash, fire });
        splashAt(
          state,
          p.tx,
          p.tz,
          Math.max(0.45, p.splash),
          p.dmg,
          p.dtype,
          events,
          p.slow,
          p.slowM,
          state.towers.find((t) => t.pad === p.pad),
        );
        if (fire && p.burn > 0) {
          state.patches.push({
            id: state.nextId++,
            x: p.tx,
            z: p.tz,
            r: p.splash,
            ttl: p.burn,
            max: p.burn,
            dps: Math.max(8, p.dmg * 0.85),
            tick: 0,
            alive: true,
          });
        }
      }
      continue;
    }

    if (p.mode === "home") {
      const target = state.enemies.find((e) => e.id === p.targetId && e.alive);
      if (target) {
        const tp = enemyPos(target);
        p.tx = tp.x;
        p.tz = tp.z;
      }
      const dx = p.tx - p.x;
      const dz = p.tz - p.z;
      const dist = Math.hypot(dx, dz);
      const stepLen = p.speed * dt;
      if (dist <= stepLen + 0.18) {
        p.x = p.tx;
        p.z = p.tz;
        p.alive = false;
        const owner = state.towers.find((t) => t.pad === p.pad);
        if (target) {
          applySlowBurn(target, p.slow, p.slowM);
          hurt(state, target, p.dmg, p.dtype, events, p.tx, p.tz, owner);
        } else if (p.splash > 0) {
          splashAt(state, p.tx, p.tz, p.splash, p.dmg * 0.7, p.dtype, events, p.slow, p.slowM, owner);
        }
      } else {
        p.x += (dx / dist) * stepLen;
        p.z += (dz / dist) * stepLen;
        p.y = 0.85 + Math.sin(p.age * 9) * (p.visual === "arrow" ? 0.12 : 0.04);
      }
      if (p.age > 3.2) p.alive = false;
      continue;
    }

    p.x += p.vx * dt;
    p.z += p.vz * dt;
    p.y = 0.8;
    const dx = p.tx - p.x;
    const dz = p.tz - p.z;
    const passed = dx * p.vx + dz * p.vz < 0;
    if (passed || Math.hypot(dx, dz) < 0.3 || p.age > 3) {
      const hitR = Math.max(0.5, p.splash);
      const victims = state.enemies.filter((e) => {
        if (!e.alive || p.hit.includes(e.id)) return false;
        const ep = enemyPos(e);
        return Math.hypot(ep.x - p.x, ep.z - p.z) <= hitR;
      });
      victims.sort((a, b) => b.dist - a.dist);
      let left = p.pierce;
      const owner = state.towers.find((t) => t.pad === p.pad);
      for (const e of victims) {
        if (left <= 0) break;
        p.hit.push(e.id);
        left -= 1;
        const ep = enemyPos(e);
        hurt(state, e, p.dmg, p.dtype, events, ep.x, ep.z, owner);
        p.dmg *= 0.72;
      }
      events.push({ type: "boom", x: p.x, z: p.z, r: 0.4, fire: false });
      p.alive = false;
    }
  }

  cleanup(state);

  if (
    state.outcome === "play" &&
    state.fighting &&
    state.spawnCursor >= state.schedule.length &&
    !state.enemies.some((e) => e.alive)
  ) {
    state.fighting = false;
    state.cleared = state.wave;
    const bounty = 8 + state.wave * 4;
    state.gold += bounty;
    state.earned += bounty;
    events.push({ type: "clear", wave: state.wave, bounty });
    if (!state.endless && state.wave >= WAVE_COUNT) {
      state.outcome = "victory";
      events.push({ type: "victory" });
    }
  }

  return events;
}

function cleanup(state: GameState) {
  if (state.enemies.some((e) => !e.alive)) state.enemies = state.enemies.filter((e) => e.alive);
  if (state.projectiles.some((p) => !p.alive)) state.projectiles = state.projectiles.filter((p) => p.alive);
  if (state.patches.some((p) => !p.alive)) state.patches = state.patches.filter((p) => p.alive);
}

export function debugSim() {
  const state = createState();
  const countKind = (kind: TowerKind) => state.towers.filter((t) => t.kind === kind).length;
  const emptyPads = () => layout.pads.map((_, i) => i).filter((i) => !state.towers.some((t) => t.pad === i));
  const pickPad = (bias: "spread" | "gate" | "open") => {
    const empty = emptyPads();
    if (!empty.length) return -1;
    if (!state.towers.length) return empty.includes(2) ? 2 : empty[0]!;
    let best = empty[0]!;
    let bestScore = -Infinity;
    for (const i of empty) {
      const p = layout.pads[i]!;
      let minD = 99;
      for (const t of state.towers) {
        const q = layout.pads[t.pad]!;
        minD = Math.min(minD, Math.hypot(p.x - q.x, p.z - q.z));
      }
      const along = i / Math.max(1, layout.pads.length - 1);
      const lean = bias === "gate" ? along * 5 : bias === "open" ? (1 - along) * 2 : (1 - Math.abs(along - 0.55) * 2) * 2;
      const score = minD + lean;
      if (score > bestScore) {
        bestScore = score;
        best = i;
      }
    }
    return best;
  };
  const tryBuy = (kind: TowerKind, bias: "spread" | "gate" | "open") => {
    if (state.gold < TOWERS[kind].cost) return false;
    const pad = pickPad(bias);
    if (pad < 0) return false;
    return placeTower(state, pad, kind).ok;
  };
  const spend = () => {
    const next = state.wave + 1;
    if (countKind("ballista") < 1 && next >= 4) tryBuy("ballista", "spread");
    if (countKind("ballista") < 2 && next >= 9) tryBuy("ballista", "gate");
    if (countKind("onager") < 1 && next >= 6) tryBuy("onager", "spread");
    if (countKind("onager") < 2 && next >= 10) tryBuy("onager", "open");
    if (countKind("naphtha") < 1 && next >= 7) tryBuy("naphtha", "gate");
    if (countKind("cohort") < 1 && next >= 5) tryBuy("cohort", "gate");
    if (countKind("cohort") < 2 && next >= 9) tryBuy("cohort", "gate");
    if (countKind("scorpio") < 1) tryBuy("scorpio", "open");
    if (countKind("scorpio") < 2 && next >= 2) tryBuy("scorpio", "spread");
    if (countKind("sagittarii") < 1 && next >= 2) tryBuy("sagittarii", "open");
    if (countKind("sagittarii") < 2 && next >= 8) tryBuy("sagittarii", "spread");
    if (countKind("scorpio") < 3 && next >= 6 && state.gold >= 140) tryBuy("scorpio", "spread");
    for (const t of [...state.towers].sort((a, b) => TOWERS[a.kind].cost - TOWERS[b.kind].cost)) {
      const cost = upgradeCost(t.kind, t.level);
      const keep = next >= 12 ? 20 : 50;
      if (cost != null && state.gold >= cost + keep) upgradeTower(state, t.pad);
    }
    const tier = MASONRY[state.masonry + 1];
    if (tier && state.masonry < 2 && next >= 3 && state.gold >= tier.cost + 70) buyMasonry(state);
    if (tier && state.masonry >= 2 && next >= 6 && state.gold >= tier.cost + 40) buyMasonry(state);
  };
  let guard = 0;
  const trace: string[] = [];
  while (state.outcome === "play" && state.cleared < 15 && guard < 250000) {
    guard++;
    if (!state.fighting) {
      spend();
      const started = startWave(state);
      if (!started.ok) break;
      trace.push(
        `call ${state.wave} gold ${Math.round(state.gold)} fort ${Math.round(state.fort)} towers ${state.towers.map((t) => t.kind[0] + t.level).join(",")} m${state.masonry}`,
      );
    }
    step(state, 1 / 30);
    if (!state.fighting && state.wave > 0 && trace[trace.length - 1]?.startsWith("call")) {
      trace.push(`  end ${state.wave} gold ${Math.round(state.gold)} fort ${Math.round(state.fort)} kills ${state.kills}`);
    }
  }
  return {
    outcome: state.outcome,
    fort: Math.round(state.fort),
    gold: Math.round(state.gold),
    wave: state.wave,
    cleared: state.cleared,
    kills: state.kills,
    towers: state.towers.map((t) => `${t.kind}${t.level}`),
    masonry: state.masonry,
    gloria: gloriaOf(state),
    path: Math.round(layout.path.total * 10) / 10,
    trace,
  };
}

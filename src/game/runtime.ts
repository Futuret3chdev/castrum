import * as THREE from "three";
import {
  ENEMIES,
  MASONRY,
  TOWER_KINDS,
  TOWERS,
  WAVE_COUNT,
  gloriaOf,
  layout,
  loadSave,
  makeWave,
  sellRefund,
  towerStats,
  upgradeCost,
  wavePreview,
  writeSave,
  type TargetMode,
  type TowerKind,
} from "./balance";
import { drain, type Command } from "./commands";
import { patchHud, previewLine, type Phase } from "./hud";
import {
  makeEnemy,
  makeEntry,
  makeFort,
  makeGround,
  makePad,
  makeProjectile,
  makeRing,
  makeRiver,
  makeRoad,
  makeScenery,
  makeSky,
  makeSoftPoints,
  makeTower,
} from "./meshes";
import {
  playSound,
  resetHitBudget,
  resumeAudio,
  setMuted,
  tickMusic,
  unlockAudio,
} from "./audio";
import {
  buyMasonry,
  createState,
  cycleMode,
  enemyPos,
  placeTower,
  sellTower,
  startWave,
  step,
  upgradeTower,
  type GameState,
} from "./sim";

const LOOK = new THREE.Vector3(0.4, 0.15, 1.4);
const CAM_LOOK = new THREE.Vector3();
const AIM = new THREE.Vector3();
const DIR = new THREE.Vector3();
const BASE_YAW = Math.atan2(0.1, 0.8);
const BASE_PITCH = Math.asin(0.95 / Math.hypot(0.1, 0.95, 0.8));
const MOVE_CODES = new Set(["KeyW", "KeyA", "KeyS", "KeyD", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"]);
const MODE_LABEL: Record<TargetMode, string> = {
  first: "First",
  last: "Last",
  near: "Nearest",
  strong: "Strongest",
};

interface Floater {
  x: number;
  y: number;
  z: number;
  text: string;
  age: number;
  color: string;
}

export function mountGame(glCanvas: HTMLCanvasElement, fxCanvas: HTMLCanvasElement, stage: HTMLElement) {
  const save = loadSave();
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const small = window.innerWidth < 760;

  const renderer = new THREE.WebGLRenderer({ canvas: glCanvas, antialias: !small, alpha: false, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, small ? 1.25 : 1.6));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xe8c9a4, 46, 98);
  scene.background = new THREE.Color(0xe7c49a);

  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 200);
  const basePos = new THREE.Vector3();

  const hemi = new THREE.HemisphereLight(0xffe1b8, 0x3d4a28, 0.62);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffd2a4, 2.35);
  sun.position.set(-10, 18, 6);
  sun.castShadow = true;
  sun.shadow.mapSize.set(small ? 1024 : 2048, small ? 1024 : 2048);
  const shadow = sun.shadow.camera;
  shadow.left = -16;
  shadow.right = 16;
  shadow.top = 16;
  shadow.bottom = -16;
  shadow.near = 1;
  shadow.far = 48;
  sun.shadow.bias = -0.00035;
  sun.shadow.normalBias = 0.035;
  sun.target.position.copy(LOOK);
  scene.add(sun);
  scene.add(sun.target);
  const fill = new THREE.DirectionalLight(0x9eb8c8, 0.38);
  fill.position.set(12, 8, -8);
  scene.add(fill);

  scene.add(makeSky());
  scene.add(makeGround(layout.path));
  scene.add(makeRoad(layout.path));
  scene.add(makeRiver());
  scene.add(makeScenery(layout.path));

  const entry = makeEntry();
  entry.position.set(layout.entry.x, 0, layout.entry.z);
  entry.lookAt(layout.entry.x + layout.entry.tx, 0, layout.entry.z + layout.entry.tz);
  scene.add(entry);

  const fort = makeFort();
  fort.position.set(layout.fort.x, 0, layout.fort.z);
  fort.lookAt(layout.fort.x + layout.fort.tx, 0, layout.fort.z + layout.fort.tz);
  scene.add(fort);

  const pads: THREE.Group[] = [];
  for (let i = 0; i < layout.pads.length; i++) {
    const pad = makePad();
    const p = layout.pads[i]!;
    pad.position.set(p.x, 0, p.z);
    pad.userData.pad = i;
    scene.add(pad);
    pads.push(pad);
  }

  const builds = new THREE.Group();
  scene.add(builds);
  const units = new THREE.Group();
  scene.add(units);
  const shots = new THREE.Group();
  scene.add(shots);
  const fires = new THREE.Group();
  scene.add(fires);

  const diorama = new THREE.Group();
  const decor: { kind: "e" | "t"; obj: THREE.Object3D; dist?: number; phase: number }[] = [];
  const decorPlan: { kind: "raider" | "gaul" | "cataphract" | "elephant"; dist: number }[] = [
    { kind: "raider", dist: 3 },
    { kind: "gaul", dist: 7.5 },
    { kind: "cataphract", dist: 12 },
    { kind: "elephant", dist: 16 },
  ];
  for (const item of decorPlan) {
    const obj = makeEnemy(item.kind);
    decor.push({ kind: "e", obj, dist: item.dist, phase: Math.random() * 6 });
    diorama.add(obj);
  }
  const decorTowers: { pad: number; kind: TowerKind }[] = [
    { pad: 1, kind: "sagittarii" },
    { pad: 3, kind: "ballista" },
    { pad: 5, kind: "onager" },
    { pad: 8, kind: "cohort" },
  ];
  for (const item of decorTowers) {
    const obj = makeTower(item.kind);
    const p = layout.pads[item.pad];
    if (!p) continue;
    obj.position.set(p.x, 0, p.z);
    decor.push({ kind: "t", obj, phase: item.pad });
    diorama.add(obj);
  }
  scene.add(diorama);

  const hoverRing = makeRing();
  const selectRing = makeRing();
  scene.add(hoverRing);
  scene.add(selectRing);
  const motes = makeSoftPoints();
  scene.add(motes.points);

  const fx = fxCanvas.getContext("2d");
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();

  let state: GameState | null = null;
  let phase: Phase = "menu";
  let armed: TowerKind | null = null;
  let selected: number | null = null;
  let speed: 1 | 2 | 3 = 1;
  let muted = save.muted;
  let shakeOn = save.shake && !reduced;
  let manual = false;
  let best = save.best;
  let banner = "A fort by nightfall. The far bank is already moving.";
  let bannerUntil = 0;
  let waveTitle = "";
  let trauma = 0;
  let flash = 0;
  let intro = 1;
  let clock = 0;
  let acc = 0;
  let pub = 0;
  let hitstop = 0;
  let alive = true;
  let camYaw = 0;
  let camPitch = 0;
  let camZoom = 1;
  let panX = 0;
  let panZ = 0;
  let camUser = false;
  const held = new Set<string>();
  const pointers = new Map<number, { x: number; y: number }>();
  let gesture: { id: number; x: number; y: number; lx: number; ly: number; button: number; dragged: boolean } | null = null;
  let pinch = 0;
  const floaters: Floater[] = [];
  const unitMap = new Map<number, THREE.Group>();
  const towerMap = new Map<number, THREE.Group>();
  const shotMap = new Map<number, THREE.Object3D>();
  const patchMap = new Map<number, THREE.Mesh>();
  const corpses: { obj: THREE.Object3D; age: number }[] = [];

  setMuted(muted);
  applyMasonry(4, true);
  for (const pad of pads) {
    const plus = pad.getObjectByName("plus");
    if (plus) plus.visible = false;
  }

  function say(text: string, seconds = 2.8) {
    banner = text;
    bannerUntil = performance.now() + seconds * 1000;
  }

  function applyMasonry(level: number, instant: boolean) {
    const pal = fort.getObjectByName("palisade");
    const cur = fort.getObjectByName("curtain");
    const gate = fort.getObjectByName("gatehouse");
    const pri = fort.getObjectByName("principia");
    const tent = fort.getObjectByName("tent");
    if (pal) pal.visible = level === 1;
    if (cur) cur.visible = level >= 2;
    if (gate) gate.visible = level >= 3;
    if (pri) pri.visible = level >= 4;
    if (tent) tent.visible = level < 4;
    const rising = [pal, cur, gate, pri];
    for (const obj of rising) {
      if (!obj || !obj.visible) continue;
      if (instant || reduced) obj.scale.y = 1;
      else obj.scale.y = 0.05;
    }
  }

  function clearPlay() {
    for (const obj of unitMap.values()) obj.removeFromParent();
    unitMap.clear();
    for (const obj of towerMap.values()) obj.removeFromParent();
    towerMap.clear();
    for (const obj of shotMap.values()) obj.removeFromParent();
    shotMap.clear();
    for (const obj of patchMap.values()) {
      obj.removeFromParent();
      (obj.material as THREE.Material).dispose();
    }
    patchMap.clear();
    for (const c of corpses) c.obj.removeFromParent();
    corpses.length = 0;
    floaters.length = 0;
    for (const pad of pads) {
      const plus = pad.getObjectByName("plus");
      if (plus) plus.visible = true;
    }
  }

  function persist() {
    writeSave({ version: 1, best, muted, shake: shakeOn });
  }

  function noteBest() {
    if (!state) return;
    const g = gloriaOf(state);
    if (g > best) {
      best = g;
      persist();
    }
  }

  function publish() {
    const nextIndex = !state || state.fighting ? state?.wave ?? 1 : state.wave + 1;
    const quiet = state && !state.endless && state.wave >= WAVE_COUNT && !state.fighting;
    const names = {
      raider: ENEMIES.raider.name,
      gaul: ENEMIES.gaul.name,
      dacian: ENEMIES.dacian.name,
      cataphract: ENEMIES.cataphract.name,
      berserker: ENEMIES.berserker.name,
      ram: ENEMIES.ram.name,
      elephant: ENEMIES.elephant.name,
      warlord: ENEMIES.warlord.name,
    };
    const preview = state?.fighting
      ? waveTitle || "The host is on the road."
      : quiet
        ? "The ford is held."
        : previewLine(wavePreview(Math.max(1, nextIndex)), names);
    let masonry = state?.masonry ?? (phase === "menu" ? 4 : 0);
    if (phase === "menu") masonry = 4;
    const tier = MASONRY[masonry] ?? MASONRY[0]!;
    const next = masonry < 4 ? MASONRY[masonry + 1]! : null;
    const tower = state && selected != null ? state.towers.find((t) => t.pad === selected) : undefined;
    const now = performance.now();
    const contextual =
      phase === "menu"
        ? "Raise the walls. Man the engines. Hold the ford."
        : !state || state.towers.length === 0
          ? "Arm an engine, then set it on a stone pad."
          : state.fighting
            ? waveTitle
            : state.wave === 0
              ? "Sound the bucina when the line is ready."
              : "The road is quiet. Call the next host, or raise the walls.";
    const bossE = state?.enemies.find((e) => e.alive && e.kind === "warlord");
    patchHud({
      phase,
      gold: state?.gold ?? 100,
      fort: state?.fort ?? 24,
      fortMax: state?.fortMax ?? 24,
      wave: state?.wave ?? 0,
      cleared: state?.cleared ?? 0,
      fighting: Boolean(state?.fighting),
      kills: state?.kills ?? 0,
      gloria: state ? gloriaOf(state) : 0,
      best,
      masonry,
      masonryName: tier.name,
      masonryNext: next?.name ?? null,
      masonryCost: next?.cost ?? null,
      masonryBlurb: next?.blurb ?? tier.blurb,
      armed,
      selected: tower
        ? {
            pad: tower.pad,
            kind: tower.kind,
            level: tower.level,
            mode: tower.mode,
            kills: tower.kills,
            upgrade: upgradeCost(tower.kind, tower.level),
            sell: sellRefund(tower.spent),
          }
        : null,
      preview: preview,
      banner: now < bannerUntil ? banner : contextual,
      boss: bossE ? { name: ENEMIES.warlord.name, hp: Math.max(0, bossE.hp), max: bossE.maxHp } : null,
      speed,
      muted,
      shakeOn,
      manual,
      canStart: phase === "playing" && !!state && !state.fighting && state.outcome === "play",
      endless: Boolean(state?.endless),
      hint: "",
    });
  }

  function toastFrom(text: string | undefined) {
    if (text) say(text);
  }

  function act(command: Command) {
    if (command.t === "manual") {
      manual = command.open;
      publish();
      return;
    }
    if (command.t === "mute") {
      muted = !muted;
      setMuted(muted);
      persist();
      publish();
      return;
    }
    if (command.t === "shake") {
      shakeOn = !shakeOn;
      persist();
      publish();
      return;
    }
    if (command.t === "pause") {
      if (phase === "playing") phase = "paused";
      else if (phase === "paused") phase = "playing";
      publish();
      return;
    }
    if (command.t === "speed") {
      speed = speed === 1 ? 2 : speed === 2 ? 3 : 1;
      publish();
      return;
    }
    if (command.t === "arm") {
      if (phase !== "playing" && phase !== "paused") return;
      armed = armed === command.kind ? null : command.kind;
      publish();
      return;
    }
    if (command.t === "camp") {
      clearPlay();
      state = null;
      phase = "menu";
      selected = null;
      armed = null;
      diorama.visible = true;
      applyMasonry(4, true);
      for (const pad of pads) {
        const plus = pad.getObjectByName("plus");
        if (plus) plus.visible = false;
      }
      publish();
      return;
    }
    if (command.t === "start" || command.t === "again") {
      clearPlay();
      state = createState();
      phase = "playing";
      selected = null;
      armed = null;
      speed = 1;
      diorama.visible = false;
      applyMasonry(0, true);
      intro = reduced ? 1 : 0;
      waveTitle = "";
      say("The ford is yours. Set an engine.");
      publish();
      return;
    }
    if (!state) return;
    if (command.t === "endless") {
      if (phase !== "victory" || !state) return;
      state.outcome = "play";
      state.endless = true;
      phase = "playing";
      say("The night watch begins.");
      publish();
      return;
    }
    if (command.t === "wave") {
      if (phase === "playing") callWave();
      return;
    }
    if (command.t === "masonry") {
      const res = buyMasonry(state);
      if (res.ok) {
        applyMasonry(state.masonry, false);
        playSound("raise");
        trauma = Math.min(1, trauma + 0.2);
      }
      toastFrom(res.text);
      publish();
      return;
    }
    if (command.t === "upgrade") {
      if (selected == null) return;
      const before = state.towers.find((t) => t.pad === selected)?.level;
      const res = upgradeTower(state, selected);
      if (res.ok) {
        playSound("build");
        const mesh = towerMap.get(selected);
        const level = state.towers.find((t) => t.pad === selected)?.level ?? before ?? 1;
        if (mesh) mesh.scale.setScalar(level === 1 ? 1 : level === 2 ? 1.08 : 1.16);
      }
      toastFrom(res.text);
      publish();
      return;
    }
    if (command.t === "sell") {
      if (selected == null) return;
      const res = sellTower(state, selected);
      if (res.ok) {
        playSound("build");
        selected = null;
      }
      toastFrom(res.text);
      publish();
      return;
    }
    if (command.t === "mode") {
      if (selected == null) return;
      cycleMode(state, selected, command.mode);
      const tower = state.towers.find((t) => t.pad === selected);
      if (tower) say(`Aiming: ${MODE_LABEL[tower.mode]}`);
      publish();
    }
  }

  function tryPlace(pad: number) {
    if (!state || phase !== "playing") return;
    const existing = state.towers.find((t) => t.pad === pad);
    if (armed && !existing) {
      const res = placeTower(state, pad, armed);
      if (res.ok) {
        playSound("build");
        selected = pad;
        say(`${TOWERS[armed].name} is set.`);
      } else toastFrom(res.text);
      publish();
      return;
    }
    if (existing) {
      selected = pad;
      armed = null;
      publish();
      return;
    }
    say("Choose an engine, then the pad.");
    publish();
  }

  function pointerAt(clientX: number, clientY: number) {
    const rect = glCanvas.getBoundingClientRect();
    pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
  }

  function pick(clientX: number, clientY: number) {
    pointerAt(clientX, clientY);
    const fortHit = fort.getObjectByName("fort-hit");
    const hits = raycaster.intersectObjects(fortHit ? [...pads, fortHit] : pads, true);
    for (const hit of hits) {
      let obj: THREE.Object3D | null = hit.object;
      while (obj) {
        if (typeof obj.userData.pad === "number") return { pad: obj.userData.pad as number, fort: false };
        if (obj.userData.fort) return { pad: -1, fort: true };
        obj = obj.parent;
      }
    }
    return null;
  }

  function onPointerDown(ev: PointerEvent) {
    unlockAudio();
    pointers.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
    gesture = { id: ev.pointerId, x: ev.clientX, y: ev.clientY, lx: ev.clientX, ly: ev.clientY, button: ev.button, dragged: pointers.size > 1 };
    glCanvas.setPointerCapture?.(ev.pointerId);
  }

  function applyLook(dx: number, dy: number, button: number, shift: boolean) {
    camUser = true;
    if (button === 2 || button === 1 || shift) {
      const yaw = BASE_YAW + camYaw;
      const scale = 0.02 * camZoom;
      panX += (-dx * Math.cos(yaw) + dy * -Math.sin(yaw)) * scale;
      panZ += (dx * Math.sin(yaw) + dy * -Math.cos(yaw)) * scale;
    } else {
      camYaw -= dx * 0.0052;
      camPitch = THREE.MathUtils.clamp(camPitch + dy * 0.0032, -0.45, 0.42);
    }
    panX = THREE.MathUtils.clamp(panX, -14, 14);
    panZ = THREE.MathUtils.clamp(panZ, -12, 16);
  }

  function onPointerMove(ev: PointerEvent) {
    const prev = pointers.get(ev.pointerId);
    pointers.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
    if (pointers.size >= 2) {
      const pts = [...pointers.values()];
      const a = pts[0]!;
      const b = pts[1]!;
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      if (pinch > 0 && dist > 0) {
        camZoom = THREE.MathUtils.clamp(camZoom * (pinch / dist), 0.52, 1.85);
        camUser = true;
      }
      pinch = dist;
      if (gesture) gesture.dragged = true;
      hoverRing.visible = false;
      return;
    }
    pinch = 0;
    if (gesture && ev.pointerId === gesture.id) {
      const dx = ev.clientX - gesture.lx;
      const dy = ev.clientY - gesture.ly;
      if (Math.hypot(ev.clientX - gesture.x, ev.clientY - gesture.y) > 7) gesture.dragged = true;
      if (gesture.dragged && prev) {
        applyLook(dx, dy, gesture.button, ev.shiftKey);
        gesture.lx = ev.clientX;
        gesture.ly = ev.clientY;
        hoverRing.visible = false;
        return;
      }
    }
    if (phase !== "playing") {
      hoverRing.visible = false;
      return;
    }
    const hit = pick(ev.clientX, ev.clientY);
    if (!hit || hit.fort) {
      hoverRing.visible = false;
      return;
    }
    const pad = layout.pads[hit.pad];
    if (!pad) return;
    const tower = state?.towers.find((t) => t.pad === hit.pad);
    const range = tower ? towerStats(tower.kind, tower.level).range : armed ? towerStats(armed, 1).range : 0;
    hoverRing.visible = range > 0;
    hoverRing.position.set(pad.x, 0.12, pad.z);
    hoverRing.scale.setScalar(Math.max(0.2, range));
    const mat = hoverRing.material as THREE.MeshBasicMaterial;
    const afford = !tower && armed ? (state?.gold ?? 0) >= TOWERS[armed].cost : true;
    mat.color.set(afford ? "#d4b36a" : "#c4483a");
  }

  function onPointerUp(ev: PointerEvent) {
    pointers.delete(ev.pointerId);
    if (pointers.size < 2) pinch = 0;
    if (!gesture || ev.pointerId !== gesture.id) return;
    const dragged = gesture.dragged;
    const button = gesture.button;
    gesture = null;
    if (pointers.size === 1) {
      const [id, p] = [...pointers.entries()][0]!;
      gesture = { id, x: p.x, y: p.y, lx: p.x, ly: p.y, button: 0, dragged: true };
    }
    if (dragged || button !== 0) return;
    if (manual || phase === "menu" || phase === "paused" || phase === "victory" || phase === "defeat") return;
    const hit = pick(ev.clientX, ev.clientY);
    if (!hit) {
      selected = null;
      publish();
      return;
    }
    if (hit.fort) {
      act({ t: "masonry" });
      return;
    }
    tryPlace(hit.pad);
  }

  function onWheel(ev: WheelEvent) {
    ev.preventDefault();
    camUser = true;
    const factor = ev.deltaY > 0 ? 1.08 : 0.92;
    camZoom = THREE.MathUtils.clamp(camZoom * factor, 0.52, 1.85);
  }

  function onContext(ev: Event) {
    ev.preventDefault();
  }

  function resetEye() {
    camYaw = 0;
    camPitch = 0;
    camZoom = 1;
    panX = 0;
    panZ = 0;
    camUser = false;
  }

  function slideEye(dt: number) {
    if (!held.size) return;
    const yaw = BASE_YAW + camYaw;
    const fx = -Math.sin(yaw);
    const fz = -Math.cos(yaw);
    const rx = Math.cos(yaw);
    const rz = -Math.sin(yaw);
    let ix = 0;
    let iz = 0;
    if (held.has("KeyW") || held.has("ArrowUp")) {
      ix += fx;
      iz += fz;
    }
    if (held.has("KeyS") || held.has("ArrowDown")) {
      ix -= fx;
      iz -= fz;
    }
    if (held.has("KeyD") || held.has("ArrowRight")) {
      ix += rx;
      iz += rz;
    }
    if (held.has("KeyA") || held.has("ArrowLeft")) {
      ix -= rx;
      iz -= rz;
    }
    if (!ix && !iz) return;
    const len = Math.hypot(ix, iz) || 1;
    const step = dt * (held.has("ShiftLeft") || held.has("ShiftRight") ? 14 : 7.5) * camZoom;
    panX = THREE.MathUtils.clamp(panX + (ix / len) * step, -14, 14);
    panZ = THREE.MathUtils.clamp(panZ + (iz / len) * step, -12, 16);
    camUser = true;
  }

  function onKey(ev: KeyboardEvent) {
    if (MOVE_CODES.has(ev.code)) {
      ev.preventDefault();
      held.add(ev.code);
      return;
    }
    if (ev.repeat) return;
    const tag = (ev.target as HTMLElement | null)?.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA") return;
    if (manual) {
      if (ev.key === "Escape") {
        ev.preventDefault();
        manual = false;
        publish();
      }
      return;
    }
    if (ev.code.startsWith("Digit")) {
      const n = Number(ev.code.slice(5));
      const kind = TOWER_KINDS[n - 1];
      if (kind && (phase === "playing" || phase === "paused")) {
        ev.preventDefault();
        act({ t: "arm", kind });
      }
      return;
    }
    if (ev.code === "Space") {
      ev.preventDefault();
      if (phase === "playing" && state && !state.fighting) callWave();
      return;
    }
    if (ev.code === "Escape") {
      ev.preventDefault();
      if (armed) act({ t: "arm", kind: null });
      else if (selected != null) {
        selected = null;
        publish();
      } else act({ t: "pause" });
      return;
    }
    if (ev.code === "KeyP") {
      ev.preventDefault();
      act({ t: "pause" });
    } else if (ev.code === "KeyU") {
      ev.preventDefault();
      act({ t: "upgrade" });
    } else if (ev.code === "KeyM") {
      ev.preventDefault();
      act({ t: "masonry" });
    } else if (ev.code === "KeyT") {
      ev.preventDefault();
      act({ t: "mode" });
    } else if (ev.code === "KeyQ") {
      ev.preventDefault();
      act({ t: "speed" });
    } else if (ev.code === "KeyR") {
      ev.preventDefault();
      resetEye();
    }
  }

  function onKeyUp(ev: KeyboardEvent) {
    held.delete(ev.code);
  }

  function callWave() {
    if (!state) return;
    const res = startWave(state);
    if (!res.ok) {
      toastFrom(res.text);
      return;
    }
    const wave = makeWave(state.wave);
    waveTitle = `${wave.name} — ${wave.blurb}`;
    say(waveTitle, 3.4);
    playSound("horn");
    publish();
  }

  function consume(events: ReturnType<typeof step>) {
    for (const ev of events) {
      if (ev.type === "shoot") {
        const mesh = towerMap.get(ev.pad);
        const arm = mesh?.getObjectByName("arm");
        if (arm) arm.userData.kick = 1;
        if (ev.kind === "onager") playSound("stone");
        else if (ev.kind === "naphtha") playSound("fire");
        else if (ev.kind === "ballista") playSound("bolt");
        else playSound("arrow");
      } else if (ev.type === "hit") {
        playSound("hit");
        floaters.push({
          x: ev.x,
          y: 1.3,
          z: ev.z,
          text: String(ev.dmg),
          age: 0,
          color: ev.finisher ? "#f3e6d0" : "#f0d7a4",
        });
      } else if (ev.type === "death") {
        playSound(ENEMIES[ev.kind].tags.includes("boss") ? "win" : "kill");
        playSound("coin");
        motes.burst(ev.x, 0.8, ev.z, ev.kind === "elephant" ? "#d7d2c8" : "#e7c49a", ev.kind === "elephant" ? 16 : 8, 2.4, 0.5, 4);
        floaters.push({ x: ev.x, y: 1.6, z: ev.z, text: `+${ev.gold}`, age: 0, color: "#e3c16e" });
        if (ENEMIES[ev.kind].tags.includes("boss")) {
          trauma = Math.min(1, trauma + 0.55);
          hitstop = Math.max(hitstop, 0.08);
        } else trauma = Math.min(1, trauma + 0.08);
      } else if (ev.type === "boom") {
        motes.burst(ev.x, 0.4, ev.z, ev.fire ? "#ffb15a" : "#d9d0c4", ev.fire ? 14 : 8, ev.fire ? 2.2 : 1.6, 0.45, ev.fire ? 1.2 : 4);
        if (ev.r > 1) trauma = Math.min(1, trauma + 0.18);
      } else if (ev.type === "leak") {
        playSound("leak");
        trauma = Math.min(1, trauma + 0.34);
        flash = Math.min(1, flash + 0.55);
        say(`The gate gives. −${ev.dmg}`);
      } else if (ev.type === "boss") {
        say(`${ev.name} takes the road.`, 3.2);
        trauma = Math.min(1, trauma + 0.3);
      } else if (ev.type === "clear") {
        playSound("coin");
        say(`The host breaks. +${ev.bounty} denarii`, 2.4);
      } else if (ev.type === "victory") {
        phase = "victory";
        playSound("win");
        noteBest();
        say("The ford holds.");
      } else if (ev.type === "defeat") {
        phase = "defeat";
        playSound("lose");
        noteBest();
        say("The gate is broken.");
      }
    }
  }

  function syncWorld(time: number) {
    if (!state) return;
    const seenT = new Set<number>();
    for (const tower of state.towers) {
      seenT.add(tower.pad);
      let mesh = towerMap.get(tower.pad);
      if (!mesh) {
        mesh = makeTower(tower.kind);
        const p = layout.pads[tower.pad]!;
        mesh.position.set(p.x, 0, p.z);
        mesh.scale.setScalar(0.2);
        builds.add(mesh);
        towerMap.set(tower.pad, mesh);
        const plus = pads[tower.pad]?.getObjectByName("plus");
        if (plus) plus.visible = false;
      }
      const target = tower.level === 1 ? 1 : tower.level === 2 ? 1.08 : 1.16;
      mesh.scale.setScalar(THREE.MathUtils.damp(mesh.scale.x, target, 8, 1 / 60));
      mesh.traverse((obj) => {
        if (obj.name === "arm") {
          const kick = Number(obj.userData.kick ?? 0);
          const rest = Number(obj.userData.rest ?? 0);
          obj.rotation.x = rest + Math.sin(Math.min(1, kick) * Math.PI) * 0.85;
          obj.userData.kick = Math.max(0, kick - 1 / 60 * 3);
        } else if (obj.name === "pennant") {
          obj.rotation.y = Math.sin(time * 2.2 + tower.pad) * 0.4;
        } else if (obj.name === "flame") {
          const s = 0.85 + Math.sin(time * 14 + tower.pad) * 0.18;
          obj.scale.set(s, s * 1.2, s);
        }
      });
    }
    for (const [pad, mesh] of towerMap) {
      if (!seenT.has(pad)) {
        mesh.removeFromParent();
        towerMap.delete(pad);
        const plus = pads[pad]?.getObjectByName("plus");
        if (plus) plus.visible = phase === "playing" || phase === "paused";
      }
    }

    const aliveIds = new Set<number>();
    for (const e of state.enemies) {
      if (!e.alive) continue;
      aliveIds.add(e.id);
      let mesh = unitMap.get(e.id);
      if (!mesh) {
        mesh = makeEnemy(e.kind);
        units.add(mesh);
        unitMap.set(e.id, mesh);
      }
      const p = enemyPos(e);
      const def = ENEMIES[e.kind];
      const bob = Math.sin(time * def.hz + e.id) * def.bob;
      mesh.position.set(p.x, bob, p.z);
      AIM.set(p.x + p.tx, bob, p.z + p.tz);
      mesh.lookAt(AIM);
      mesh.traverse((obj) => {
        if (obj.name === "axle") obj.rotation.x = -e.dist * 2.6;
      });
    }
    for (const [id, mesh] of unitMap) {
      if (!aliveIds.has(id)) {
        unitMap.delete(id);
        corpses.push({ obj: mesh, age: 0 });
      }
    }

    const shotIds = new Set<number>();
    for (const p of state.projectiles) {
      shotIds.add(p.id);
      let mesh = shotMap.get(p.id);
      if (!mesh) {
        mesh = makeProjectile(p.visual);
        shots.add(mesh);
        shotMap.set(p.id, mesh);
        mesh.userData.px = p.x;
        mesh.userData.pz = p.z;
      }
      const px = Number(mesh.userData.px);
      const pz = Number(mesh.userData.pz);
      mesh.position.set(p.x, p.y, p.z);
      AIM.set(p.x + (p.x - px), p.y, p.z + (p.z - pz));
      if (Math.hypot(p.x - px, p.z - pz) > 0.0001) mesh.lookAt(AIM);
      mesh.userData.px = p.x;
      mesh.userData.pz = p.z;
    }
    for (const [id, mesh] of shotMap) {
      if (!shotIds.has(id)) {
        mesh.removeFromParent();
        shotMap.delete(id);
      }
    }

    const patchIds = new Set<number>();
    for (const patch of state.patches) {
      if (!patch.alive) continue;
      patchIds.add(patch.id);
      let mesh = patchMap.get(patch.id);
      if (!mesh) {
        mesh = new THREE.Mesh(
          new THREE.CircleGeometry(1, 16),
          new THREE.MeshStandardMaterial({
            color: "#ff7a2a",
            emissive: "#ff5a12",
            emissiveIntensity: 0.9,
            transparent: true,
            opacity: 0.5,
            depthWrite: false,
            roughness: 0.55,
          }),
        );
        mesh.rotation.x = -Math.PI / 2;
        fires.add(mesh);
        patchMap.set(patch.id, mesh);
      }
      mesh.position.set(patch.x, 0.08, patch.z);
      mesh.scale.setScalar(patch.r);
      const mat = mesh.material as THREE.MeshStandardMaterial;
      mat.opacity = Math.max(0.12, (patch.ttl / patch.max) * 0.55);
    }
    for (const [id, mesh] of patchMap) {
      if (!patchIds.has(id)) {
        mesh.removeFromParent();
        (mesh.material as THREE.Material).dispose();
        mesh.geometry.dispose();
        patchMap.delete(id);
      }
    }
  }

  function tickCorpses(dt: number) {
    for (let i = corpses.length - 1; i >= 0; i--) {
      const c = corpses[i]!;
      c.age += dt;
      c.obj.position.y -= dt * 0.4;
      c.obj.scale.setScalar(Math.max(0.01, 1 - c.age * 2.2));
      if (c.age > 0.45) {
        c.obj.removeFromParent();
        corpses.splice(i, 1);
      }
    }
  }

  function tickDecor(time: number) {
    if (!diorama.visible) return;
    for (const item of decor) {
      if (item.kind === "e" && item.dist != null) {
        const s = layout.path.sample(item.dist);
        const bob = Math.sin(time * 8 + item.phase) * 0.06;
        item.obj.position.set(s.x, bob, s.z);
        AIM.set(s.x + s.tx, bob, s.z + s.tz);
        item.obj.lookAt(AIM);
      } else {
        item.obj.traverse((obj) => {
          if (obj.name === "pennant") obj.rotation.y = Math.sin(time * 2 + item.phase) * 0.4;
          if (obj.name === "flame") {
            const sc = 0.85 + Math.sin(time * 13 + item.phase) * 0.15;
            obj.scale.set(sc, sc, sc);
          }
        });
      }
    }
  }

  function fitCamera(aspect: number, orbit: number) {
    const fov = (camera.fov * Math.PI) / 180;
    const distH = 9.6 / Math.tan(fov / 2);
    const distW = 12 / Math.tan(fov / 2) / Math.max(0.4, aspect);
    const dist = Math.max(distH, distW) * (1.16 - 0.16 * intro) * camZoom;
    const yaw = BASE_YAW + camYaw + orbit;
    const pitch = THREE.MathUtils.clamp(BASE_PITCH + camPitch, 0.28, 1.28);
    DIR.set(Math.cos(pitch) * Math.sin(yaw), Math.sin(pitch), Math.cos(pitch) * Math.cos(yaw));
    CAM_LOOK.set(LOOK.x + panX, LOOK.y, LOOK.z + panZ);
    camera.position.copy(CAM_LOOK).addScaledVector(DIR, dist);
    camera.lookAt(CAM_LOOK);
    basePos.copy(camera.position);
    sun.target.position.copy(CAM_LOOK);
    camera.updateProjectionMatrix();
  }

  function resize() {
    const w = Math.max(1, stage.clientWidth);
    const h = Math.max(1, stage.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, w < 760 ? 1.25 : 1.6));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    const pr = renderer.getPixelRatio();
    fxCanvas.width = Math.floor(w * pr);
    fxCanvas.height = Math.floor(h * pr);
    fx?.setTransform(pr, 0, 0, pr, 0, 0);
  }

  function drawOverlay() {
    if (!fx) return;
    const w = stage.clientWidth;
    const h = stage.clientHeight;
    fx.clearRect(0, 0, w, h);
    const vignette = fx.createRadialGradient(w / 2, h * 0.55, Math.min(w, h) * 0.25, w / 2, h * 0.5, Math.max(w, h) * 0.72);
    vignette.addColorStop(0, "rgba(20,12,8,0)");
    vignette.addColorStop(1, "rgba(18,10,6,0.28)");
    fx.fillStyle = vignette;
    fx.fillRect(0, 0, w, h);
    if (flash > 0.01) {
      fx.fillStyle = `rgba(158, 42, 36, ${flash * 0.35})`;
      fx.fillRect(0, 0, w, h);
    }
    const project = (x: number, y: number, z: number) => {
      AIM.set(x, y, z).project(camera);
      if (AIM.z > 1) return null;
      return { x: (AIM.x * 0.5 + 0.5) * w, y: (-AIM.y * 0.5 + 0.5) * h };
    };
    if (state) {
      fx.font = "600 11px Outfit, sans-serif";
      fx.textAlign = "center";
      for (const e of state.enemies) {
        if (!e.alive || (e.hp >= e.maxHp && e.kind !== "warlord")) continue;
        const p = enemyPos(e);
        const head = project(p.x, ENEMIES[e.kind].head + 0.15, p.z);
        if (!head) continue;
        const width = e.kind === "warlord" ? 64 : 36;
        const ratio = Math.max(0, e.hp / e.maxHp);
        fx.fillStyle = "rgba(20,14,10,0.7)";
        fx.fillRect(head.x - width / 2, head.y, width, 4);
        fx.fillStyle = ratio < 0.35 ? "#c4483a" : "#d4b36a";
        fx.fillRect(head.x - width / 2, head.y, width * ratio, 4);
      }
    }
    fx.font = "700 13px Outfit, sans-serif";
    for (let i = floaters.length - 1; i >= 0; i--) {
      const f = floaters[i]!;
      const p = project(f.x, f.y + f.age * 0.8, f.z);
      if (!p) continue;
      fx.globalAlpha = Math.max(0, 1 - f.age / 0.8);
      fx.fillStyle = f.color;
      fx.fillText(f.text, p.x, p.y);
      fx.globalAlpha = 1;
    }
  }

  function frame(now: number) {
    if (!alive) return;
    const dt = Math.min(0.05, clock ? (now - clock) / 1000 : 0.016);
    clock = now;
    resetHitBudget();
    for (const command of drain()) act(command);
    if (phase === "playing" && state && state.outcome === "play") {
      if (hitstop > 0) hitstop -= dt;
      else {
        acc += dt * speed;
        let steps = 0;
        while (acc >= 1 / 60 && steps < 8) {
          const events = step(state, 1 / 60);
          consume(events);
          acc -= 1 / 60;
          steps += 1;
          if (state.outcome !== "play") break;
        }
      }
    }
    intro = Math.min(1, intro + dt * (reduced ? 4 : 0.8));
    slideEye(dt);
    const orbit = phase === "menu" && !reduced && !camUser ? Math.sin(now / 1000 * 0.18) * 0.18 : 0;
    fitCamera(camera.aspect, orbit);
    if (shakeOn && trauma > 0) {
      trauma = Math.max(0, trauma - dt * 1.7);
      const s = trauma * trauma;
      const t = now / 1000;
      camera.position.x += Math.sin(t * 47) * s * 0.38;
      camera.position.y += Math.cos(t * 53) * s * 0.16;
      camera.position.z += Math.sin(t * 41) * s * 0.38;
    } else trauma = Math.max(0, trauma - dt);
    flash = Math.max(0, flash - dt * 1.4);

    fort.traverse((obj) => {
      if (obj.name === "flame") {
        const s = 0.85 + Math.sin(now / 1000 * 12 + obj.position.x) * 0.2;
        obj.scale.set(0.12 * s, 0.26 * s, 0.12 * s);
      }
      if (obj.name === "eagle") obj.rotation.y = Math.sin(now / 1000 * 0.8) * 0.25;
    });
    for (const obj of [fort.getObjectByName("palisade"), fort.getObjectByName("curtain"), fort.getObjectByName("gatehouse"), fort.getObjectByName("principia")]) {
      if (obj && obj.visible && obj.scale.y < 1) obj.scale.y = Math.min(1, obj.scale.y + dt * 2.2);
    }

    if (phase === "playing" || phase === "paused" || phase === "victory" || phase === "defeat") syncWorld(now / 1000);
    tickCorpses(dt);
    tickDecor(now / 1000);
    if (Math.random() < dt * 6) {
      motes.burst((Math.random() - 0.5) * 18, 1.2 + Math.random(), (Math.random() - 0.5) * 12, "#f6e2c0", 1, 0.25, 1.6, 0.15);
    }
    motes.update(dt);
    for (const f of floaters) f.age += dt;
    while (floaters.length && floaters[0]!.age > 0.85) floaters.shift();
    if (floaters.length > 40) floaters.splice(0, floaters.length - 40);

    if (selected != null && state) {
      const tower = state.towers.find((t) => t.pad === selected);
      const pad = layout.pads[selected];
      if (tower && pad) {
        selectRing.visible = true;
        selectRing.position.set(pad.x, 0.13, pad.z);
        selectRing.scale.setScalar(towerStats(tower.kind, tower.level).range);
      } else selectRing.visible = false;
    } else selectRing.visible = false;

    tickMusic(now / 1000, Boolean(state?.fighting) && phase === "playing");
    renderer.render(scene, camera);
    drawOverlay();
    pub += dt;
    if (pub > 0.1) {
      pub = 0;
      publish();
    }
    requestAnimationFrame(frame);
  }

  const ro = new ResizeObserver(() => resize());
  ro.observe(stage);
  resize();
  publish();
  glCanvas.addEventListener("pointerdown", onPointerDown);
  glCanvas.addEventListener("pointermove", onPointerMove);
  glCanvas.addEventListener("pointerup", onPointerUp);
  glCanvas.addEventListener("pointercancel", onPointerUp);
  glCanvas.addEventListener("wheel", onWheel, { passive: false });
  glCanvas.addEventListener("contextmenu", onContext);
  window.addEventListener("keydown", onKey);
  window.addEventListener("keyup", onKeyUp);
  const onVis = () => {
    if (document.visibilityState === "visible") resumeAudio();
  };
  document.addEventListener("visibilitychange", onVis);
  window.addEventListener("pointerdown", unlockAudio);
  const ready = window as unknown as { __castrumReady?: boolean };
  ready.__castrumReady = true;
  requestAnimationFrame(frame);

  return {
    dispose() {
      alive = false;
      ro.disconnect();
      glCanvas.removeEventListener("pointerdown", onPointerDown);
      glCanvas.removeEventListener("pointermove", onPointerMove);
      glCanvas.removeEventListener("pointerup", onPointerUp);
      glCanvas.removeEventListener("pointercancel", onPointerUp);
      glCanvas.removeEventListener("wheel", onWheel);
      glCanvas.removeEventListener("contextmenu", onContext);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKeyUp);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("pointerdown", unlockAudio);
      renderer.dispose();
      ready.__castrumReady = false;
    },
  };
}

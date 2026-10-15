import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { distToPath, layout, type EnemyKind, type Path, type TowerKind } from "./balance";

const BODY = new THREE.MeshStandardMaterial({
  vertexColors: true,
  roughness: 0.78,
  metalness: 0.06,
  flatShading: true,
});

export const GOLD = new THREE.MeshStandardMaterial({
  color: "#e6c36a",
  roughness: 0.38,
  metalness: 0.72,
  emissive: "#6a4a10",
  emissiveIntensity: 0.35,
  flatShading: true,
});

export const FLAME = new THREE.MeshStandardMaterial({
  color: "#ffb15a",
  emissive: "#ff6a1a",
  emissiveIntensity: 1.6,
  roughness: 0.45,
  flatShading: true,
});

const UNIT = {
  box: new THREE.BoxGeometry(1, 1, 1),
  sph: new THREE.SphereGeometry(1, 7, 5),
  cyl: new THREE.CylinderGeometry(1, 1, 1, 6),
  cone: new THREE.ConeGeometry(1, 1, 6),
  ico: new THREE.IcosahedronGeometry(1, 0),
  dod: new THREE.DodecahedronGeometry(1, 0),
};

const _c = new THREE.Color();
const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _p = new THREE.Vector3();
const _s = new THREE.Vector3();
const _e = new THREE.Euler();

function stamp(
  template: THREE.BufferGeometry,
  hex: string,
  x: number,
  y: number,
  z: number,
  rx = 0,
  ry = 0,
  rz = 0,
  sx = 1,
  sy = 1,
  sz = 1,
) {
  const g = template.clone();
  _p.set(x, y, z);
  _e.set(rx, ry, rz);
  _q.setFromEuler(_e);
  _s.set(sx, sy, sz);
  _m.compose(_p, _q, _s);
  g.applyMatrix4(_m);
  if (g.getAttribute("uv")) g.deleteAttribute("uv");
  _c.set(hex);
  const pos = g.getAttribute("position");
  const arr = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const n = 0.9 + 0.14 * Math.abs(Math.sin(pos.getX(i) * 9.1 + pos.getY(i) * 6.3 + pos.getZ(i) * 7.7));
    arr[i * 3] = _c.r * n;
    arr[i * 3 + 1] = _c.g * n;
    arr[i * 3 + 2] = _c.b * n;
  }
  g.setAttribute("color", new THREE.BufferAttribute(arr, 3));
  if (g.index) {
    const flat = g.toNonIndexed();
    g.dispose();
    return flat;
  }
  return g;
}

function fuse(parts: THREE.BufferGeometry[], name = "body") {
  const geo = mergeGeometries(parts, false);
  if (!geo) throw new Error("mesh merge failed");
  for (const part of parts) part.dispose();
  const mesh = new THREE.Mesh(geo, BODY);
  mesh.castShadow = true;
  mesh.name = name;
  return mesh;
}

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SKIN = "#e2b394";
const SKIN2 = "#c98462";
const TUNIC = "#9e2d2a";
const METAL = "#c5ccd2";
const BRONZE = "#a8844a";
const WOOD = "#7a4e2e";
const FUR = "#6a4b34";
const STONE = "#d5ccbe";
const STONE2 = "#b7ab9a";
const CLOTH = "#3e4650";
const OLIVE = "#6e8a42";
const OLIVE2 = "#3f5a30";

function human(o: {
  skin?: string;
  cloth: string;
  metal?: string;
  hair: string;
  shield?: string;
  weapon: "axe" | "sword" | "falx" | "spear" | "bow" | "none";
  helm?: boolean;
  crest?: string;
  cloak?: string;
  k?: number;
}) {
  const k = o.k ?? 1;
  const skin = o.skin ?? SKIN;
  const metal = o.metal ?? METAL;
  const parts: THREE.BufferGeometry[] = [];
  const S = (x: number) => x * k;
  parts.push(stamp(UNIT.box, skin, S(-0.1), S(0.28), S(0.12), 0.15, 0, 0, S(0.16), S(0.52), S(0.16)));
  parts.push(stamp(UNIT.box, skin, S(0.11), S(0.26), S(-0.1), -0.2, 0, 0, S(0.16), S(0.5), S(0.16)));
  parts.push(stamp(UNIT.box, o.cloth, 0, S(0.74), 0, 0, 0, 0, S(0.42), S(0.46), S(0.22)));
  parts.push(stamp(UNIT.sph, skin, 0, S(1.12), S(0.02), 0, 0, 0, S(0.16), S(0.17), S(0.16)));
  if (o.helm) {
    parts.push(stamp(UNIT.sph, metal, 0, S(1.18), 0, 0, 0, 0, S(0.18), S(0.12), S(0.18)));
    if (o.crest) parts.push(stamp(UNIT.box, o.crest, 0, S(1.32), 0, 0, 0, 0, S(0.06), S(0.16), S(0.28)));
  } else {
    parts.push(stamp(UNIT.sph, o.hair, 0, S(1.2), S(-0.02), 0, 0, 0, S(0.17), S(0.12), S(0.17)));
  }
  parts.push(stamp(UNIT.box, skin, S(-0.28), S(0.78), S(0.04), 0.4, 0, 0.15, S(0.12), S(0.38), S(0.12)));
  parts.push(stamp(UNIT.box, skin, S(0.28), S(0.76), S(0.08), -0.5, 0, -0.2, S(0.12), S(0.38), S(0.12)));
  if (o.cloak) {
    parts.push(stamp(UNIT.box, o.cloak, 0, S(0.78), S(-0.16), 0.15, 0, 0, S(0.4), S(0.62), S(0.06)));
  }
  if (o.shield) {
    parts.push(stamp(UNIT.cyl, o.shield, S(-0.36), S(0.86), S(0.16), Math.PI / 2, 0, 0, S(0.3), S(0.08), S(0.42)));
    parts.push(stamp(UNIT.sph, BRONZE, S(-0.36), S(0.86), S(0.22), 0, 0, 0, S(0.08), S(0.08), S(0.08)));
  }
  if (o.weapon === "axe") {
    parts.push(stamp(UNIT.box, WOOD, S(0.4), S(0.9), S(0.18), 0, 0, 0.4, S(0.06), S(0.55), S(0.06)));
    parts.push(stamp(UNIT.box, metal, S(0.52), S(1.12), S(0.22), 0, 0, 0.2, S(0.22), S(0.16), S(0.04)));
  } else if (o.weapon === "sword") {
    parts.push(stamp(UNIT.box, metal, S(0.4), S(0.95), S(0.22), 0.2, 0, -0.4, S(0.05), S(0.62), S(0.02)));
  } else if (o.weapon === "falx") {
    for (let i = 0; i < 4; i++) {
      const a = -0.2 + i * 0.45;
      parts.push(
        stamp(UNIT.box, metal, S(0.38), S(0.95 + i * 0.12), S(0.16 + i * 0.05), 0, 0, a, S(0.05), S(0.2), S(0.04)),
      );
    }
  } else if (o.weapon === "spear") {
    parts.push(stamp(UNIT.box, WOOD, S(0.34), S(1.05), S(0.12), 0, 0, 0.15, S(0.05), S(0.95), S(0.05)));
    parts.push(stamp(UNIT.cone, metal, S(0.4), S(1.55), S(0.16), 0, 0, 0.2, S(0.07), S(0.18), S(0.07)));
  } else if (o.weapon === "bow") {
    parts.push(stamp(UNIT.box, WOOD, S(0.34), S(0.95), S(0.2), 0.6, 0, 0, S(0.04), S(0.55), S(0.04)));
  }
  return parts;
}

export function makeEnemy(kind: EnemyKind) {
  const group = new THREE.Group();
  group.name = kind;
  if (kind === "raider") {
    group.add(fuse(human({ cloth: FUR, hair: "#d9b56a", weapon: "axe", cloak: FUR })));
  } else if (kind === "gaul") {
    group.add(
      fuse(
        human({
          cloth: "#2f5f86",
          hair: "#efe0a0",
          weapon: "sword",
          shield: "#c4a574",
        }),
      ),
    );
  } else if (kind === "dacian") {
    group.add(fuse(human({ cloth: "#8aa0aa", hair: "#3a2a24", weapon: "falx", helm: true, metal: BRONZE })));
  } else if (kind === "berserker") {
    const parts = human({ skin: SKIN2, cloth: "#6b2a24", hair: "#1c140f", weapon: "axe", cloak: "#4a3424", k: 1.18 });
    parts.push(stamp(UNIT.sph, "#4a3428", 0, 1.45, -0.05, 0, 0, 0, 0.22, 0.16, 0.22));
    group.add(fuse(parts));
  } else if (kind === "warlord") {
    const parts = human({
      skin: SKIN2,
      cloth: "#4a2030",
      hair: "#1a120e",
      weapon: "axe",
      cloak: "#2a1c22",
      helm: true,
      metal: "#8d8f96",
      crest: "#e3c16e",
      k: 1.22,
    });
    parts.push(stamp(UNIT.cone, "#e3c16e", -0.1, 1.55, 0, 0, 0, 0, 0.06, 0.14, 0.06));
    parts.push(stamp(UNIT.cone, "#e3c16e", 0.1, 1.55, 0, 0, 0, 0, 0.06, 0.14, 0.06));
    parts.push(stamp(UNIT.box, TUNIC, 0.05, 1.7, -0.05, 0, 0, 0, 0.04, 0.55, 0.36));
    group.add(fuse(parts));
  } else if (kind === "cataphract") {
    const parts: THREE.BufferGeometry[] = [];
    parts.push(stamp(UNIT.box, BRONZE, 0, 0.78, 0, 0, 0, 0, 0.36, 0.38, 1.15));
    parts.push(stamp(UNIT.box, BRONZE, 0, 1.05, 0.62, -0.7, 0, 0, 0.2, 0.42, 0.22));
    parts.push(stamp(UNIT.box, BRONZE, 0, 1.22, 0.86, 0, 0, 0, 0.18, 0.16, 0.32));
    parts.push(stamp(UNIT.box, "#6a4a30", 0, 0.72, -0.7, 0.4, 0, 0, 0.08, 0.08, 0.28));
    parts.push(stamp(UNIT.box, BRONZE, -0.14, 0.48, 0.28, 0.3, 0, 0, 0.12, 0.48, 0.12));
    parts.push(stamp(UNIT.box, BRONZE, 0.14, 0.48, 0.22, -0.2, 0, 0, 0.12, 0.48, 0.12));
    parts.push(stamp(UNIT.box, BRONZE, -0.14, 0.46, -0.32, -0.25, 0, 0, 0.12, 0.46, 0.12));
    parts.push(stamp(UNIT.box, BRONZE, 0.14, 0.48, -0.22, 0.35, 0, 0, 0.12, 0.46, 0.12));
    parts.push(stamp(UNIT.box, TUNIC, 0, 1.28, 0.05, 0, 0, 0, 0.28, 0.32, 0.18));
    parts.push(stamp(UNIT.sph, SKIN, 0, 1.58, 0.06, 0, 0, 0, 0.12, 0.13, 0.12));
    parts.push(stamp(UNIT.sph, METAL, 0, 1.66, 0.04, 0, 0, 0, 0.14, 0.08, 0.14));
    parts.push(stamp(UNIT.box, WOOD, 0.12, 1.45, 0.2, 0, 0, 0.1, 0.04, 1.15, 0.04));
    parts.push(stamp(UNIT.cone, METAL, 0.16, 2.05, 0.22, 0, 0, 0.1, 0.05, 0.16, 0.05));
    group.add(fuse(parts));
  } else if (kind === "elephant") {
    const parts: THREE.BufferGeometry[] = [];
    parts.push(stamp(UNIT.sph, "#9a968e", 0, 0.95, 0, 0, 0, 0, 0.72, 0.58, 1.05));
    for (const [x, z] of [
      [-0.32, 0.42],
      [0.32, 0.38],
      [-0.32, -0.42],
      [0.34, -0.38],
    ] as const) {
      parts.push(stamp(UNIT.cyl, "#8d8982", x, 0.42, z, 0, 0, 0, 0.14, 0.7, 0.14));
    }
    parts.push(stamp(UNIT.sph, "#a29e96", 0, 1.15, 0.95, 0, 0, 0, 0.38, 0.34, 0.4));
    parts.push(stamp(UNIT.sph, "#8a8680", 0, 0.85, 1.25, 0.5, 0, 0, 0.12, 0.12, 0.22));
    parts.push(stamp(UNIT.sph, "#8a8680", 0, 0.62, 1.32, 0.8, 0, 0, 0.1, 0.1, 0.18));
    parts.push(stamp(UNIT.sph, "#b7b2a8", -0.55, 1.15, 0.55, 0, 0, 0.4, 0.28, 0.08, 0.22));
    parts.push(stamp(UNIT.sph, "#b7b2a8", 0.55, 1.15, 0.55, 0, 0, -0.4, 0.28, 0.08, 0.22));
    parts.push(stamp(UNIT.cone, "#efe8dc", -0.18, 0.95, 1.25, Math.PI / 2, 0, 0.2, 0.06, 0.32, 0.06));
    parts.push(stamp(UNIT.cone, "#efe8dc", 0.18, 0.95, 1.25, Math.PI / 2, 0, -0.2, 0.06, 0.32, 0.06));
    parts.push(stamp(UNIT.box, WOOD, 0, 1.55, -0.05, 0, 0, 0, 0.55, 0.28, 0.48));
    parts.push(stamp(UNIT.box, TUNIC, 0, 1.82, 0, 0, 0, 0, 0.22, 0.26, 0.16));
    parts.push(stamp(UNIT.sph, SKIN, 0, 2.05, 0.02, 0, 0, 0, 0.1, 0.1, 0.1));
    group.add(fuse(parts));
  } else {
    const parts: THREE.BufferGeometry[] = [];
    parts.push(stamp(UNIT.box, "#5c4636", 0, 0.72, 0, 0, 0, 0, 0.78, 0.55, 1.25));
    parts.push(stamp(UNIT.box, "#3e342c", 0, 1.02, 0, 0, 0, 0, 0.86, 0.12, 1.32));
    parts.push(stamp(UNIT.cone, BRONZE, 0, 0.72, 0.78, Math.PI / 2, 0, 0, 0.18, 0.42, 0.18));
    parts.push(stamp(UNIT.box, WOOD, -0.28, 0.55, 0.15, 0, 0, 0, 0.08, 0.28, 0.08));
    parts.push(stamp(UNIT.box, WOOD, 0.28, 0.55, -0.1, 0, 0, 0, 0.08, 0.28, 0.08));
    group.add(fuse(parts));
    const axle = (z: number) => {
      const mesh = fuse([
        stamp(UNIT.cyl, WOOD, -0.46, 0, 0, 0, 0, Math.PI / 2, 0.18, 0.1, 0.18),
        stamp(UNIT.cyl, WOOD, 0.46, 0, 0, 0, 0, Math.PI / 2, 0.18, 0.1, 0.18),
      ]);
      mesh.name = "axle";
      mesh.position.set(0, 0.28, z);
      return mesh;
    };
    group.add(axle(0.42));
    group.add(axle(-0.42));
  }
  group.traverse((obj) => {
    obj.castShadow = true;
  });
  return group;
}

function pennant(color: string, y: number) {
  const mesh = fuse([stamp(UNIT.box, color, 0.26, 0, 0, 0, 0, 0, 0.46, 0.28, 0.03)]);
  mesh.name = "pennant";
  mesh.position.y = y;
  return mesh;
}

export function makeTower(kind: TowerKind) {
  const g = new THREE.Group();
  g.name = kind;
  const color = kind === "scorpio" ? "#c4a15a" : kind === "sagittarii" ? "#8ea36a" : kind === "cohort" ? TUNIC : kind === "ballista" ? "#e3c16e" : kind === "naphtha" ? "#e07a32" : "#8aa0ad";
  const plinth = [
    stamp(UNIT.cyl, STONE, 0, 0.1, 0, 0, 0, 0, 0.85, 0.2, 0.85),
    stamp(UNIT.cyl, STONE2, 0, 0.22, 0, 0, 0, 0, 0.62, 0.08, 0.62),
  ];
  if (kind === "scorpio") {
    g.add(fuse([...plinth, stamp(UNIT.box, WOOD, 0, 0.48, 0, 0, 0, 0, 0.18, 0.16, 0.9), stamp(UNIT.box, BRONZE, 0, 0.62, 0.15, 0, 0, 0.5, 0.55, 0.08, 0.08)]));
    const arm = fuse([
      stamp(UNIT.box, WOOD, 0, 0, 0.15, 0, 0, 0, 0.08, 0.08, 0.7),
      stamp(UNIT.cone, METAL, 0, 0, 0.52, Math.PI / 2, 0, 0, 0.05, 0.16, 0.05),
    ]);
    arm.name = "arm";
    arm.position.set(0, 0.72, 0);
    arm.userData.rest = -0.25;
    g.add(arm);
    g.add(pennant(color, 1.15));
  } else if (kind === "ballista") {
    g.add(
      fuse([
        ...plinth,
        stamp(UNIT.box, WOOD, 0, 0.48, 0, 0, 0, 0, 0.7, 0.16, 0.28),
        stamp(UNIT.box, WOOD, 0, 0.55, 0, 0, 0, 0, 0.16, 0.14, 1.05),
      ]),
    );
    const arm = fuse([
      stamp(UNIT.box, WOOD, -0.38, 0.05, 0, 0, 0, 0.9, 0.46, 0.08, 0.08),
      stamp(UNIT.box, WOOD, 0.38, 0.05, 0, 0, 0, -0.9, 0.46, 0.08, 0.08),
      stamp(UNIT.box, METAL, 0, 0, 0.2, 0, 0, 0, 0.08, 0.08, 0.85),
    ]);
    arm.name = "arm";
    arm.position.set(0, 0.78, 0);
    arm.userData.rest = -0.15;
    g.add(arm);
    g.add(pennant(color, 1.35));
  } else if (kind === "onager") {
    g.add(
      fuse([
        ...plinth,
        stamp(UNIT.box, WOOD, -0.28, 0.48, 0, 0, 0, 0, 0.1, 0.45, 0.7),
        stamp(UNIT.box, WOOD, 0.28, 0.48, 0, 0, 0, 0, 0.1, 0.45, 0.7),
        stamp(UNIT.box, WOOD, 0, 0.42, -0.28, 0, 0, 0, 0.5, 0.1, 0.1),
        stamp(UNIT.sph, STONE2, 0.45, 0.32, 0.2, 0, 0, 0, 0.12, 0.12, 0.12),
      ]),
    );
    const arm = fuse([
      stamp(UNIT.box, WOOD, 0, 0.35, 0, 0, 0, 0, 0.1, 0.75, 0.1),
      stamp(UNIT.box, WOOD, 0, 0.7, 0.1, 0, 0, 0, 0.22, 0.1, 0.22),
    ]);
    arm.name = "arm";
    arm.position.set(0, 0.55, -0.05);
    arm.userData.rest = -0.95;
    arm.rotation.x = -0.95;
    g.add(arm);
    g.add(pennant(color, 1.25));
  } else if (kind === "cohort") {
    const men: THREE.BufferGeometry[] = [];
    for (const x of [-0.38, 0, 0.38]) {
      for (const part of human({
        cloth: TUNIC,
        hair: "#2a211c",
        weapon: "spear",
        shield: TUNIC,
        helm: true,
        crest: x === 0 ? "#e3c16e" : TUNIC,
        metal: METAL,
        k: 0.72,
      })) {
        part.translate(x, 0.28, 0);
        men.push(part);
      }
    }
    g.add(fuse([...plinth, ...men]));
    g.add(pennant(color, 1.55));
  } else if (kind === "naphtha") {
    g.add(
      fuse([
        ...plinth,
        stamp(UNIT.cyl, WOOD, -0.28, 0.7, -0.28, 0, 0, 0, 0.08, 0.9, 0.08),
        stamp(UNIT.cyl, WOOD, 0.28, 0.7, -0.28, 0, 0, 0, 0.08, 0.9, 0.08),
        stamp(UNIT.cyl, WOOD, -0.28, 0.7, 0.28, 0, 0, 0, 0.08, 0.9, 0.08),
        stamp(UNIT.cyl, WOOD, 0.28, 0.7, 0.28, 0, 0, 0, 0.08, 0.9, 0.08),
        stamp(UNIT.cyl, WOOD, 0, 1.15, 0, 0, 0, 0, 0.42, 0.16, 0.42),
        stamp(UNIT.cyl, BRONZE, 0, 1.32, 0, 0, 0, 0, 0.28, 0.16, 0.28),
      ]),
    );
    const flame = new THREE.Mesh(UNIT.cone, FLAME);
    flame.name = "flame";
    flame.position.set(0, 1.62, 0);
    flame.scale.set(0.16, 0.32, 0.16);
    flame.castShadow = false;
    g.add(flame);
    g.add(pennant(color, 1.7));
  } else {
    g.add(
      fuse([
        ...plinth,
        stamp(UNIT.cyl, WOOD, -0.32, 0.85, -0.32, 0, 0, 0, 0.07, 1.2, 0.07),
        stamp(UNIT.cyl, WOOD, 0.32, 0.85, -0.32, 0, 0, 0, 0.07, 1.2, 0.07),
        stamp(UNIT.cyl, WOOD, -0.32, 0.85, 0.32, 0, 0, 0, 0.07, 1.2, 0.07),
        stamp(UNIT.cyl, WOOD, 0.32, 0.85, 0.32, 0, 0, 0, 0.07, 1.2, 0.07),
        stamp(UNIT.box, WOOD, 0, 1.4, 0, 0, 0, 0, 0.8, 0.08, 0.8),
        stamp(UNIT.cone, "#6a3a28", 0, 1.75, 0, 0, 0, 0, 0.55, 0.4, 0.55),
        ...human({ cloth: TUNIC, hair: "#222", weapon: "bow", helm: true, k: 0.55 }).map((part) => {
          part.translate(-0.15, 1.45, 0);
          return part;
        }),
        ...human({ cloth: "#8ea36a", hair: "#222", weapon: "bow", helm: true, k: 0.55 }).map((part) => {
          part.translate(0.18, 1.45, 0.05);
          return part;
        }),
      ]),
    );
    g.add(pennant(color, 2.15));
  }
  g.traverse((obj) => {
    if (obj instanceof THREE.Mesh && obj.name !== "flame") obj.castShadow = true;
  });
  return g;
}

export function makeProjectile(visual: "arrow" | "bolt" | "pilum" | "stone" | "pot") {
  if (visual === "stone") {
    return fuse([stamp(UNIT.sph, STONE2, 0, 0, 0, 0, 0, 0, 0.16, 0.14, 0.16)]);
  }
  if (visual === "pot") {
    const g = new THREE.Group();
    g.add(fuse([stamp(UNIT.cyl, "#6a3a28", 0, 0, 0, 0, 0, 0, 0.1, 0.14, 0.1), stamp(UNIT.sph, "#c4552a", 0, 0.08, 0, 0, 0, 0, 0.08, 0.08, 0.08)]));
    const flame = new THREE.Mesh(UNIT.cone, FLAME);
    flame.scale.set(0.08, 0.16, 0.08);
    flame.position.y = 0.16;
    g.add(flame);
    return g;
  }
  const len = visual === "bolt" ? 0.55 : visual === "pilum" ? 0.48 : 0.36;
  const thick = visual === "bolt" ? 0.05 : 0.025;
  const shaft = visual === "pilum" ? WOOD : METAL;
  return fuse([
    stamp(UNIT.box, shaft, 0, 0, 0, 0, 0, 0, thick, thick, len),
    stamp(UNIT.cone, "#eee6d6", 0, 0, len * 0.55, Math.PI / 2, 0, 0, thick * 1.6, 0.12, thick * 1.6),
  ]);
}

export function makePad() {
  const g = new THREE.Group();
  g.add(fuse([stamp(UNIT.cyl, STONE, 0, 0.08, 0, 0, 0, 0, 0.72, 0.14, 0.72), stamp(UNIT.cyl, STONE2, 0, 0.16, 0, 0, 0, 0, 0.48, 0.05, 0.48)]));
  const plus = fuse([
    stamp(UNIT.box, "#8d7b58", 0, 0.24, 0, 0, 0, 0, 0.28, 0.04, 0.06),
    stamp(UNIT.box, "#8d7b58", 0, 0.24, 0, 0, 0, 0, 0.06, 0.04, 0.28),
  ]);
  plus.name = "plus";
  g.add(plus);
  return g;
}

export function makeFort() {
  const root = new THREE.Group();
  root.add(
    fuse([
      stamp(UNIT.cyl, "#cbbfa8", 0, 0.08, 1.05, 0, 0, 0, 3.5, 0.16, 2.15),
      stamp(UNIT.box, "#b7a78c", 0, 0.18, 1.15, 0, 0, 0, 4.4, 0.08, 3.1),
    ]),
  );
  const tent = fuse([
    stamp(UNIT.cone, TUNIC, 0, 0.85, 1.7, 0, 0, 0, 0.7, 0.85, 0.9),
    stamp(UNIT.box, WOOD, 0.55, 0.7, 1.7, 0, 0, 0, 0.06, 1.15, 0.06),
  ]);
  tent.name = "tent";
  root.add(tent);
  const eagle = new THREE.Mesh(
    mergeGeometries(
      [
        stamp(UNIT.box, "#e6c36a", 0, 0.15, 0, 0, 0, 0, 0.22, 0.08, 0.08),
        stamp(UNIT.cone, "#e6c36a", -0.12, 0.12, 0.04, 0, 0, 0.8, 0.1, 0.16, 0.04),
        stamp(UNIT.cone, "#e6c36a", 0.12, 0.12, 0.04, 0, 0, -0.8, 0.1, 0.16, 0.04),
      ],
      false,
    )!,
    GOLD,
  );
  eagle.position.set(0.55, 1.28, 1.7);
  eagle.castShadow = true;
  eagle.name = "eagle";
  root.add(eagle);

  const posts: THREE.BufferGeometry[] = [];
  for (let i = -4; i <= 4; i++) {
    if (Math.abs(i) <= 1) continue;
    posts.push(stamp(UNIT.cyl, "#6b4a2c", i * 0.72, 0.55, 0.05, 0, 0, 0, 0.07, 0.85, 0.07));
    posts.push(stamp(UNIT.cone, "#6b4a2c", i * 0.72, 1.05, 0.05, 0, 0, 0, 0.09, 0.22, 0.09));
  }
  for (const x of [-3.15, 3.15]) {
    for (let z = 0.4; z <= 2.4; z += 0.7) {
      posts.push(stamp(UNIT.cyl, "#6b4a2c", x, 0.55, z, 0, 0, 0, 0.07, 0.85, 0.07));
      posts.push(stamp(UNIT.cone, "#6b4a2c", x, 1.05, z, 0, 0, 0, 0.09, 0.22, 0.09));
    }
  }
  const palisade = fuse(posts);
  palisade.name = "palisade";
  const palGroup = new THREE.Group();
  palGroup.name = "palisade";
  palGroup.add(palisade);
  root.add(palGroup);

  const wallBits: THREE.BufferGeometry[] = [];
  const wallSeg = (x: number, z: number, sx: number, sz: number) => {
    wallBits.push(stamp(UNIT.box, STONE, x, 0.55, z, 0, 0, 0, sx, 0.7, sz));
    const n = Math.max(1, Math.round(sx / 0.45));
    for (let i = 0; i < n; i++) {
      const ox = x - sx / 2 + 0.28 + i * (sx / n);
      wallBits.push(stamp(UNIT.box, STONE2, ox, 0.98, z, 0, 0, 0, 0.22, 0.22, sz * 0.9));
    }
  };
  wallSeg(-2.15, 0.05, 1.7, 0.38);
  wallSeg(2.15, 0.05, 1.7, 0.38);
  wallSeg(-3.15, 1.3, 0.38, 2.2);
  wallSeg(3.15, 1.3, 0.38, 2.2);
  wallSeg(0, 2.45, 5.6, 0.38);
  const curtain = new THREE.Group();
  curtain.name = "curtain";
  curtain.add(fuse(wallBits));
  root.add(curtain);

  const gate = new THREE.Group();
  gate.name = "gatehouse";
  gate.add(
    fuse([
      stamp(UNIT.box, STONE, -1.15, 0.95, 0.05, 0, 0, 0, 0.7, 1.5, 0.7),
      stamp(UNIT.box, STONE, 1.15, 0.95, 0.05, 0, 0, 0, 0.7, 1.5, 0.7),
      stamp(UNIT.box, STONE2, 0, 1.55, 0.05, 0, 0, 0, 1.5, 0.28, 0.62),
      stamp(UNIT.box, "#5a3822", 0, 0.55, 0.05, 0, 0, 0, 0.9, 0.85, 0.12),
      stamp(UNIT.box, BRONZE, 0, 0.7, 0.14, 0, 0, 0, 0.16, 0.16, 0.06),
    ]),
  );
  for (const x of [-1.15, 1.15]) {
    const flame = new THREE.Mesh(UNIT.cone, FLAME);
    flame.name = "flame";
    flame.position.set(x, 1.85, 0.05);
    flame.scale.set(0.12, 0.26, 0.12);
    gate.add(flame);
  }
  root.add(gate);

  const principia = new THREE.Group();
  principia.name = "principia";
  principia.add(
    fuse([
      stamp(UNIT.box, STONE, 0, 0.7, 1.7, 0, 0, 0, 1.8, 0.9, 1.3),
      stamp(UNIT.box, TUNIC, 0, 1.25, 1.7, 0, 0.2, 0, 1.9, 0.12, 1.45),
      stamp(UNIT.box, "#f3e6d0", 0, 0.85, 1.1, 0, 0, 0, 0.55, 0.7, 0.08),
      stamp(UNIT.cyl, BRONZE, 0, 1.15, 1.05, 0, 0, 0, 0.05, 1.5, 0.05),
    ]),
  );
  const aquila = new THREE.Mesh(UNIT.sph, GOLD);
  aquila.scale.set(0.16, 0.12, 0.18);
  aquila.position.set(0, 1.95, 1.05);
  aquila.name = "eagle";
  principia.add(aquila);
  root.add(principia);

  const hit = new THREE.Mesh(
    new THREE.CylinderGeometry(1.35, 1.35, 1.6, 8),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }),
  );
  hit.position.set(0, 0.8, 1.55);
  hit.userData.fort = true;
  hit.name = "fort-hit";
  root.add(hit);
  root.userData.fort = true;
  return root;
}

export function makeGround(path: Path) {
  const geo = new THREE.PlaneGeometry(56, 48, 48, 40);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.getAttribute("position");
  const colors = new Float32Array(pos.count * 3);
  const a = new THREE.Color("#6f8c45");
  const b = new THREE.Color("#8eaa5c");
  const c = new THREE.Color("#5d7636");
  const dry = new THREE.Color("#c6b088");
  const water = new THREE.Color("#2f6c72");
  const col = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const n = Math.sin(x * 0.35) * Math.cos(z * 0.32) * 0.5 + Math.sin(x * 1.15 + z * 0.8) * 0.25 + 0.5;
    let minD = distToPath(path, x, z);
    const edge = Math.min(1, minD / 8);
    const y = Math.max(0, n - 0.45) * 1.7 * edge * edge;
    pos.setY(i, y);
    col.copy(a).lerp(b, n * 0.8).lerp(c, Math.min(1, y * 0.8));
    if (minD < 2.4) col.lerp(dry, (1 - minD / 2.4) * 0.55);
    if (x < -10.5) col.lerp(water, Math.min(1, (-10.5 - x) / 3));
    colors[i * 3] = col.r;
    colors[i * 3 + 1] = col.g;
    colors[i * 3 + 2] = col.b;
  }
  geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(
    geo,
    new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 0, flatShading: true }),
  );
  mesh.receiveShadow = true;
  mesh.name = "ground";
  return mesh;
}

export function makeRoad(path: Path) {
  const parts: THREE.BufferGeometry[] = [];
  const samples = 90;
  const left: number[] = [];
  const right: number[] = [];
  for (let i = 0; i <= samples; i++) {
    const s = path.sample((path.total * i) / samples);
    left.push(s.x + s.nx * 0.95, 0.05, s.z + s.nz * 0.95);
    right.push(s.x - s.nx * 0.95, 0.05, s.z - s.nz * 0.95);
    if (i % 3 === 0) {
      parts.push(stamp(UNIT.dod, STONE2, s.x + s.nx * 1.05, 0.08, s.z + s.nz * 1.05, 0, i, 0, 0.1, 0.08, 0.12));
      parts.push(stamp(UNIT.dod, STONE2, s.x - s.nx * 1.05, 0.08, s.z - s.nz * 1.05, 0, i * 0.7, 0, 0.1, 0.08, 0.12));
    }
  }
  const positions = new Float32Array((samples + 1) * 6);
  for (let i = 0; i <= samples; i++) {
    positions.set(left.slice(i * 3, i * 3 + 3), i * 6);
    positions.set(right.slice(i * 3, i * 3 + 3), i * 6 + 3);
  }
  const indices: number[] = [];
  for (let i = 0; i < samples; i++) {
    const a0 = i * 2;
    indices.push(a0, a0 + 1, a0 + 2, a0 + 1, a0 + 3, a0 + 2);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geo.setIndex(indices);
  const roadCol = new Float32Array(positions.length);
  const dust = new THREE.Color("#a97848");
  for (let i = 0; i < roadCol.length; i += 3) {
    const n = 0.9 + Math.abs(Math.sin(positions[i]! * 3 + positions[i + 2]!)) * 0.15;
    roadCol[i] = dust.r * n;
    roadCol[i + 1] = dust.g * n;
    roadCol[i + 2] = dust.b * n;
  }
  geo.setAttribute("color", new THREE.BufferAttribute(roadCol, 3));
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(
    geo,
    new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0, flatShading: true }),
  );
  mesh.receiveShadow = true;
  mesh.name = "road";
  const group = new THREE.Group();
  group.add(mesh);
  if (parts.length) group.add(fuse(parts, "kerb"));
  return group;
}

export function makeRiver() {
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(4.2, 36),
    new THREE.MeshStandardMaterial({
      color: "#1d6770",
      roughness: 0.18,
      metalness: 0.42,
      transparent: true,
      opacity: 0.9,
    }),
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(-13.7, 0.04, -1);
  mesh.receiveShadow = true;
  mesh.name = "river";
  return mesh;
}

export function makeSky() {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 512;
  const g = canvas.getContext("2d");
  if (!g) return new THREE.Mesh();
  const grd = g.createLinearGradient(0, 0, 0, 512);
  grd.addColorStop(0, "#3d6ea8");
  grd.addColorStop(0.28, "#7eb0d4");
  grd.addColorStop(0.52, "#f0c08a");
  grd.addColorStop(0.68, "#f6d7b0");
  grd.addColorStop(1, "#e7c49a");
  g.fillStyle = grd;
  g.fillRect(0, 0, 1024, 512);
  const sun = g.createRadialGradient(760, 300, 8, 760, 300, 90);
  sun.addColorStop(0, "rgba(255,244,210,0.95)");
  sun.addColorStop(0.35, "rgba(255,196,120,0.55)");
  sun.addColorStop(1, "rgba(255,180,90,0)");
  g.fillStyle = sun;
  g.fillRect(0, 0, 1024, 512);
  g.fillStyle = "rgba(255,255,255,0.22)";
  const clouds = [
    [140, 90, 90],
    [220, 120, 70],
    [480, 70, 110],
    [860, 100, 80],
    [640, 150, 60],
  ];
  for (const [x, y, r] of clouds) {
    g.beginPath();
    g.ellipse(x, y, r, r * 0.38, 0, 0, Math.PI * 2);
    g.fill();
    g.beginPath();
    g.ellipse(x + r * 0.45, y + 6, r * 0.7, r * 0.3, 0, 0, Math.PI * 2);
    g.fill();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(90, 32, 20),
    new THREE.MeshBasicMaterial({ map: tex, side: THREE.BackSide, depthWrite: false }),
  );
  mesh.name = "sky";
  mesh.frustumCulled = false;
  return mesh;
}

export function makeEntry() {
  const g = new THREE.Group();
  g.add(
    fuse([
      stamp(UNIT.cyl, WOOD, -0.85, 0.7, 0, 0, 0, 0, 0.08, 1.3, 0.08),
      stamp(UNIT.cyl, WOOD, 0.85, 0.7, 0, 0, 0, 0, 0.08, 1.3, 0.08),
      stamp(UNIT.box, WOOD, 0, 1.35, 0, 0, 0, 0, 1.9, 0.1, 0.1),
      stamp(UNIT.box, TUNIC, 0, 1.05, 0, 0, 0, 0, 0.7, 0.4, 0.04),
    ]),
  );
  return g;
}

export function makeScenery(path: Path) {
  const root = new THREE.Group();
  const rng = mulberry32(11);
  const fort = layout.fort;
  const cypress = fuse([
    stamp(UNIT.cyl, "#6a4a30", 0, 0.25, 0, 0, 0, 0, 0.08, 0.5, 0.08),
    stamp(UNIT.cone, OLIVE2, 0, 1.15, 0, 0, 0, 0, 0.38, 1.5, 0.38),
    stamp(UNIT.cone, OLIVE, 0, 1.7, 0, 0, 0, 0, 0.22, 0.7, 0.22),
  ]);
  const olive = fuse([
    stamp(UNIT.cyl, "#6a4a30", 0, 0.35, 0, 0, 0, 0, 0.1, 0.7, 0.1),
    stamp(UNIT.ico, OLIVE, 0, 1.05, 0, 0, 0, 0, 0.55, 0.38, 0.55),
    stamp(UNIT.ico, OLIVE2, 0.28, 0.95, 0.1, 0, 0.4, 0, 0.32, 0.26, 0.32),
  ]);
  const rock = fuse([stamp(UNIT.dod, STONE2, 0, 0.18, 0, 0.2, 0.4, 0, 0.35, 0.22, 0.28)]);
  const flower = fuse([
    stamp(UNIT.cyl, "#d7d0a4", 0, 0.12, 0, 0, 0, 0, 0.02, 0.22, 0.02),
    stamp(UNIT.sph, "#f0e2a0", 0, 0.26, 0, 0, 0, 0, 0.06, 0.06, 0.06),
  ]);

  const place = (proto: THREE.Mesh, count: number, minDist: number, scale: [number, number]) => {
    const inst = new THREE.InstancedMesh(proto.geometry, BODY, count);
    inst.castShadow = true;
    inst.receiveShadow = false;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    let n = 0;
    let tries = 0;
    while (n < count && tries < count * 40) {
      tries++;
      const far = rng() < 0.28;
      const x = far ? -16 + rng() * 3.2 : (rng() * 2 - 1) * 16;
      const z = (rng() * 2 - 1) * 14;
      if (!far && distToPath(path, x, z) < minDist) continue;
      if (Math.hypot(x - fort.x, z - fort.z) < 4.2) continue;
      if (layout.pads.some((p) => Math.hypot(p.x - x, p.z - z) < 1.7)) continue;
      const s = scale[0] + rng() * (scale[1] - scale[0]);
      q.setFromAxisAngle(_p.set(0, 1, 0), rng() * Math.PI * 2);
      m.compose(_p.set(x, 0, z), q, _s.set(s, s * (0.85 + rng() * 0.4), s));
      inst.setMatrixAt(n, m);
      n++;
    }
    inst.count = n;
    inst.instanceMatrix.needsUpdate = true;
    if (n > 0) root.add(inst);
    else inst.geometry.dispose();
  };

  place(cypress, 26, 2.8, [0.9, 1.55]);
  place(olive, 18, 2.9, [0.85, 1.45]);
  place(rock, 22, 1.7, [0.55, 1.6]);
  place(flower, 46, 1.35, [0.7, 1.25]);

  const hills: THREE.BufferGeometry[] = [];
  const ring = [
    [-18, -12, 2.2, "#7d8f58"],
    [-8, -14, 2.8, "#6d8450"],
    [4, -15, 3.1, "#8aa05e"],
    [16, -12, 2.4, "#748a52"],
    [20, -2, 2.6, "#6a804c"],
    [18, 12, 2.9, "#7f9458"],
    [6, 16, 2.3, "#688048"],
    [-8, 16, 3.2, "#7a9054"],
    [-18, 8, 2.5, "#70884e"],
  ] as const;
  for (const [x, z, s, hex] of ring) {
    hills.push(stamp(UNIT.cone, hex, x, s * 0.35, z, 0, 0, 0, s * 1.8, s, s * 1.5));
  }
  const hillMesh = fuse(hills, "hills");
  hillMesh.receiveShadow = true;
  root.add(hillMesh);
  return root;
}

export function makeRing() {
  const mesh = new THREE.Mesh(
    new THREE.RingGeometry(0.94, 1, 48),
    new THREE.MeshBasicMaterial({
      color: "#d4b36a",
      transparent: true,
      opacity: 0.55,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = 0.12;
  mesh.visible = false;
  mesh.renderOrder = 2;
  return mesh;
}

export function makeSoftPoints() {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const g = canvas.getContext("2d");
  const tex = new THREE.CanvasTexture(canvas);
  if (g) {
    const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grd.addColorStop(0, "rgba(255,255,255,1)");
    grd.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = grd;
    g.fillRect(0, 0, 64, 64);
    tex.needsUpdate = true;
  }
  tex.colorSpace = THREE.SRGBColorSpace;
  const max = 420;
  const positions = new Float32Array(max * 3);
  const colors = new Float32Array(max * 3);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geo.setDrawRange(0, 0);
  const mat = new THREE.PointsMaterial({
    size: 0.34,
    map: tex,
    vertexColors: true,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true,
    opacity: 0.9,
  });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  const items: { x: number; y: number; z: number; vx: number; vy: number; vz: number; life: number; max: number; r: number; g: number; b: number; grav: number }[] = [];
  return {
    points,
    burst(x: number, y: number, z: number, color: string, n: number, speed = 2.2, life = 0.45, grav = 3) {
      _c.set(color);
      for (let i = 0; i < n && items.length < max; i++) {
        const a = Math.random() * Math.PI * 2;
        const u = Math.random();
        items.push({
          x,
          y,
          z,
          vx: Math.cos(a) * speed * u,
          vy: 0.6 + Math.random() * speed,
          vz: Math.sin(a) * speed * u,
          life,
          max: life,
          r: _c.r,
          g: _c.g,
          b: _c.b,
          grav,
        });
      }
    },
    update(dt: number) {
      let w = 0;
      for (const p of items) {
        p.life -= dt;
        if (p.life <= 0) continue;
        p.vy -= p.grav * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.z += p.vz * dt;
        const a = p.life / p.max;
        positions[w * 3] = p.x;
        positions[w * 3 + 1] = p.y;
        positions[w * 3 + 2] = p.z;
        colors[w * 3] = p.r * a;
        colors[w * 3 + 1] = p.g * a;
        colors[w * 3 + 2] = p.b * a;
        items[w] = p;
        w++;
      }
      items.length = w;
      geo.setDrawRange(0, w);
      geo.attributes.position!.needsUpdate = true;
      geo.attributes.color!.needsUpdate = true;
    },
  };
}

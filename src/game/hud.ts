import type { EnemyKind, TargetMode, TowerKind } from "./balance";

export type Phase = "menu" | "playing" | "paused" | "victory" | "defeat";

export interface HudModel {
  phase: Phase;
  gold: number;
  fort: number;
  fortMax: number;
  wave: number;
  cleared: number;
  fighting: boolean;
  kills: number;
  gloria: number;
  best: number;
  masonry: number;
  masonryName: string;
  masonryNext: string | null;
  masonryCost: number | null;
  masonryBlurb: string;
  armed: TowerKind | null;
  selected: null | {
    pad: number;
    kind: TowerKind;
    level: number;
    mode: TargetMode;
    kills: number;
    upgrade: number | null;
    sell: number;
  };
  preview: string;
  banner: string;
  boss: null | { name: string; hp: number; max: number };
  speed: 1 | 2 | 3;
  muted: boolean;
  shakeOn: boolean;
  manual: boolean;
  canStart: boolean;
  endless: boolean;
  hint: string;
}

export const INITIAL_HUD: HudModel = {
  phase: "menu",
  gold: 100,
  fort: 24,
  fortMax: 24,
  wave: 0,
  cleared: 0,
  fighting: false,
  kills: 0,
  gloria: 0,
  best: 0,
  masonry: 0,
  masonryName: "Bare terrace",
  masonryNext: "Palisade",
  masonryCost: 55,
  masonryBlurb: "Packed earth and a command tent.",
  armed: null,
  selected: null,
  preview: "Next host · 8 Chatti raiders",
  banner: "Arm an engine, then set it on a stone pad.",
  boss: null,
  speed: 1,
  muted: false,
  shakeOn: true,
  manual: false,
  canStart: false,
  endless: false,
  hint: "",
};

let current = INITIAL_HUD;
const listeners = new Set<() => void>();

export function getHud() {
  return current;
}

export function patchHud(patch: Partial<HudModel>) {
  current = { ...current, ...patch };
  for (const listener of listeners) listener();
}

export function subscribeHud(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function previewLine(items: { kind: EnemyKind; count: number }[], names: Record<EnemyKind, string>) {
  if (!items.length) return "The far bank is quiet.";
  return "Next host · " + items.map((i) => `${i.count} ${names[i.kind]}`).join(" · ");
}

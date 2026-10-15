import type { TargetMode, TowerKind } from "./balance";

export type Command =
  | { t: "start" }
  | { t: "wave" }
  | { t: "again" }
  | { t: "camp" }
  | { t: "endless" }
  | { t: "pause" }
  | { t: "speed" }
  | { t: "arm"; kind: TowerKind | null }
  | { t: "upgrade" }
  | { t: "sell" }
  | { t: "mode"; mode?: TargetMode }
  | { t: "masonry" }
  | { t: "mute" }
  | { t: "shake" }
  | { t: "manual"; open: boolean };

const queue: Command[] = [];

export function send(command: Command) {
  queue.push(command);
}

export function drain(): Command[] {
  return queue.splice(0, queue.length);
}
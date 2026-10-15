let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let sfxBus: GainNode | null = null;
let musicBus: GainNode | null = null;
let noiseBuf: AudioBuffer | null = null;
let muted = false;
let beat = 0;
let nextBeat = 0;

export function unlockAudio() {
  if (typeof window === "undefined") return;
  const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!ctx) {
    ctx = new AC({ latencyHint: "interactive" });
    master = ctx.createGain();
    sfxBus = ctx.createGain();
    musicBus = ctx.createGain();
    sfxBus.gain.value = 0.85;
    musicBus.gain.value = 0.55;
    sfxBus.connect(master);
    musicBus.connect(master);
    master.connect(ctx.destination);
    master.gain.value = muted ? 0 : 1;
  }
  if (ctx.state === "suspended") void ctx.resume();
}

export function resumeAudio() {
  if (ctx && ctx.state === "suspended") void ctx.resume();
}

export function setMuted(next: boolean) {
  muted = next;
  if (master && ctx) master.gain.setTargetAtTime(next ? 0 : 1, ctx.currentTime, 0.03);
}

function tone(freq: number, dur: number, type: OscillatorType, gain: number, slide = 1) {
  if (!ctx || !sfxBus || muted) return;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  const t = ctx.currentTime;
  osc.frequency.setValueAtTime(freq * (0.96 + Math.random() * 0.08), t);
  if (slide !== 1) osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq * slide), t + dur);
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
  osc.connect(g);
  g.connect(sfxBus);
  osc.start(t);
  osc.stop(t + dur + 0.02);
  osc.onended = () => {
    osc.disconnect();
    g.disconnect();
  };
}

function noise(dur: number, gain: number, freq: number) {
  if (!ctx || !sfxBus || muted) return;
  if (!noiseBuf) {
    noiseBuf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.35), ctx.sampleRate);
    const data = noiseBuf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }
  const src = ctx.createBufferSource();
  src.buffer = noiseBuf;
  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = freq;
  filter.Q.value = 0.7;
  const g = ctx.createGain();
  const t = ctx.currentTime;
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
  src.connect(filter);
  filter.connect(g);
  g.connect(sfxBus);
  src.start(t);
  src.stop(t + dur);
  src.onended = () => {
    src.disconnect();
    filter.disconnect();
    g.disconnect();
  };
}

export type SoundName =
  | "arrow"
  | "bolt"
  | "stone"
  | "fire"
  | "hit"
  | "kill"
  | "build"
  | "leak"
  | "horn"
  | "win"
  | "lose"
  | "coin"
  | "raise";

let hitBudget = 0;

export function playSound(name: SoundName) {
  if (muted || !ctx) return;
  if (name === "hit") {
    if (hitBudget > 2) return;
    hitBudget += 1;
  }
  switch (name) {
    case "arrow":
      noise(0.06, 0.05, 1400);
      tone(520, 0.07, "square", 0.03);
      break;
    case "bolt":
      noise(0.09, 0.08, 400);
      tone(180, 0.12, "sawtooth", 0.04, 0.7);
      break;
    case "stone":
      noise(0.14, 0.09, 140);
      tone(90, 0.16, "sine", 0.05, 0.6);
      break;
    case "fire":
      noise(0.2, 0.07, 280);
      tone(240, 0.18, "triangle", 0.03, 0.5);
      break;
    case "hit":
      noise(0.05, 0.04, 600);
      break;
    case "kill":
      tone(620, 0.08, "triangle", 0.04);
      tone(880, 0.1, "sine", 0.03);
      break;
    case "build":
      noise(0.1, 0.07, 220);
      tone(160, 0.14, "square", 0.03);
      break;
    case "leak":
      noise(0.2, 0.08, 90);
      tone(140, 0.3, "sawtooth", 0.04, 0.5);
      break;
    case "horn":
      tone(330, 0.35, "sawtooth", 0.04);
      tone(495, 0.4, "triangle", 0.03);
      break;
    case "win":
      tone(392, 0.18, "triangle", 0.05);
      setTimeout(() => tone(523, 0.18, "triangle", 0.05), 140);
      setTimeout(() => tone(659, 0.28, "triangle", 0.05), 280);
      break;
    case "lose":
      tone(311, 0.3, "sine", 0.05, 0.7);
      tone(196, 0.5, "triangle", 0.04, 0.6);
      break;
    case "coin":
      tone(980, 0.07, "sine", 0.03);
      break;
    case "raise":
      noise(0.16, 0.08, 160);
      tone(220, 0.2, "square", 0.035, 1.4);
      break;
    default:
      break;
  }
}

export function resetHitBudget() {
  hitBudget = 0;
}

export function tickMusic(now: number, marching: boolean) {
  if (!ctx || muted) return;
  if (now < nextBeat) return;
  nextBeat = now + (marching ? 0.46 : 0.92);
  noise(marching ? 0.05 : 0.07, marching ? 0.035 : 0.018, 160);
  const scale = [196, 220, 247, 262, 294, 247];
  const note = scale[beat % scale.length]!;
  tone(note / (marching ? 1 : 2), marching ? 0.22 : 0.4, "sine", marching ? 0.02 : 0.015);
  if (beat % 4 === 0) tone(note * 1.5, 0.18, "triangle", 0.012);
  beat += 1;
}

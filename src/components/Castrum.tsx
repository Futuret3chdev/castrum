import { useEffect, useState, useSyncExternalStore } from "react";
import {
  BookOpen,
  Castle,
  CircleDot,
  Crosshair,
  Flame,
  Pause,
  Play,
  Shield,
  Target,
  Volume2,
  VolumeX,
  X,
  Zap,
} from "lucide-react";
import { ENEMIES, ENEMY_KINDS, MASONRY, TOWER_KINDS, TOWERS, type TargetMode, type TowerKind } from "@/game/balance";
import { unlockAudio } from "@/game/audio";
import { send, type Command } from "@/game/commands";
import { getHud, subscribeHud } from "@/game/hud";

const ICONS: Record<TowerKind, typeof Crosshair> = {
  scorpio: Zap,
  sagittarii: Target,
  cohort: Shield,
  ballista: Crosshair,
  naphtha: Flame,
  onager: CircleDot,
};

const MODES: TargetMode[] = ["first", "last", "near", "strong"];
const MODE_NAME: Record<TargetMode, string> = {
  first: "First",
  last: "Last",
  near: "Near",
  strong: "Strong",
};

function useHud() {
  return useSyncExternalStore(subscribeHud, getHud, getHud);
}

function press(command: Command) {
  unlockAudio();
  send(command);
}

export function Castrum() {
  const hud = useHud();
  const [bootError, setBootError] = useState<string | null>(null);

  useEffect(() => {
    const gl = document.querySelector<HTMLCanvasElement>("canvas.gl");
    const fx = document.querySelector<HTMLCanvasElement>("canvas.fx");
    const stage = document.querySelector<HTMLElement>(".stage");
    if (!gl || !fx || !stage) return;
    let dead = false;
    let handle: { dispose: () => void } | null = null;
    void import("@/game/runtime")
      .then((mod) => {
        if (dead) return;
        try {
          handle = mod.mountGame(gl, fx, stage);
        } catch (err) {
          setBootError(err instanceof Error ? err.message : "The battlefield failed to open.");
        }
      })
      .catch((err: unknown) => {
        setBootError(err instanceof Error ? err.message : "The battlefield failed to open.");
      });
    return () => {
      dead = true;
      handle?.dispose();
    };
  }, []);

  const gatePct = hud.fortMax > 0 ? Math.max(0, Math.min(100, (hud.fort / hud.fortMax) * 100)) : 0;
  const showDock = hud.phase === "playing" || hud.phase === "paused";

  return (
    <div className="castrum">
      {hud.phase !== "menu" && (
        <header className="hud">
          <div className="brand">
            <span className="eyebrow">Legio IX</span>
            <span className="word">CASTRUM</span>
          </div>
          <div className="stat">
            <span>Denarii</span>
            <strong className="bump" key={hud.gold}>
              {hud.gold}
            </strong>
          </div>
          <div className="stat gate">
            <span>Gate {hud.fort}</span>
            <div className="gate-bar" aria-hidden="true">
              <span className="gate-fill" style={{ width: `${gatePct}%` }} />
            </div>
          </div>
          <div className="stat">
            <span>Wave</span>
            <strong>{hud.wave === 0 ? "—" : hud.endless ? String(hud.wave) : `${hud.wave}/15`}</strong>
          </div>
          {hud.boss && (
            <div className="stat boss">
              <span>
                {hud.boss.name} {Math.ceil(hud.boss.hp)}
              </span>
              <div className="gate-bar">
                <span className="gate-fill" style={{ width: `${Math.max(0, (hud.boss.hp / hud.boss.max) * 100)}%` }} />
              </div>
            </div>
          )}
          <div className="hud-actions">
            <button className="primary" disabled={!hud.canStart} onClick={() => press({ t: "wave" })}>
              {hud.fighting ? "Host on the road" : "Sound the bucina"}
            </button>
            <button className="ghost" onClick={() => press({ t: "masonry" })} disabled={hud.masonryCost == null}>
              <Castle size={16} aria-hidden="true" /> {hud.masonryNext ?? "Castrum complete"}
              {hud.masonryCost != null ? ` · ${hud.masonryCost}` : ""}
            </button>
            <button className="icon-btn" onClick={() => press({ t: "speed" })} aria-label={`Speed times ${hud.speed}`}>
              ×{hud.speed}
            </button>
            <button
              className="icon-btn"
              onClick={() => press({ t: "pause" })}
              aria-label={hud.phase === "paused" ? "Resume" : "Pause"}
            >
              {hud.phase === "paused" ? <Play size={18} /> : <Pause size={18} />}
            </button>
            <button
              className="icon-btn"
              data-on={hud.muted ? "true" : "false"}
              onClick={() => press({ t: "mute" })}
              aria-label={hud.muted ? "Unmute" : "Mute"}
            >
              {hud.muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </button>
            <button className="icon-btn" onClick={() => press({ t: "manual", open: true })} aria-label="Field manual">
              <BookOpen size={18} />
            </button>
          </div>
        </header>
      )}

      <div className="stage">
        <canvas className="gl" aria-label="Roman battlefield" />
        <canvas className="fx" aria-hidden="true" />
        {hud.phase !== "menu" && <div className="banner">{hud.banner}</div>}
        {bootError && <p className="boot-error">{bootError}</p>}

        {hud.phase === "menu" && (
          <section className="menu">
            <p className="eyebrow">Legio IX Hispana</p>
            <h1>CASTRUM</h1>
            <p className="lede">Build the fort. Hold the ford. The far bank is already moving.</p>
            <ol className="steps">
              <li>Choose an engine and set it on a stone pad.</li>
              <li>Raise the castrum — click the fort, or the masonry order.</li>
              <li>Sound the bucina when you want the next host.</li>
            </ol>
            <div className="menu-actions">
              <button className="primary" data-testid="begin" onClick={() => press({ t: "start" })}>
                Take command
              </button>
              <button className="ghost" onClick={() => press({ t: "manual", open: true })}>
                Field manual
              </button>
            </div>
            {hud.best > 0 && <p className="best">Best gloria {hud.best}</p>}
          </section>
        )}

        {hud.phase === "paused" && (
          <section className="pause-card">
            <p className="eyebrow">Standards lowered</p>
            <h2>PAUSED</h2>
            <p className="lede">The host waits. So can you.</p>
            <button className="primary" onClick={() => press({ t: "pause" })}>
              Resume the watch
            </button>
          </section>
        )}

        {(hud.phase === "victory" || hud.phase === "defeat") && (
          <section className="endcard">
            <p className="eyebrow">{hud.phase === "victory" ? "The ford holds" : "The gate is broken"}</p>
            <h2>{hud.phase === "victory" ? "ROME REMEMBERS" : "FALL BACK"}</h2>
            <p className="lede">
              Gloria {hud.gloria}. Waves held {hud.cleared}. Kills {hud.kills}. Gate {hud.fort}.
            </p>
            <p className="best">Best gloria {hud.best}</p>
            <div className="end-actions">
              <button className="primary" onClick={() => press({ t: "again" })}>
                March again
              </button>
              {hud.phase === "victory" && (
                <button className="ghost" onClick={() => press({ t: "endless" })}>
                  Hold the night
                </button>
              )}
              <button className="ghost" onClick={() => press({ t: "camp" })}>
                Return to camp
              </button>
            </div>
          </section>
        )}

        {hud.manual && (
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="manual-title">
            <header>
              <h2 id="manual-title">FIELD MANUAL</h2>
              <button className="icon-btn" onClick={() => press({ t: "manual", open: false })} aria-label="Close manual">
                <X size={18} />
              </button>
            </header>
            <p>
              Engines shoot whoever is furthest down the road unless you change their aim. First protects the gate.
              Stones and oil punish armor, rams, and elephants. Keys: 1–6 arm an engine, Space calls the host, U
              improves the selected engine, M raises the fort, T cycles aim, Q changes speed, Esc pauses.
            </p>
            <div className="manual-grid">
              {TOWER_KINDS.map((kind) => {
                const tower = TOWERS[kind];
                return (
                  <article key={kind}>
                    <p className="latin">
                      {tower.latin} · {tower.cost}
                    </p>
                    <h3>{tower.name}</h3>
                    <p>{tower.blurb}</p>
                  </article>
                );
              })}
              {ENEMY_KINDS.map((kind) => {
                const foe = ENEMIES[kind];
                return (
                  <article key={kind}>
                    <p className="latin">Hostile · {foe.gold} denarii</p>
                    <h3>{foe.name}</h3>
                    <p>{foe.blurb}</p>
                  </article>
                );
              })}
              {MASONRY.slice(1).map((tier) => (
                <article key={tier.name}>
                  <p className="latin">Masonry · {tier.cost}</p>
                  <h3>{tier.name}</h3>
                  <p>{tier.blurb}</p>
                </article>
              ))}
            </div>
          </div>
        )}
      </div>

      {showDock && (
        <footer className="dock">
          {hud.selected && (
            <div className="inspector">
              <div className="who">
                <strong>
                  {TOWERS[hud.selected.kind].name} · {hud.selected.level}
                </strong>
                <span className="meta">{hud.selected.kills} kills</span>
              </div>
              {MODES.map((mode) => (
                <button
                  key={mode}
                  className="chip"
                  data-on={hud.selected?.mode === mode ? "true" : "false"}
                  onClick={() => press({ t: "mode", mode })}
                >
                  {MODE_NAME[mode]}
                </button>
              ))}
              <button className="ghost" disabled={hud.selected.upgrade == null} onClick={() => press({ t: "upgrade" })}>
                Improve{hud.selected.upgrade != null ? ` · ${hud.selected.upgrade}` : ""}
              </button>
              <button className="danger" onClick={() => press({ t: "sell" })}>
                Dismantle · {hud.selected.sell}
              </button>
            </div>
          )}
          <p className="dock-note">{hud.preview}</p>
          <div className="cards">
            {TOWER_KINDS.map((kind) => {
              const tower = TOWERS[kind];
              const Icon = ICONS[kind];
              const poor = hud.gold < tower.cost;
              return (
                <button
                  key={kind}
                  className="tcard"
                  data-on={hud.armed === kind ? "true" : "false"}
                  data-poor={poor && hud.armed !== kind ? "true" : "false"}
                  onClick={() => press({ t: "arm", kind })}
                >
                  <span className="top">
                    <Icon size={16} aria-hidden="true" />
                    <span className="pip" style={{ ["--pip" as string]: tower.pennant }} />
                    <span className="kbd">{tower.hotkey}</span>
                  </span>
                  <b>{tower.name}</b>
                  <span className="meta">{tower.cost} denarii</span>
                </button>
              );
            })}
          </div>
        </footer>
      )}
    </div>
  );
}

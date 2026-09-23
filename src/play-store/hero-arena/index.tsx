"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { LogEntry, LogKind } from "./engine/types";
import ActionBar from "./components/ActionBar";
import Arena from "./components/Arena";
import DiceTray from "./components/DiceTray";
import HeroSelect from "./components/HeroSelect";
import Hud from "./components/Hud";
import ResultOverlay from "./components/ResultOverlay";
import { useDuel } from "./state/useDuel";

const REVEAL_MS = 750;

const LOG_STYLES: Record<LogKind, string> = {
  info: "text-[var(--ftf-frost-dim)]",
  damage: "text-red-400",
  heal: "text-emerald-400",
  status: "text-amber-400",
  crit: "font-semibold text-orange-300",
  system: "text-[var(--ftf-ice)]",
};

function BattleLog({ log }: { log: LogEntry[] }) {
  const container = useRef<HTMLDivElement>(null);
  const lastId = log.length > 0 ? log[log.length - 1].id : 0;

  useEffect(() => {
    const node = container.current;
    if (node) {
      node.scrollTop = node.scrollHeight;
    }
  }, [lastId]);

  return (
    <section className="flex flex-col gap-2">
      <h2
        className="ftf-ornament text-xs font-bold uppercase tracking-widest"
        style={{ color: "var(--ftf-ice)" }}
      >
        Battle Chronicle
      </h2>
      <div
        ref={container}
        className="ftf-panel h-44 overflow-y-auto p-3"
      >
        <ol className="flex flex-col gap-1 text-xs leading-5">
          {log.map((entry) => (
            <li key={entry.id} className={LOG_STYLES[entry.kind]}>
              <span
                className="mr-2 font-mono text-[10px]"
                style={{ color: "var(--ftf-ice-dim)" }}
              >
                R{entry.round}
              </span>
              {entry.text}
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

export default function HeroArena() {
  const { setup, state, start, roll, act, rematch, quit, isAiTurn } = useDuel();
  const [revealing, setRevealing] = useState(false);
  const revealTimer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (revealTimer.current !== null) {
        window.clearTimeout(revealTimer.current);
      }
    },
    [],
  );

  const handleRoll = useCallback(() => {
    roll();
    setRevealing(true);
    if (revealTimer.current !== null) {
      window.clearTimeout(revealTimer.current);
    }
    revealTimer.current = window.setTimeout(() => {
      setRevealing(false);
      revealTimer.current = null;
    }, REVEAL_MS);
  }, [roll]);

  if (!setup || !state) {
    return <HeroSelect onStart={start} />;
  }

  const { phase } = state;
  const activeHero = state.turn
    ? state.turn === "p1"
      ? state.p1.hero.name
      : state.p2.hero.name
    : null;

  const hint =
    phase === "finished"
      ? "Duel complete"
      : phase === "rolling"
        ? "Roll the hidden dice"
        : isAiTurn
          ? "Opponent is choosing…"
          : setup.mode === "both"
            ? `${activeHero} acts`
            : "Your turn";

  const canAct = phase === "acting" && !isAiTurn && !revealing;

  return (
    <div className="relative flex flex-col gap-5">
      <header className="ftf-panel ftf-frost-shimmer flex flex-wrap items-center justify-between gap-3 px-5 py-3">
        <div className="flex items-center gap-4">
          <h1
            className="text-xl font-bold tracking-wide uppercase"
            style={{
              color: "var(--ftf-ice-bright)",
              textShadow: "0 1px 4px rgba(0,0,0,0.7), 0 0 14px rgba(108,180,238,0.2)",
            }}
          >
            ❄ Hero Arena
          </h1>
          <span
            className="rounded-sm border px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider"
            style={{
              borderColor: "var(--ftf-ice-dim)",
              backgroundColor: "rgba(108,180,238,0.08)",
              color: "var(--ftf-ice)",
            }}
          >
            {setup.mode === "ai" ? "Vs AI" : "Control Both"}
          </span>
          <span
            className="text-xs font-semibold"
            style={{ color: "var(--ftf-frost-dim)" }}
          >
            Round {state.round}
          </span>
        </div>
        <button
          type="button"
          onClick={quit}
          className="ftf-btn rounded-sm px-3 py-1.5 text-xs font-bold uppercase tracking-wider"
        >
          New Heroes
        </button>
      </header>

      <DiceTray
        state={state}
        onRoll={handleRoll}
        revealing={revealing}
        disabled={phase !== "rolling"}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Hud
          combatant={state.p1}
          active={phase === "acting" && state.turn === "p1"}
        />
        <Hud
          combatant={state.p2}
          active={phase === "acting" && state.turn === "p2"}
          align="right"
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <Arena state={state} />

        <div className="flex flex-col gap-5">
          {phase === "acting" && state.turn ? (
            <ActionBar
              state={state}
              side={state.turn}
              onAction={act}
              disabled={!canAct}
              hint={hint}
            />
          ) : (
            <p
              className="text-sm font-semibold"
              style={{ color: "var(--ftf-ice)" }}
              role="status"
              aria-live="polite"
            >
              {hint}
            </p>
          )}
          <BattleLog log={state.log} />
        </div>
      </div>

      {phase === "finished" ? (
        <ResultOverlay state={state} onRematch={rematch} onQuit={quit} />
      ) : null}
    </div>
  );
}

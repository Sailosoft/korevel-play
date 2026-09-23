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
  info: "text-zinc-400",
  damage: "text-rose-300",
  heal: "text-emerald-300",
  status: "text-amber-300",
  crit: "font-semibold text-orange-300",
  system: "text-indigo-300",
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
      <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">
        Battle log
      </h2>
      <div
        ref={container}
        className="h-44 overflow-y-auto rounded-xl border border-white/10 bg-zinc-950/60 p-3"
      >
        <ol className="flex flex-col gap-1 text-xs leading-5">
          {log.map((entry) => (
            <li key={entry.id} className={LOG_STYLES[entry.kind]}>
              <span className="mr-2 font-mono text-[10px] text-zinc-600">
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
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">
            Hero Arena
          </h1>
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-zinc-400">
            {setup.mode === "ai" ? "Vs AI" : "Control Both"}
          </span>
          <span className="text-xs text-zinc-500">Round {state.round}</span>
        </div>
        <button
          type="button"
          onClick={quit}
          className="rounded-lg border border-white/15 px-3 py-1.5 text-sm text-zinc-300 transition hover:bg-white/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-400"
        >
          New heroes
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
              className="text-sm text-indigo-300"
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

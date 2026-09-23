"use client";

import { INITIATIVE_FACES, speedBonus } from "../engine/combat";
import type { CombatState, Side } from "../engine/types";

type DieState = "hidden" | "tumbling" | "revealed" | "winner";

function Die({
  label,
  color,
  value,
  bonus,
  state,
}: {
  label: string;
  color: string;
  value: number | null;
  bonus: number;
  state: DieState;
}) {
  const shown = (state === "revealed" || state === "winner") && value !== null;

  return (
    <div
      className={`flex flex-col items-center gap-2 ${
        state === "tumbling" ? "dice-tumbling" : ""
      }`}
    >
      <span className="max-w-20 truncate text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
        {label}
      </span>
      <div
        className={`flex h-16 w-16 items-center justify-center rounded-2xl border-2 text-2xl font-bold tabular-nums transition-transform duration-200 ${
          state === "winner" ? "scale-110 bg-indigo-500/15" : "bg-zinc-950/70"
        }`}
        style={{
          borderColor: shown ? color : "#3f3f46",
          color: shown ? color : "#71717a",
        }}
        role="img"
        aria-label={shown ? `${label} rolled ${value}` : `${label} die hidden`}
      >
        {shown ? value : "?"}
      </div>
      <span className="font-mono text-[11px] text-zinc-500">
        {bonus > 0 ? `+${bonus} spd` : "spd +0"}
      </span>
    </div>
  );
}

export default function DiceTray({
  state,
  onRoll,
  revealing,
  disabled,
}: {
  state: CombatState;
  onRoll: () => void;
  revealing: boolean;
  disabled: boolean;
}) {
  const { initiative, phase } = state;

  const dieState = (side: Side): DieState => {
    if (!initiative) {
      return "hidden";
    }
    if (revealing) {
      return "tumbling";
    }
    return initiative.winner === side ? "winner" : "revealed";
  };

  const winnerName = initiative
    ? initiative.winner === "p1"
      ? state.p1.hero.name
      : state.p2.hero.name
    : null;

  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-zinc-900/70 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">
          Hidden dice
        </h2>
        <span className="text-xs text-zinc-500">d{INITIATIVE_FACES} + speed</span>
      </div>

      <div className="flex items-center justify-center gap-6">
        <Die
          label={state.p1.hero.name}
          color={state.p1.hero.color}
          value={initiative?.p1 ?? null}
          bonus={speedBonus(state.p1)}
          state={dieState("p1")}
        />
        <span className="text-xs font-semibold uppercase tracking-wider text-zinc-600">
          vs
        </span>
        <Die
          label={state.p2.hero.name}
          color={state.p2.hero.color}
          value={initiative?.p2 ?? null}
          bonus={speedBonus(state.p2)}
          state={dieState("p2")}
        />
      </div>

      <p
        className="min-h-5 text-center text-sm"
        role="status"
        aria-live="polite"
      >
        {phase === "rolling" ? (
          <span className="text-zinc-400">
            Both heroes roll in secret — the highest total acts.
          </span>
        ) : initiative && !revealing ? (
          <span className="text-indigo-300">
            {initiative.p1Total} vs {initiative.p2Total} — {winnerName} acts and
            rolls a d6 for damage.
          </span>
        ) : (
          <span className="text-zinc-500">Revealing…</span>
        )}
      </p>

      {phase === "rolling" ? (
        <button
          type="button"
          onClick={onRoll}
          disabled={disabled}
          className="rounded-xl bg-indigo-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-300 disabled:opacity-40"
        >
          Roll the dice
        </button>
      ) : null}

      {state.lastAction && state.lastAction.damageDie > 0 ? (
        <p className="text-center font-mono text-xs text-zinc-500">
          Last damage die: {state.lastAction.damageDie} (x
          {state.lastAction.damageMultiplier.toFixed(2)})
        </p>
      ) : null}
    </section>
  );
}

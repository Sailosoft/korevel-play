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
      <span
        className="max-w-20 truncate text-[11px] font-bold uppercase tracking-widest"
        style={{ color: "var(--ftf-frost-dim)" }}
      >
        {label}
      </span>
      <div
        className={`flex h-16 w-16 items-center justify-center border-2 text-2xl font-bold tabular-nums transition-transform duration-200 ${
          state === "winner" ? "scale-110" : ""
        }`}
        style={{
          borderColor: shown ? color : "var(--ftf-steel-border)",
          backgroundColor: state === "winner" ? "rgba(108,180,238,0.1)" : "var(--ftf-steel-dark)",
          color: shown ? color : "var(--ftf-frost-dim)",
          boxShadow: state === "winner"
            ? `0 0 14px ${color}40, inset 0 0 8px ${color}20`
            : "inset 0 1px 4px rgba(0,0,0,0.5)",
        }}
        role="img"
        aria-label={shown ? `${label} rolled ${value}` : `${label} die hidden`}
      >
        {shown ? value : "?"}
      </div>
      <span className="font-mono text-[11px]" style={{ color: "var(--ftf-frost-dim)" }}>
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
    <section className="ftf-panel ftf-frost-shimmer flex flex-col gap-3 p-4">
      <div className="flex items-center justify-between">
        <h2
          className="ftf-ornament text-xs font-bold uppercase tracking-widest"
          style={{ color: "var(--ftf-ice)" }}
        >
          Hidden Dice
        </h2>
        <span className="text-xs font-semibold" style={{ color: "var(--ftf-frost-dim)" }}>
          d{INITIATIVE_FACES} + speed
        </span>
      </div>

      <div className="flex items-center justify-center gap-6">
        <Die
          label={state.p1.hero.name}
          color={state.p1.hero.color}
          value={initiative?.p1 ?? null}
          bonus={speedBonus(state.p1)}
          state={dieState("p1")}
        />
        <span
          className="text-xs font-bold uppercase tracking-widest"
          style={{ color: "var(--ftf-ice-dim)" }}
        >
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
          <span style={{ color: "var(--ftf-frost-dim)" }}>
            Both heroes roll in secret — the highest total acts.
          </span>
        ) : initiative && !revealing ? (
          <span style={{ color: "var(--ftf-ice)" }}>
            {initiative.p1Total} vs {initiative.p2Total} — {winnerName} acts and
            rolls a d6 for damage.
          </span>
        ) : (
          <span style={{ color: "var(--ftf-frost-dim)" }}>Revealing…</span>
        )}
      </p>

      {phase === "rolling" ? (
        <button
          type="button"
          onClick={onRoll}
          disabled={disabled}
          className="ftf-btn-primary rounded-sm px-5 py-2.5 text-sm uppercase tracking-wider"
        >
          Roll the Dice
        </button>
      ) : null}

      {state.lastAction && state.lastAction.damageDie > 0 ? (
        <p className="text-center font-mono text-xs" style={{ color: "var(--ftf-frost-dim)" }}>
          Last damage die: {state.lastAction.damageDie} (x
          {state.lastAction.damageMultiplier.toFixed(2)})
        </p>
      ) : null}
    </section>
  );
}

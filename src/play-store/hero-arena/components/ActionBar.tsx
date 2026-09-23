import { ACTION_LABELS, getActionAvailability } from "../engine/combat";
import type { ActionId, CombatState, Side } from "../engine/types";

const BUTTON_ACCENT: Record<ActionId, string> = {
  attack: "hover:border-zinc-300/60 hover:bg-white/10",
  skill: "hover:border-sky-400/60 hover:bg-sky-500/10",
  ultimate: "hover:border-amber-400/60 hover:bg-amber-500/10",
  defend: "hover:border-emerald-400/60 hover:bg-emerald-500/10",
};

function sublabel(
  action: ActionId,
  enabled: boolean,
  reason: string | undefined,
  mpCost: number,
  cooldown: number,
): string {
  if (!enabled) {
    return reason ?? "Unavailable";
  }
  if (cooldown > 0) {
    return `Cooldown ${cooldown}`;
  }
  if (action === "defend") {
    return "Guard + MP";
  }
  return mpCost > 0 ? `${mpCost} MP` : "No MP";
}

export default function ActionBar({
  state,
  side,
  onAction,
  disabled,
  hint,
}: {
  state: CombatState;
  side: Side;
  onAction: (action: ActionId) => void;
  disabled: boolean;
  hint: string;
}) {
  const combatant = side === "p1" ? state.p1 : state.p2;
  const { hero } = combatant;
  const availability = getActionAvailability(state, side);

  const titleFor = (action: ActionId) => {
    if (action === "skill") return hero.skill.name;
    if (action === "ultimate") return hero.ultimate.name;
    return ACTION_LABELS[action];
  };

  return (
    <section className="flex flex-col gap-3" aria-label="Actions">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">
          Actions
        </h2>
        <p className="text-sm text-indigo-300" role="status" aria-live="polite">
          {hint}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {availability.map((entry) => {
          const isDisabled = disabled || !entry.enabled;
          return (
            <button
              key={entry.action}
              type="button"
              onClick={() => onAction(entry.action)}
              disabled={isDisabled}
              title={
                entry.action === "skill"
                  ? hero.skill.description
                  : entry.action === "ultimate"
                    ? hero.ultimate.description
                    : undefined
              }
              className={`flex min-h-20 flex-col items-start justify-between gap-1 rounded-xl border border-white/10 bg-zinc-900/70 p-3 text-left transition disabled:cursor-not-allowed disabled:opacity-40 ${
                isDisabled ? "" : BUTTON_ACCENT[entry.action]
              }`}
            >
              <span className="text-sm font-semibold text-zinc-100">
                {titleFor(entry.action)}
              </span>
              <span className="text-xs text-zinc-400">
                {sublabel(
                  entry.action,
                  entry.enabled,
                  entry.reason,
                  entry.mpCost,
                  entry.cooldown,
                )}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

import type { CombatState } from "../engine/types";

export default function ResultOverlay({
  state,
  onRematch,
  onQuit,
}: {
  state: CombatState;
  onRematch: () => void;
  onQuit: () => void;
}) {
  const { winner } = state;
  const winnerCombatant =
    winner === "p1" ? state.p1 : winner === "p2" ? state.p2 : null;

  const headline =
    winnerCombatant ? `${winnerCombatant.hero.name} wins!` : "Draw";

  return (
    <div
      className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-zinc-950/80 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Duel result"
    >
      <div className="flex w-full max-w-sm flex-col items-center gap-4 rounded-2xl border border-white/10 bg-zinc-900 p-6 text-center">
        <span
          className="h-4 w-4 rounded-full"
          style={{
            backgroundColor: winnerCombatant?.hero.color ?? "#a1a1aa",
          }}
          aria-hidden="true"
        />
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-semibold text-zinc-50">{headline}</h2>
          <p className="text-sm text-zinc-400">
            {winnerCombatant
              ? `Survived with ${Math.max(0, Math.ceil(winnerCombatant.hp))} HP after ${state.round} rounds.`
              : `Both heroes fell in round ${state.round}.`}
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={onRematch}
            className="flex-1 rounded-xl bg-indigo-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-300"
          >
            Rematch
          </button>
          <button
            type="button"
            onClick={onQuit}
            className="flex-1 rounded-xl border border-white/15 px-4 py-2.5 text-sm font-semibold text-zinc-200 transition hover:bg-white/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-400"
          >
            New heroes
          </button>
        </div>
      </div>
    </div>
  );
}

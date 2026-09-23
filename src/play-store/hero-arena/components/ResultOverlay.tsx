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
      className="absolute inset-0 z-10 flex items-center justify-center p-4"
      style={{
        backgroundColor: "rgba(6,8,16,0.9)",
        backdropFilter: "blur(4px)",
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Duel result"
    >
      <div className="ftf-panel flex w-full max-w-sm flex-col items-center gap-4 p-6 text-center">
        <div className="ftf-divider w-full" />

        <span
          className="h-5 w-5 rounded-full"
          style={{
            backgroundColor: winnerCombatant?.hero.color ?? "var(--ftf-frost-dim)",
            boxShadow: `0 0 18px ${winnerCombatant?.hero.color ?? "var(--ftf-frost-dim)"}60`,
          }}
          aria-hidden="true"
        />

        <div className="flex flex-col gap-1">
          <h2
            className="text-2xl font-bold uppercase tracking-wide"
            style={{
              color: "var(--ftf-ice-bright)",
              textShadow: "0 2px 8px rgba(0,0,0,0.7), 0 0 18px rgba(108,180,238,0.2)",
            }}
          >
            {headline}
          </h2>
          <p className="text-sm" style={{ color: "var(--ftf-frost-dim)" }}>
            {winnerCombatant
              ? `Survived with ${Math.max(0, Math.ceil(winnerCombatant.hp))} HP after ${state.round} rounds.`
              : `Both heroes fell in round ${state.round}.`}
          </p>
        </div>

        <div className="ftf-divider w-full" />

        <div className="flex w-full flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={onRematch}
            className="ftf-btn-primary flex-1 rounded-sm px-4 py-2.5 text-sm uppercase tracking-wider"
          >
            Rematch
          </button>
          <button
            type="button"
            onClick={onQuit}
            className="ftf-btn flex-1 rounded-sm px-4 py-2.5 text-sm font-bold uppercase tracking-wider"
          >
            New Heroes
          </button>
        </div>
      </div>
    </div>
  );
}

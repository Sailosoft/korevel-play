"use client";

import dynamic from "next/dynamic";
import type { CombatState } from "../engine/types";

const ArenaScene = dynamic(() => import("./ArenaScene"), {
  ssr: false,
  loading: () => <ArenaPlaceholder />,
});

function ArenaPlaceholder() {
  return (
    <div className="flex h-full w-full items-center justify-center text-sm" style={{ color: "var(--ftf-frost-dim)" }}>
      Loading arena…
    </div>
  );
}

export default function Arena({ state }: { state: CombatState }) {
  return (
    <div className="ftf-panel h-72 w-full overflow-hidden sm:h-96">
      <ArenaScene state={state} />
    </div>
  );
}

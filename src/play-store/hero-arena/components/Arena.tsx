"use client";

import dynamic from "next/dynamic";
import type { CombatState } from "../engine/types";

const ArenaScene = dynamic(() => import("./ArenaScene"), {
  ssr: false,
  loading: () => <ArenaPlaceholder />,
});

function ArenaPlaceholder() {
  return (
    <div className="flex h-full w-full items-center justify-center text-sm text-zinc-500">
      Loading arena…
    </div>
  );
}

export default function Arena({ state }: { state: CombatState }) {
  return (
    <div className="h-72 w-full overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-zinc-900 to-zinc-950 sm:h-96">
      <ArenaScene state={state} />
    </div>
  );
}

# Plan: Next.js + Tailwind + Three.js "Play Store" with first game `hero-arena`

## Goal
Bootstrap a fresh Next.js (App Router, `src/`, TypeScript, Tailwind) project in the empty repo at
`korevel-play`, add a typed registry module + hub page that lists all routes/apps, integrate
Three.js via React Three Fiber, and ship the first game `hero-arena`: a turn-based 1v1 hero duel
where you pick both heroes and fight either vs AI or controlling both sides. Build with `bun run build`.

## Locked decisions
- Framework: Next.js latest (App Router), TypeScript, `src/` directory, ESLint.
- Styling: Tailwind (v4, CSS-first `@import "tailwindcss"` — the create-next-app default).
- 3D: `three` + `@react-three/fiber` + `@react-three/drei` (declarative React scene).
- Package manager / build: **bun**; required build command `bun run build`.
- Catalog: single typed registry module (`src/play-store/registry.ts`) + a `/play-store` hub page
  and a catalog home page that render it with links.
- Game: `src/play-store/hero-arena`, route `/play-store/hero-arena`.
- Game concept: **not RPG progression**. Self-contained 1v1 duel. Player selects their hero and the
  opponent's hero, then they fight turn by turn.
- Control modes: **Vs AI** (opponent auto-plays) and **Control Both** (hot-seat; user inputs each
  side's action on its turn).
- Duel depth: **full kit** — Attack / Skill / Ultimate / Defend, HP + MP, cooldowns, crits,
  status effects, and one passive per hero.
- Roster: **6 heroes** with distinct stats and one signature ability each.

## Stack / dependencies
- Runtime: `next`, `react`, `react-dom`, `three`, `@react-three/fiber`, `@react-three/drei`.
- Dev: `typescript`, `@types/react`, `@types/react-dom`, `@types/node`, `@types/three`,
  `tailwindcss`, `@tailwindcss/postcss`, `postcss`, `eslint`, `eslint-config-next`.
- Tests: built-in `bun test` (no extra dep) for the pure combat engine.

## Target file tree
```
korevel-play/
├─ package.json                 (scripts: dev, build, start, lint, test)
├─ next.config.ts
├─ tsconfig.json                (paths: "@/*" -> "src/*")
├─ postcss.config.mjs
├─ eslint.config.mjs
├─ src/
│  ├─ app/
│  │  ├─ layout.tsx             (root layout, metadata, globals.css)
│  │  ├─ globals.css            (@import "tailwindcss")
│  │  ├─ page.tsx               (home: catalog of apps)
│  │  └─ play-store/
│  │     ├─ page.tsx            (hub: lists every registry entry)
│  │     └─ hero-arena/
│  │        └─ page.tsx         (server page rendering <HeroArena/>)
│  ├─ components/
│  │  └─ AppCatalog.tsx         (renders registry entries as cards/links)
│  └─ play-store/
│     ├─ types.ts               (PlayStoreApp type)
│     ├─ registry.ts            (PLAY_STORE_APPS + helpers)
│     └─ hero-arena/
│        ├─ index.tsx           ("use client" orchestrator: select -> battle -> result)
│        ├─ meta.ts             (app metadata consumed by registry)
│        ├─ constants.ts        (HEROES roster data)
│        ├─ engine/
│        │  ├─ types.ts         (Hero, Action, CombatState, StatusEffect, ...)
│        │  ├─ combat.ts        (pure, deterministic combat reducer + damage/crit/status logic)
│        │  ├─ ai.ts            (opponent action heuristic)
│        │  └─ combat.test.ts   (bun test: damage, crit, cooldown, status, win/lose)
│        ├─ state/
│        │  └─ useDuel.ts       (useReducer hook wrapping engine; mode + AI turn effects)
│        └─ components/
│           ├─ HeroSelect.tsx   (pick P1 hero, P2 hero, mode; start)
│           ├─ Arena.tsx        ("use client", dynamic Canvas ssr:false + scene)
│           ├─ HeroMesh.tsx     (3D hero: geometry + idle/attack animation)
│           ├─ Hud.tsx          (HP/MP bars, status icons, cooldown badges)
│           ├─ ActionBar.tsx    (Attack/Skill/Ultimate/Defend + turn indicator)
│           └─ ResultOverlay.tsx(win/lose + rematch)
```

## Combat engine spec (pure, testable)
- `Hero`: `{ id, name, archetype, maxHp, maxMp, atk, def, spd, critChance, critMult, passive, skill, ultimate }`.
- Actions:
  - `attack` — 0 MP, damage = `max(1, atk - def)`.
  - `skill` — signature, MP cost + cooldown (e.g. 2 turns), hero-specific effect (heavy hit, heal, DoT, stun).
  - `ultimate` — high MP + longer cooldown, big effect (large damage, heal, or AoE-style burst).
  - `defend` — halves incoming damage until your next turn, restores ~10% max MP.
- Damage: `base = max(1, atk * mult - def)`, apply passive modifiers, then crit (`critChance`, `critMult`),
  then a small random variance (seeded/injectable RNG for tests).
- Status effects (small set): `burn` (DoT), `stun` (skip turn), `weaken` (reduced ATK); each with duration,
  ticked at the start of the affected hero's turn.
- Turn order: by `spd` descending each round; ties broken by injected RNG.
- Terminal states: `hp <= 0` -> winner decided; handle simultaneous/DoT death deterministically.
- Passives (one each): e.g. Bulwark (dmg reduction <30% HP), Mana Surge (cheaper skills), Lethality
  (+crit chance), Berserk (+ATK <40% HP), Renewal (regen each turn), Precision (crits ignore DEF).
- `ai.ts`: heuristic — lethal attack if available, else ultimate/skill if affordable & off cooldown,
  else heal when low, else defend when out of MP, else basic attack.

## Registry spec
- `PlayStoreApp`: `{ slug, name, description, href, tags, status }`.
- `registry.ts` exports `PLAY_STORE_APPS: PlayStoreApp[]` (initially one entry built from
  `hero-arena/meta.ts`) plus `getApp(slug)` and `listApps()` helpers.
- `/` and `/play-store` render `AppCatalog` from the registry so adding a game folder + registry entry
  is the only step to surface a new app.

## Ordered tasks
1. Scaffold project: run `bunx create-next-app@latest . --ts --tailwind --eslint --app --src-dir --import-alias "@/*"` (empty dir, no commits). Verify `src/app`, Tailwind wired, `tsconfig` path alias.
2. Set `package.json` scripts to use bun; add `"test": "bun test"`. Confirm `bun run build` works on the bare scaffold.
3. Add three.js deps: `bun add three @react-three/fiber @react-three/drei` and `bun add -d @types/three`.
4. Create `src/play-store/types.ts` + `registry.ts` + `src/components/AppCatalog.tsx`; wire `/` and `/play-store` pages to render the catalog.
5. Add `hero-arena/meta.ts` and register it in the registry.
6. Implement engine: `engine/types.ts`, `engine/combat.ts` (seeded RNG injectable), `engine/ai.ts`.
7. Write `engine/combat.test.ts` covering damage, crit, cooldowns, status ticks, and win/lose; run `bun test`.
8. Implement `constants.ts` (6 heroes with stats/skills/ultimates/passives) and `state/useDuel.ts` reducer hook (mode handling + AI turn scheduling).
9. Build UI: `HeroSelect`, `Arena` (R3F Canvas, `ssr:false` dynamic import inside a client component), `HeroMesh`, `Hud`, `ActionBar`, `ResultOverlay`; compose in `index.tsx`.
10. Add `src/app/play-store/hero-arena/page.tsx` (server component) rendering the client `<HeroArena/>` with page metadata.
11. Polish: Tailwind styling, responsive layout, turn/status feedback, rematch flow, accessible buttons.
12. Update `AGENTS.md` with build/lint/test commands (`bun run build`, `bun run lint`, `bun test`).

## Validation
- `bun install` then `bun test` (engine tests pass).
- `bun run lint` clean.
- **`bun run build` succeeds** (required acceptance gate).
- Manual smoke via `bun run dev`: `/` and `/play-store` list the app; open `hero-arena`; select both
  heroes; play one battle in **Vs AI** and one in **Control Both**; verify HP/MP, cooldowns, crits,
  status effects, win/lose, and rematch.

## Risks / notes
- R3F `Canvas` is client-only. In Next 15 App Router, `dynamic(..., { ssr:false })` must live inside a
  `"use client"` module — do the dynamic import in `Arena.tsx`/`index.tsx`, not the server page.
- Tailwind v4 differs from v3 (no `tailwind.config.js` content array by default; CSS-first config) —
  follow whatever `create-next-app` generates rather than hand-rolling v3 config.
- `three` adds bundle weight; keep hero meshes primitive (boxes/capsules) to stay lean.

## Open questions (resolved unless noted)
- Control modes: Vs AI + Control Both — resolved.
- Depth: full kit (cooldowns/crits/passives) — resolved.
- Roster: 6 heroes — resolved.
- No open questions remaining; ready to implement.

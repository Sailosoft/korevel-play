<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Korevel Play

A Next.js (App Router, `src/`, TypeScript, Tailwind v4) catalog of small,
self-contained browser games. The stack also includes `three`,
`@react-three/fiber`, and `@react-three/drei` for 3D apps.

## Commands

- `bun install` — install dependencies
- `bun run dev` — start the dev server
- `bun run build` — production build; this is the required acceptance gate
- `bun run lint` — ESLint (flat config, run via the `eslint` CLI; `next lint` was removed in Next 16)
- `bun test` — run the pure combat-engine tests
  (`src/play-store/hero-arena/engine/combat.test.ts`)

Always run `bun run lint`, `bun test`, and `bun run build` before considering a
change done.

## Catalog architecture

Everything surfaced in the catalog comes from one typed registry:
`src/play-store/registry.ts`. To add an app:

1. Create `src/play-store/<slug>/` with a `meta.ts` exporting a `PlayStoreApp`.
2. Import that meta into `PLAY_STORE_APPS` in `src/play-store/registry.ts`.

`/` and `/play-store` both render `src/components/AppCatalog.tsx` from the
registry, so no page changes are needed.

## Conventions

- **Client-only 3D.** Keep `three` / `@react-three/fiber` / `@react-three/drei`
  imports out of the server graph. The pattern used here is a `"use client"`
  wrapper (`hero-arena/components/Arena.tsx`) that calls
  `dynamic(() => import("./ArenaScene"), { ssr: false })`; the scene module
  (`ArenaScene.tsx`) owns the `Canvas` and all 3D imports.
  `dynamic(..., { ssr: false })` is not allowed in a Server Component.
- **Pure, deterministic engine.** `src/play-store/hero-arena/engine/` is pure
  and has no React or DOM dependencies. All randomness flows through the
  serialized `rngState` on `CombatState` (see `makeRng`/`mulberry32` in
  `engine/combat.ts`), so reducers stay pure and safe under React's
  double-invocation in development. Keep it that way: no `Math.random()` in the
  engine, and pass an injected RNG into pure helpers when testing.
- **Dice-driven rounds.** Each round rolls a hidden d20 per hero (`roll` event)
  for initiative; the higher total (plus `speedBonus`) acts, then its action
  rolls a d6 that scales damage via `damageMultiplierForDie`. Round-start upkeep
  (cooldowns, Renewal, burn) lives in `tickRoundStart`. `ActionEffect.tsx`
  animates the result using `lastAction` + `actionSeq`.
- **Ability elements.** Every ability carries a `SkillElement` (`fire`, `ice`,
  `earth`, `storm`, `holy`, `shadow`, `physical`); the projectile colour comes
  from `ELEMENT_COLORS` in `constants.ts`.
- Keep hero geometry primitive (capsules, boxes, spheres) to limit bundle size.

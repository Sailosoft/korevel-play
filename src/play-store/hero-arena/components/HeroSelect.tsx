"use client";

import { useState } from "react";
import {
  DEFAULT_P1_HERO_ID,
  DEFAULT_P2_HERO_ID,
  HEROES,
  getHero,
} from "../constants";
import type { Hero } from "../engine/types";
import type { DuelMode, DuelSetup } from "../state/useDuel";

const MODES: { id: DuelMode; label: string; description: string }[] = [
  {
    id: "ai",
    label: "Vs AI",
    description: "You control Player 1. The opponent picks its own actions.",
  },
  {
    id: "both",
    label: "Control Both",
    description: "Hot-seat: you choose every action for both heroes.",
  },
];

function HeroOption({
  hero,
  selected,
  onSelect,
}: {
  hero: Hero;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`flex flex-col gap-1.5 rounded-xl border p-3 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400 ${
        selected
          ? "border-indigo-400 bg-indigo-500/10"
          : "border-white/10 bg-zinc-900/60 hover:border-white/25 hover:bg-zinc-900"
      }`}
    >
      <span className="flex items-center gap-2">
        <span
          className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: hero.color }}
          aria-hidden="true"
        />
        <span className="truncate text-sm font-semibold text-zinc-100">
          {hero.name}
        </span>
      </span>
      <span className="text-xs text-zinc-400">{hero.archetype}</span>
      <span className="font-mono text-[11px] text-zinc-500">
        HP {hero.maxHp} · ATK {hero.atk} · DEF {hero.def} · SPD {hero.spd} · CRIT{" "}
        {Math.round(hero.critChance * 100)}%
      </span>
      <span className="text-[11px] text-zinc-500">{hero.passive.name}</span>
    </button>
  );
}

function SidePicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <fieldset className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-zinc-950/40 p-4">
      <legend className="px-1 text-sm font-semibold uppercase tracking-wider text-zinc-500">
        {label}
      </legend>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {HEROES.map((hero) => (
          <HeroOption
            key={hero.id}
            hero={hero}
            selected={hero.id === value}
            onSelect={() => onChange(hero.id)}
          />
        ))}
      </div>
    </fieldset>
  );
}

export default function HeroSelect({
  onStart,
}: {
  onStart: (setup: DuelSetup) => void;
}) {
  const [p1Id, setP1Id] = useState(DEFAULT_P1_HERO_ID);
  const [p2Id, setP2Id] = useState(DEFAULT_P2_HERO_ID);
  const [mode, setMode] = useState<DuelMode>("ai");

  const p1 = getHero(p1Id);
  const p2 = getHero(p2Id);

  const handleStart = () => {
    if (p1 && p2) {
      onStart({ p1, p2, mode });
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-50">
          Hero Arena
        </h1>
        <p className="max-w-2xl text-zinc-400">
          Pick a fighter for each side, choose how the opponent behaves, then
          duel round by round. Each round both heroes roll a hidden d20 — the
          higher roll (plus a speed bonus) attacks, and a d6 decides how hard
          the blow lands. Skills cost MP, go on cooldown, and carry an element
          that decides how their projectile looks.
        </p>
      </header>

      <fieldset className="flex flex-col gap-3">
        <legend className="text-sm font-semibold uppercase tracking-wider text-zinc-500">
          Mode
        </legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {MODES.map((option) => {
            const selected = option.id === mode;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => setMode(option.id)}
                aria-pressed={selected}
                className={`flex flex-col gap-1 rounded-xl border p-4 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400 ${
                  selected
                    ? "border-indigo-400 bg-indigo-500/10"
                    : "border-white/10 bg-zinc-900/60 hover:border-white/25"
                }`}
              >
                <span className="text-sm font-semibold text-zinc-100">
                  {option.label}
                </span>
                <span className="text-xs text-zinc-400">
                  {option.description}
                </span>
              </button>
            );
          })}
        </div>
      </fieldset>

      <div className="grid gap-4 lg:grid-cols-2">
        <SidePicker label="Player 1" value={p1Id} onChange={setP1Id} />
        <SidePicker
          label={mode === "ai" ? "Opponent (AI)" : "Player 2"}
          value={p2Id}
          onChange={setP2Id}
        />
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <button
          type="button"
          onClick={handleStart}
          disabled={!p1 || !p2}
          className="rounded-xl bg-indigo-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-indigo-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-300 disabled:opacity-40"
        >
          Start duel
        </button>
        {p1 && p2 ? (
          <p className="text-sm text-zinc-400">
            <span className="text-zinc-200">{p1.name}</span> vs{" "}
            <span className="text-zinc-200">{p2.name}</span>
          </p>
        ) : null}
      </div>
    </div>
  );
}

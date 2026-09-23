import { STATUS_LABELS } from "../engine/combat";
import type { Combatant, StatusKind } from "../engine/types";

const STATUS_STYLES: Record<StatusKind, string> = {
  burn: "border-orange-500/50 bg-orange-500/15 text-orange-300",
  stun: "border-yellow-500/50 bg-yellow-500/15 text-yellow-200",
  weaken: "border-fuchsia-500/50 bg-fuchsia-500/15 text-fuchsia-300",
};

function Bar({
  value,
  max,
  barClassName,
  label,
}: {
  value: number;
  max: number;
  barClassName: string;
  label: string;
}) {
  const percent = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div
      className="h-3 w-full overflow-hidden rounded-full bg-white/10"
      role="meter"
      aria-label={label}
      aria-valuenow={Math.round(value)}
      aria-valuemin={0}
      aria-valuemax={max}
    >
      <div
        className={`h-full rounded-full transition-[width] duration-300 ${barClassName}`}
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}

export default function Hud({
  combatant,
  active,
  align = "left",
}: {
  combatant: Combatant;
  active: boolean;
  align?: "left" | "right";
}) {
  const { hero } = combatant;
  const hpPercent = Math.max(0, (combatant.hp / hero.maxHp) * 100);
  const hpBar =
    hpPercent > 50
      ? "bg-emerald-500"
      : hpPercent > 25
        ? "bg-amber-500"
        : "bg-rose-500";

  return (
    <section
      aria-label={`${hero.name} status`}
      className={`flex flex-col gap-3 rounded-2xl border bg-zinc-900/70 p-4 transition ${
        active ? "border-indigo-400/70 shadow-lg shadow-indigo-500/10" : "border-white/10"
      }`}
    >
      <div
        className={`flex items-center gap-2 ${
          align === "right" ? "flex-row-reverse text-right" : ""
        }`}
      >
        <span
          className="inline-block h-3 w-3 shrink-0 rounded-full"
          style={{ backgroundColor: hero.color }}
          aria-hidden="true"
        />
        <h2 className="truncate text-base font-semibold text-zinc-100">
          {hero.name}
        </h2>
        <span className="shrink-0 rounded-full border border-white/10 px-2 py-0.5 text-xs text-zinc-400">
          {hero.archetype}
        </span>
        {active ? (
          <span className="shrink-0 rounded-full bg-indigo-500/20 px-2 py-0.5 text-xs font-medium text-indigo-200">
            Active
          </span>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between text-xs text-zinc-400">
          <span>HP</span>
          <span className="font-mono text-zinc-300">
            {Math.max(0, Math.ceil(combatant.hp))} / {hero.maxHp}
          </span>
        </div>
        <Bar
          value={combatant.hp}
          max={hero.maxHp}
          barClassName={hpBar}
          label={`${hero.name} HP`}
        />

        <div className="flex items-baseline justify-between text-xs text-zinc-400">
          <span>MP</span>
          <span className="font-mono text-zinc-300">
            {Math.max(0, Math.floor(combatant.mp))} / {hero.maxMp}
          </span>
        </div>
        <Bar
          value={combatant.mp}
          max={hero.maxMp}
          barClassName="bg-sky-500"
          label={`${hero.name} MP`}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span
          className="rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-zinc-300"
          title={hero.passive.description}
        >
          {hero.passive.name}
        </span>
        {combatant.defending ? (
          <span className="rounded-md border border-sky-500/50 bg-sky-500/15 px-2 py-0.5 text-sky-300">
            Guarding
          </span>
        ) : null}
        {combatant.cooldowns.skill > 0 ? (
          <span className="rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-zinc-400">
            {hero.skill.name}: CD {combatant.cooldowns.skill}
          </span>
        ) : null}
        {combatant.cooldowns.ultimate > 0 ? (
          <span className="rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-zinc-400">
            {hero.ultimate.name}: CD {combatant.cooldowns.ultimate}
          </span>
        ) : null}
        {combatant.statuses.map((status) => (
          <span
            key={status.kind}
            className={`rounded-md border px-2 py-0.5 ${STATUS_STYLES[status.kind]}`}
          >
            {STATUS_LABELS[status.kind]} ({status.duration})
          </span>
        ))}
      </div>
    </section>
  );
}

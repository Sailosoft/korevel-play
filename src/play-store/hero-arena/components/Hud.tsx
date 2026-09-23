import { STATUS_LABELS } from "../engine/combat";
import type { Combatant, StatusKind } from "../engine/types";

const STATUS_STYLES: Record<StatusKind, string> = {
  burn: "border-orange-500/60 bg-orange-500/15 text-orange-300",
  stun: "border-yellow-500/60 bg-yellow-500/15 text-yellow-200",
  weaken: "border-fuchsia-500/60 bg-fuchsia-500/15 text-fuchsia-300",
};

function Bar({
  value,
  max,
  barColor,
  label,
}: {
  value: number;
  max: number;
  barColor: string;
  label: string;
}) {
  const percent = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div
      className="ftf-bar-frame h-3.5 w-full"
      role="meter"
      aria-label={label}
      aria-valuenow={Math.round(value)}
      aria-valuemin={0}
      aria-valuemax={max}
    >
      <div
        className="h-full transition-[width] duration-300"
        style={{
          width: `${percent}%`,
          backgroundColor: barColor,
          boxShadow: `inset 0 1px 0 rgba(255,255,255,0.15), 0 0 6px ${barColor}30`,
        }}
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
  const hpBarColor =
    hpPercent > 50
      ? "var(--ftf-green)"
      : hpPercent > 25
        ? "#ccaa00"
        : "var(--ftf-red)";

  return (
    <section
      aria-label={`${hero.name} status`}
      className={`ftf-panel flex flex-col gap-3 p-4 transition ${
        active ? "ftf-panel-active" : ""
      }`}
    >
      <div
        className={`flex items-center gap-2 ${
          align === "right" ? "flex-row-reverse text-right" : ""
        }`}
      >
        <span
          className="inline-block h-3 w-3 shrink-0 rounded-full"
          style={{ backgroundColor: hero.color, boxShadow: `0 0 8px ${hero.color}60` }}
          aria-hidden="true"
        />
        <h2
          className="truncate text-base font-bold uppercase tracking-wide"
          style={{ color: "var(--ftf-frost)" }}
        >
          {hero.name}
        </h2>
        <span
          className="shrink-0 rounded-sm border px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider"
          style={{
            borderColor: "var(--ftf-steel-border)",
            color: "var(--ftf-frost-dim)",
          }}
        >
          {hero.archetype}
        </span>
        {active ? (
          <span
            className="shrink-0 rounded-sm border px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider"
            style={{
              borderColor: "var(--ftf-ice)",
              backgroundColor: "rgba(108,180,238,0.12)",
              color: "var(--ftf-ice-bright)",
            }}
          >
            Active
          </span>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between text-xs">
          <span className="font-bold uppercase tracking-wider" style={{ color: "var(--ftf-frost-dim)" }}>
            HP
          </span>
          <span className="font-mono" style={{ color: "var(--ftf-frost)" }}>
            {Math.max(0, Math.ceil(combatant.hp))} / {hero.maxHp}
          </span>
        </div>
        <Bar
          value={combatant.hp}
          max={hero.maxHp}
          barColor={hpBarColor}
          label={`${hero.name} HP`}
        />

        <div className="flex items-baseline justify-between text-xs">
          <span className="font-bold uppercase tracking-wider" style={{ color: "var(--ftf-frost-dim)" }}>
            MP
          </span>
          <span className="font-mono" style={{ color: "var(--ftf-frost)" }}>
            {Math.max(0, Math.floor(combatant.mp))} / {hero.maxMp}
          </span>
        </div>
        <Bar
          value={combatant.mp}
          max={hero.maxMp}
          barColor="var(--ftf-blue-bright)"
          label={`${hero.name} MP`}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span
          className="rounded-sm border px-2 py-0.5 font-semibold"
          style={{
            borderColor: "var(--ftf-ice-dim)",
            backgroundColor: "rgba(108,180,238,0.08)",
            color: "var(--ftf-ice)",
          }}
          title={hero.passive.description}
        >
          {hero.passive.name}
        </span>
        {combatant.defending ? (
          <span
            className="rounded-sm border px-2 py-0.5 font-semibold"
            style={{
              borderColor: "var(--ftf-blue)",
              backgroundColor: "rgba(48,112,232,0.15)",
              color: "var(--ftf-blue-bright)",
            }}
          >
            Guarding
          </span>
        ) : null}
        {combatant.cooldowns.skill > 0 ? (
          <span
            className="rounded-sm border px-2 py-0.5"
            style={{
              borderColor: "var(--ftf-steel-border)",
              color: "var(--ftf-frost-dim)",
            }}
          >
            {hero.skill.name}: CD {combatant.cooldowns.skill}
          </span>
        ) : null}
        {combatant.cooldowns.ultimate > 0 ? (
          <span
            className="rounded-sm border px-2 py-0.5"
            style={{
              borderColor: "var(--ftf-steel-border)",
              color: "var(--ftf-frost-dim)",
            }}
          >
            {hero.ultimate.name}: CD {combatant.cooldowns.ultimate}
          </span>
        ) : null}
        {combatant.statuses.map((status) => (
          <span
            key={status.kind}
            className={`rounded-sm border px-2 py-0.5 font-semibold ${STATUS_STYLES[status.kind]}`}
          >
            {STATUS_LABELS[status.kind]} ({status.duration})
          </span>
        ))}
      </div>
    </section>
  );
}

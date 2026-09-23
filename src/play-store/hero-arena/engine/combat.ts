import type {
  Ability,
  ActionEvent,
  ActionId,
  Combatant,
  CombatState,
  DuelEvent,
  Hero,
  LogKind,
  Side,
  SkillElement,
  StatusApplication,
  StatusKind,
} from "./types";

export type RandomFn = () => number;

export const STATUS_LABELS: Record<StatusKind, string> = {
  burn: "Burn",
  stun: "Stun",
  weaken: "Weaken",
};

export const ACTION_LABELS: Record<ActionId, string> = {
  attack: "Attack",
  skill: "Skill",
  ultimate: "Ultimate",
  defend: "Defend",
};

/** Faces on the hidden initiative die rolled by both heroes each round. */
export const INITIATIVE_FACES = 20;

/** Faces on the damage die that modifies every damaging action. */
export const DAMAGE_DIE_FACES = 6;

const BULWARK_THRESHOLD = 0.3;
const BULWARK_REDUCTION = 0.7;
const BERSERK_THRESHOLD = 0.4;
const BERSERK_BONUS = 1.3;
const LETHALITY_BONUS = 0.15;
const MANA_SURGE_FACTOR = 0.7;
const DEFEND_MP_RATIO = 0.1;
const RENEWAL_RATIO = 0.05;
const MAX_LOG_ENTRIES = 80;

/**
 * Mulberry32. Deterministic, seeded PRNG used for all combat randomness
 * (initiative dice, damage dice, crit rolls, speed-tie breaking).
 */
export function mulberry32(seed: number): RandomFn {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface RngHandle {
  rng: RandomFn;
  getSeed: () => number;
}

/**
 * Wraps a seed in a fresh closure per reducer pass. Creating the handle from
 * the serialized seed (rather than mutating a shared generator) keeps the
 * reducer pure and safe under React's double-invocation in development.
 */
function makeRng(seed: number): RngHandle {
  let s = seed >>> 0;
  const rng: RandomFn = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return { rng, getSeed: () => s };
}

export function rollDie(rng: RandomFn, faces: number): number {
  return 1 + Math.floor(rng() * faces);
}

/** Maps a damage die onto a symmetric multiplier: d6 -> 0.5x .. 1.5x. */
export function damageMultiplierForDie(die: number): number {
  const mean = (DAMAGE_DIE_FACES + 1) / 2;
  return 1 + (die - mean) * 0.2;
}

export const MIN_DAMAGE_MULTIPLIER = damageMultiplierForDie(1);

export function otherSide(side: Side): Side {
  return side === "p1" ? "p2" : "p1";
}

export function combatantFor(state: CombatState, side: Side): Combatant {
  return side === "p1" ? state.p1 : state.p2;
}

export function opponentFor(state: CombatState, side: Side): Combatant {
  return combatantFor(state, otherSide(side));
}

/** Heroes with a higher speed add a small bonus to their initiative die. */
export function speedBonus(combatant: Combatant): number {
  return Math.floor(combatant.hero.spd / 4);
}

export function isStunned(combatant: Combatant): boolean {
  return combatant.statuses.some((status) => status.kind === "stun");
}

export function effectiveAtk(combatant: Combatant): number {
  const { hero } = combatant;
  const berserk =
    hero.passive.id === "berserk" &&
    combatant.hp > 0 &&
    combatant.hp / hero.maxHp < BERSERK_THRESHOLD
      ? BERSERK_BONUS
      : 1;
  const weaken = Math.min(
    0.75,
    combatant.statuses
      .filter((status) => status.kind === "weaken")
      .reduce((total, status) => total + status.power, 0),
  );
  return hero.atk * berserk * (1 - weaken);
}

export function effectiveCritChance(combatant: Combatant): number {
  const bonus = combatant.hero.passive.id === "lethality" ? LETHALITY_BONUS : 0;
  return Math.min(1, combatant.hero.critChance + bonus);
}

export function effectiveMpCost(combatant: Combatant, ability: Ability): number {
  if (combatant.hero.passive.id === "mana-surge") {
    return Math.max(0, Math.round(ability.mpCost * MANA_SURGE_FACTOR));
  }
  return ability.mpCost;
}

export interface DamageInput {
  attacker: Combatant;
  defender: Combatant;
  mult: number;
  rng: RandomFn;
}

export interface DamageResult {
  damage: number;
  crit: boolean;
  die: number;
  multiplier: number;
}

/**
 * Damage pipeline: damage die -> crit roll -> base `max(1, atk * mult - def)`
 * (DEF is ignored on a Precision crit) -> crit multiplier -> damage-die
 * multiplier -> defender Bulwark -> active Defend. Randomness is drawn in that
 * order: damage die first, crit second.
 */
export function computeDamage({
  attacker,
  defender,
  mult,
  rng,
}: DamageInput): DamageResult {
  const die = rollDie(rng, DAMAGE_DIE_FACES);
  const multiplier = damageMultiplierForDie(die);
  const crit = rng() < effectiveCritChance(attacker);
  const ignoresDef = crit && attacker.hero.passive.id === "precision";
  const def = ignoresDef ? 0 : defender.hero.def;
  const base = Math.max(1, effectiveAtk(attacker) * mult - def);
  let damage = base * (crit ? attacker.hero.critMult : 1) * multiplier;

  if (
    defender.hero.passive.id === "bulwark" &&
    defender.hp > 0 &&
    defender.hp / defender.hero.maxHp < BULWARK_THRESHOLD
  ) {
    damage *= BULWARK_REDUCTION;
  }
  if (defender.defending) {
    damage *= 0.5;
  }

  return {
    damage: Math.max(1, Math.floor(damage)),
    crit,
    die,
    multiplier,
  };
}

/** Conservative (worst damage die, no crit) estimate used by the AI. */
export function estimateMinDamage(
  attacker: Combatant,
  defender: Combatant,
  mult: number,
): number {
  const base = Math.max(1, effectiveAtk(attacker) * mult - defender.hero.def);
  const bulwark =
    defender.hero.passive.id === "bulwark" &&
    defender.hp > 0 &&
    defender.hp / defender.hero.maxHp < BULWARK_THRESHOLD
      ? BULWARK_REDUCTION
      : 1;
  const guard = defender.defending ? 0.5 : 1;
  return Math.max(
    1,
    Math.floor(base * MIN_DAMAGE_MULTIPLIER * bulwark * guard),
  );
}

export function createCombatant(side: Side, hero: Hero): Combatant {
  return {
    side,
    hero,
    hp: hero.maxHp,
    mp: hero.maxMp,
    cooldowns: { skill: 0, ultimate: 0 },
    statuses: [],
    defending: false,
  };
}

function pushLog(
  state: CombatState,
  side: Side | null,
  kind: LogKind,
  text: string,
): void {
  state.log.push({ id: state.nextLogId, round: state.round, side, kind, text });
  state.nextLogId += 1;
  if (state.log.length > MAX_LOG_ENTRIES) {
    state.log.splice(0, state.log.length - MAX_LOG_ENTRIES);
  }
}

function emptyAction(
  side: Side,
  action: ActionId,
  element: SkillElement,
): ActionEvent {
  return {
    side,
    action,
    element,
    damage: 0,
    crit: false,
    damageDie: 0,
    damageMultiplier: 1,
    healed: 0,
    statuses: [],
  };
}

/**
 * Round-start upkeep for both heroes: cooldown ticks, Renewal, and burn
 * damage. Stun durations are consumed later, by the initiative roll, so that a
 * stun applied last round actually takes effect this round.
 */
function tickRoundStart(state: CombatState): void {
  for (const side of ["p1", "p2"] as Side[]) {
    const combatant = combatantFor(state, side);
    const { hero } = combatant;

    combatant.cooldowns.skill = Math.max(0, combatant.cooldowns.skill - 1);
    combatant.cooldowns.ultimate = Math.max(
      0,
      combatant.cooldowns.ultimate - 1,
    );

    if (
      hero.passive.id === "renewal" &&
      combatant.hp > 0 &&
      combatant.hp < hero.maxHp
    ) {
      const amount = Math.max(1, Math.round(hero.maxHp * RENEWAL_RATIO));
      combatant.hp = Math.min(hero.maxHp, combatant.hp + amount);
      pushLog(
        state,
        combatant.side,
        "heal",
        `${hero.name} regenerates ${amount} HP.`,
      );
    }

    for (const status of combatant.statuses) {
      if (status.kind === "burn") {
        const damage = Math.max(1, Math.round(status.power));
        combatant.hp = Math.max(0, combatant.hp - damage);
        pushLog(
          state,
          combatant.side,
          "damage",
          `${hero.name} burns for ${damage} damage.`,
        );
      }
    }

    combatant.statuses = combatant.statuses
      .map((status) =>
        status.kind === "stun"
          ? status
          : { ...status, duration: status.duration - 1 },
      )
      .filter((status) => status.duration > 0);
  }
}

function finish(state: CombatState, deadSide: Side): void {
  const survivor = opponentFor(state, deadSide);
  state.phase = "finished";
  state.turn = null;
  if (state.p1.hp <= 0 && state.p2.hp <= 0) {
    state.winner = "draw";
    pushLog(state, null, "system", "Both heroes fall — it's a draw.");
    return;
  }
  state.winner = survivor.side;
  pushLog(state, null, "system", `${survivor.hero.name} wins the duel!`);
}

export function createCombatState(
  p1Hero: Hero,
  p2Hero: Hero,
  seed: number,
): CombatState {
  const p1 = createCombatant("p1", p1Hero);
  const p2 = createCombatant("p2", p2Hero);
  const handle = makeRng(seed);

  const state: CombatState = {
    p1,
    p2,
    round: 1,
    phase: "rolling",
    initiative: null,
    turn: null,
    lastAction: null,
    actionSeq: 0,
    winner: null,
    log: [],
    nextLogId: 1,
    rngState: handle.getSeed(),
  };

  pushLog(state, null, "system", `${p1Hero.name} vs ${p2Hero.name} — Round 1.`);
  pushLog(
    state,
    null,
    "info",
    "Roll the hidden dice: the higher roll gets to strike.",
  );
  tickRoundStart(state);
  return state;
}

function advanceRound(state: CombatState): void {
  state.round += 1;
  state.phase = "rolling";
  state.initiative = null;
  state.turn = null;
  pushLog(state, null, "system", `Round ${state.round} begins.`);
  tickRoundStart(state);
  if (state.p1.hp <= 0 || state.p2.hp <= 0) {
    finish(state, state.p1.hp <= 0 ? "p1" : "p2");
  }
}

function rollInitiative(state: CombatState, handle: RngHandle): void {
  const p1 = combatantFor(state, "p1");
  const p2 = combatantFor(state, "p2");

  const p1Die = rollDie(handle.rng, INITIATIVE_FACES);
  const p2Die = rollDie(handle.rng, INITIATIVE_FACES);
  const p1Bonus = speedBonus(p1);
  const p2Bonus = speedBonus(p2);
  const p1Total = p1Die + p1Bonus;
  const p2Total = p2Die + p2Bonus;

  const p1Stunned = isStunned(p1);
  const p2Stunned = isStunned(p2);

  // Consume the stun now that it has had its effect.
  for (const combatant of [p1, p2]) {
    if (isStunned(combatant)) {
      combatant.statuses = combatant.statuses
        .map((status) =>
          status.kind === "stun"
            ? { ...status, duration: status.duration - 1 }
            : status,
        )
        .filter((status) => status.duration > 0);
    }
  }

  pushLog(
    state,
    null,
    "info",
    `${p1.hero.name} rolls ${p1Die}${p1Bonus ? `+${p1Bonus}` : ""} = ${p1Total}. ${p2.hero.name} rolls ${p2Die}${p2Bonus ? `+${p2Bonus}` : ""} = ${p2Total}.`,
  );

  if (p1Stunned && p2Stunned) {
    pushLog(state, null, "status", "Both heroes are stunned — the round passes.");
    advanceRound(state);
    return;
  }

  let rolledWinner: Side;
  if (p1Total > p2Total) {
    rolledWinner = "p1";
  } else if (p2Total > p1Total) {
    rolledWinner = "p2";
  } else if (p1.hero.spd !== p2.hero.spd) {
    rolledWinner = p1.hero.spd > p2.hero.spd ? "p1" : "p2";
  } else {
    rolledWinner = handle.rng() < 0.5 ? "p1" : "p2";
  }

  let winner = rolledWinner;
  if (p1Stunned) {
    winner = "p2";
  } else if (p2Stunned) {
    winner = "p1";
  }

  if (winner !== rolledWinner) {
    pushLog(
      state,
      null,
      "status",
      `${combatantFor(state, rolledWinner).hero.name} is stunned and forfeits the initiative.`,
    );
  }

  state.initiative = {
    p1: p1Die,
    p2: p2Die,
    p1Total,
    p2Total,
    winner,
  };
  state.turn = winner;
  state.phase = "acting";
  pushLog(
    state,
    winner,
    "info",
    `${combatantFor(state, winner).hero.name} wins the roll and acts.`,
  );
}

function applyDamage(
  state: CombatState,
  target: Combatant,
  damage: number,
  crit: boolean,
): void {
  target.hp = Math.max(0, target.hp - damage);
  if (crit) {
    pushLog(
      state,
      target.side,
      "crit",
      `Critical hit! ${target.hero.name} takes ${damage} damage.`,
    );
  } else {
    pushLog(
      state,
      target.side,
      "damage",
      `${target.hero.name} takes ${damage} damage.`,
    );
  }
  if (target.hp <= 0) {
    pushLog(state, target.side, "system", `${target.hero.name} is defeated.`);
  }
}

function applyStatus(
  state: CombatState,
  target: Combatant,
  application: StatusApplication,
): void {
  const existing = target.statuses.find(
    (status) => status.kind === application.kind,
  );
  if (existing) {
    existing.duration = Math.max(existing.duration, application.duration);
    existing.power = Math.max(existing.power, application.power);
  } else {
    target.statuses.push({ ...application });
  }
  pushLog(
    state,
    target.side,
    "status",
    `${target.hero.name} is afflicted with ${STATUS_LABELS[application.kind]} (${application.duration}).`,
  );
}

function performAction(
  state: CombatState,
  action: ActionId,
  handle: RngHandle,
): void {
  const side = state.turn;
  if (!side) {
    return;
  }
  const actor = combatantFor(state, side);
  const foe = opponentFor(state, side);
  const { hero } = actor;

  // A guard raised earlier expires the moment the hero acts again.
  actor.defending = false;

  if (action === "defend") {
    actor.defending = true;
    const mpGain = Math.max(1, Math.round(hero.maxMp * DEFEND_MP_RATIO));
    actor.mp = Math.min(hero.maxMp, actor.mp + mpGain);
    pushLog(
      state,
      actor.side,
      "info",
      `${hero.name} braces and recovers ${mpGain} MP.`,
    );
    state.lastAction = emptyAction(actor.side, "defend", "physical");
    state.actionSeq += 1;
    return;
  }

  if (action === "attack") {
    const result = computeDamage({
      attacker: actor,
      defender: foe,
      mult: 1,
      rng: handle.rng,
    });
    pushLog(
      state,
      actor.side,
      "info",
      `${hero.name} attacks (damage die ${result.die}).`,
    );
    applyDamage(state, foe, result.damage, result.crit);
    state.lastAction = {
      ...emptyAction(actor.side, "attack", "physical"),
      damage: result.damage,
      crit: result.crit,
      damageDie: result.die,
      damageMultiplier: result.multiplier,
    };
    state.actionSeq += 1;
    return;
  }

  const ability = action === "skill" ? hero.skill : hero.ultimate;
  const cost = effectiveMpCost(actor, ability);

  // Guard against out-of-band events (the UI and AI both gate this): an
  // unavailable ability degrades to a basic attack instead of corrupting state.
  if (actor.mp < cost || actor.cooldowns[ability.id] > 0) {
    pushLog(
      state,
      actor.side,
      "info",
      `${hero.name} cannot use ${ability.name} and attacks instead.`,
    );
    const fallback = computeDamage({
      attacker: actor,
      defender: foe,
      mult: 1,
      rng: handle.rng,
    });
    applyDamage(state, foe, fallback.damage, fallback.crit);
    state.lastAction = {
      ...emptyAction(actor.side, "attack", "physical"),
      damage: fallback.damage,
      crit: fallback.crit,
      damageDie: fallback.die,
      damageMultiplier: fallback.multiplier,
    };
    state.actionSeq += 1;
    return;
  }

  actor.mp = Math.max(0, actor.mp - cost);
  actor.cooldowns[ability.id] = ability.cooldown;

  if (ability.mode === "heal") {
    const amount = Math.max(1, Math.round(hero.maxHp * ability.mult));
    actor.hp = Math.min(hero.maxHp, actor.hp + amount);
    pushLog(
      state,
      actor.side,
      "heal",
      `${hero.name} uses ${ability.name} (-${cost} MP) and restores ${amount} HP.`,
    );
    if (ability.cleanses && actor.statuses.length > 0) {
      actor.statuses = [];
      pushLog(state, actor.side, "status", `${hero.name} is cleansed.`);
    }
    state.lastAction = {
      ...emptyAction(actor.side, action, ability.element),
      healed: amount,
    };
    state.actionSeq += 1;
    return;
  }

  const result = computeDamage({
    attacker: actor,
    defender: foe,
    mult: ability.mult,
    rng: handle.rng,
  });
  pushLog(
    state,
    actor.side,
    "info",
    `${hero.name} uses ${ability.name} (-${cost} MP, damage die ${result.die}).`,
  );
  applyDamage(state, foe, result.damage, result.crit);

  const statuses: StatusKind[] = [];
  if (ability.applies && foe.hp > 0) {
    applyStatus(state, foe, ability.applies);
    statuses.push(ability.applies.kind);
  }

  state.lastAction = {
    ...emptyAction(actor.side, action, ability.element),
    damage: result.damage,
    crit: result.crit,
    damageDie: result.die,
    damageMultiplier: result.multiplier,
    statuses,
  };
  state.actionSeq += 1;
}

function cloneCombatant(combatant: Combatant): Combatant {
  return {
    ...combatant,
    cooldowns: { ...combatant.cooldowns },
    statuses: combatant.statuses.map((status) => ({ ...status })),
  };
}

function cloneState(state: CombatState): CombatState {
  return {
    ...state,
    p1: cloneCombatant(state.p1),
    p2: cloneCombatant(state.p2),
    initiative: state.initiative ? { ...state.initiative } : null,
    lastAction: state.lastAction
      ? { ...state.lastAction, statuses: [...state.lastAction.statuses] }
      : null,
    log: [...state.log],
  };
}

export function duelReducer(
  state: CombatState | null,
  event: DuelEvent,
): CombatState | null {
  if (event.type === "start") {
    return createCombatState(event.p1, event.p2, event.seed);
  }

  if (!state || state.phase === "finished") {
    return state;
  }

  const handle = makeRng(state.rngState);
  const next = cloneState(state);

  if (event.type === "roll") {
    if (next.phase !== "rolling") {
      return state;
    }
    rollInitiative(next, handle);
  } else {
    if (next.phase !== "acting" || !next.turn) {
      return state;
    }
    performAction(next, event.action, handle);
    if (next.p1.hp <= 0 || next.p2.hp <= 0) {
      finish(next, next.p1.hp <= 0 ? "p1" : "p2");
    } else {
      advanceRound(next);
    }
  }

  next.rngState = handle.getSeed();
  return next;
}

export interface ActionAvailability {
  action: ActionId;
  enabled: boolean;
  reason?: string;
  mpCost: number;
  cooldown: number;
}

export function getActionAvailability(
  state: CombatState,
  side: Side,
): ActionAvailability[] {
  const combatant = combatantFor(state, side);
  const skillCost = effectiveMpCost(combatant, combatant.hero.skill);
  const ultimateCost = effectiveMpCost(combatant, combatant.hero.ultimate);
  const skillCooldown = combatant.cooldowns.skill;
  const ultimateCooldown = combatant.cooldowns.ultimate;

  return [
    { action: "attack", enabled: true, mpCost: 0, cooldown: 0 },
    {
      action: "skill",
      enabled: combatant.mp >= skillCost && skillCooldown <= 0,
      reason:
        skillCooldown > 0
          ? `On cooldown (${skillCooldown})`
          : combatant.mp < skillCost
            ? "Not enough MP"
            : undefined,
      mpCost: skillCost,
      cooldown: skillCooldown,
    },
    {
      action: "ultimate",
      enabled: combatant.mp >= ultimateCost && ultimateCooldown <= 0,
      reason:
        ultimateCooldown > 0
          ? `On cooldown (${ultimateCooldown})`
          : combatant.mp < ultimateCost
            ? "Not enough MP"
            : undefined,
      mpCost: ultimateCost,
      cooldown: ultimateCooldown,
    },
    { action: "defend", enabled: true, mpCost: 0, cooldown: 0 },
  ];
}

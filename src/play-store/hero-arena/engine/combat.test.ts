import { describe, expect, test } from "bun:test";
import { chooseAiAction } from "./ai";
import {
  combatantFor,
  computeDamage,
  createCombatant,
  createCombatState,
  DAMAGE_DIE_FACES,
  damageMultiplierForDie,
  duelReducer,
  effectiveAtk,
  effectiveMpCost,
  getActionAvailability,
  INITIATIVE_FACES,
  mulberry32,
  rollDie,
  speedBonus,
} from "./combat";
import type {
  Ability,
  ActionId,
  CombatState,
  DuelEvent,
  Hero,
  PassiveId,
  Side,
} from "./types";

function makeAbility(overrides: Partial<Ability> = {}): Ability {
  return {
    id: "skill",
    name: "Test Skill",
    description: "",
    element: "physical",
    mpCost: 0,
    cooldown: 0,
    mode: "damage",
    mult: 1,
    ...overrides,
  };
}

function makePassive(id: PassiveId) {
  return { id, name: id, description: "" };
}

/** Precision with 0% crit is an inert passive, handy as a neutral baseline. */
function makeHero(overrides: Partial<Hero> = {}): Hero {
  return {
    id: "test",
    name: "Test Hero",
    archetype: "Vanguard",
    blurb: "",
    color: "#ffffff",
    accent: "#000000",
    maxHp: 100,
    maxMp: 50,
    atk: 20,
    def: 10,
    spd: 10,
    critChance: 0,
    critMult: 2,
    passive: makePassive("precision"),
    skill: makeAbility(),
    ultimate: makeAbility({ id: "ultimate", name: "Test Ultimate" }),
    ...overrides,
  };
}

const send = (state: CombatState, event: DuelEvent): CombatState => {
  const next = duelReducer(state, event);
  if (!next) {
    throw new Error("reducer returned null for an active state");
  }
  return next;
};

const roll = (state: CombatState): CombatState => send(state, { type: "roll" });

const act = (state: CombatState, action: ActionId): CombatState =>
  send(state, { type: "action", action });

/** Skips the dice and hands the turn to `side`, to test action resolution. */
function forceTurn(state: CombatState, side: Side): CombatState {
  state.phase = "acting";
  state.turn = side;
  return state;
}

const skillEnabled = (state: CombatState, side: Side) =>
  getActionAvailability(state, side).find((entry) => entry.action === "skill")!
    .enabled;

describe("dice helpers", () => {
  test("rolls within the die range", () => {
    expect(rollDie(() => 0, INITIATIVE_FACES)).toBe(1);
    expect(rollDie(() => 0.999, INITIATIVE_FACES)).toBe(INITIATIVE_FACES);
    expect(rollDie(() => 0.5, DAMAGE_DIE_FACES)).toBe(4);
  });

  test("maps damage dice onto a symmetric multiplier", () => {
    expect(damageMultiplierForDie(1)).toBeCloseTo(0.5);
    expect(damageMultiplierForDie(3)).toBeCloseTo(0.9);
    expect(damageMultiplierForDie(4)).toBeCloseTo(1.1);
    expect(damageMultiplierForDie(6)).toBeCloseTo(1.5);
  });

  test("gives faster heroes a small initiative bonus", () => {
    expect(speedBonus(createCombatant("p1", makeHero({ spd: 14 })))).toBe(3);
    expect(speedBonus(createCombatant("p1", makeHero({ spd: 6 })))).toBe(1);
  });
});

describe("computeDamage", () => {
  test("applies the damage die as a modifier", () => {
    const attacker = createCombatant("p1", makeHero({ atk: 20 }));
    const defender = createCombatant("p2", makeHero({ def: 10 }));

    const low = computeDamage({ attacker, defender, mult: 1, rng: () => 0 });
    expect(low.die).toBe(1);
    expect(low.multiplier).toBeCloseTo(0.5);
    expect(low.damage).toBe(5);

    const high = computeDamage({
      attacker,
      defender,
      mult: 1,
      rng: () => 0.999,
    });
    expect(high.die).toBe(6);
    expect(high.damage).toBe(15);
  });

  test("subtracts DEF from ATK", () => {
    const attacker = createCombatant("p1", makeHero({ atk: 20 }));
    const defender = createCombatant("p2", makeHero({ def: 10 }));

    const { damage, crit } = computeDamage({
      attacker,
      defender,
      mult: 1,
      rng: () => 0.5,
    });

    expect(crit).toBe(false);
    expect(damage).toBe(11);
  });

  test("applies the crit multiplier when the roll succeeds", () => {
    const attacker = createCombatant(
      "p1",
      makeHero({
        atk: 20,
        critChance: 1,
        critMult: 2,
        passive: makePassive("renewal"),
      }),
    );
    const defender = createCombatant("p2", makeHero({ def: 10 }));

    const { damage, crit, die } = computeDamage({
      attacker,
      defender,
      mult: 1,
      rng: () => 0,
    });

    expect(crit).toBe(true);
    expect(die).toBe(1);
    expect(damage).toBe(10);
  });

  test("precision crits ignore DEF", () => {
    const attacker = createCombatant(
      "p1",
      makeHero({
        atk: 20,
        critChance: 1,
        critMult: 2,
        passive: makePassive("precision"),
      }),
    );
    const defender = createCombatant("p2", makeHero({ def: 10 }));

    const { damage, crit } = computeDamage({
      attacker,
      defender,
      mult: 1,
      rng: () => 0,
    });

    expect(crit).toBe(true);
    expect(damage).toBe(20);
  });

  test("bulwark reduces damage below 30% HP", () => {
    const attacker = createCombatant("p1", makeHero({ atk: 20 }));
    const defender = createCombatant(
      "p2",
      makeHero({ def: 10, passive: makePassive("bulwark") }),
    );
    defender.hp = 20;

    const { damage } = computeDamage({
      attacker,
      defender,
      mult: 1,
      rng: () => 0.5,
    });

    expect(damage).toBe(7);
  });

  test("defending halves incoming damage", () => {
    const attacker = createCombatant("p1", makeHero({ atk: 20 }));
    const defender = createCombatant("p2", makeHero({ def: 10 }));
    defender.defending = true;

    const { damage } = computeDamage({
      attacker,
      defender,
      mult: 1,
      rng: () => 0.5,
    });

    expect(damage).toBe(5);
  });

  test("clamps to a minimum of 1 damage", () => {
    const attacker = createCombatant("p1", makeHero({ atk: 5 }));
    const defender = createCombatant("p2", makeHero({ def: 100 }));

    const { damage } = computeDamage({
      attacker,
      defender,
      mult: 1,
      rng: () => 0,
    });

    expect(damage).toBe(1);
  });
});

describe("stat modifiers", () => {
  test("mana surge reduces ability costs by 30%", () => {
    const mage = createCombatant(
      "p1",
      makeHero({
        passive: makePassive("mana-surge"),
        skill: makeAbility({ mpCost: 20 }),
      }),
    );

    expect(effectiveMpCost(mage, mage.hero.skill)).toBe(14);
  });

  test("berserk raises ATK below 40% HP", () => {
    const bruiser = createCombatant(
      "p1",
      makeHero({ atk: 20, passive: makePassive("berserk") }),
    );
    bruiser.hp = bruiser.hero.maxHp * 0.3;

    expect(effectiveAtk(bruiser)).toBeCloseTo(26);
  });

  test("weaken lowers ATK", () => {
    const weakened = createCombatant("p1", makeHero({ atk: 20 }));
    weakened.statuses.push({ kind: "weaken", duration: 2, power: 0.5 });

    expect(effectiveAtk(weakened)).toBeCloseTo(10);
  });
});

describe("initiative dice", () => {
  test("starts a round waiting for the roll", () => {
    const state = createCombatState(makeHero({ id: "a" }), makeHero({ id: "b" }), 1);

    expect(state.phase).toBe("rolling");
    expect(state.initiative).toBeNull();
    expect(state.turn).toBeNull();
    expect(state.round).toBe(1);
    expect(state.actionSeq).toBe(0);
  });

  test("reveals both dice and hands the turn to the winner", () => {
    const seed = 999;
    const state = roll(
      createCombatState(
        makeHero({ id: "a", spd: 8 }),
        makeHero({ id: "b", spd: 8 }),
        seed,
      ),
    );

    const rng = mulberry32(seed);
    const p1Die = rollDie(rng, INITIATIVE_FACES);
    const p2Die = rollDie(rng, INITIATIVE_FACES);

    expect(state.initiative?.p1).toBe(p1Die);
    expect(state.initiative?.p2).toBe(p2Die);
    expect(state.phase).toBe("acting");

    const revealed = state.initiative!;
    if (revealed.p1Total !== revealed.p2Total) {
      expect(state.turn).toBe(revealed.p1Total > revealed.p2Total ? "p1" : "p2");
    }
  });

  test("lets the dice beat raw speed", () => {
    const slow = makeHero({ id: "slow", spd: 1 });
    const fast = makeHero({ id: "fast", spd: 20 });

    let slowWins = 0;
    for (let seed = 1; seed <= 30; seed += 1) {
      const state = roll(createCombatState(slow, fast, seed));
      if (state.turn === "p1") {
        slowWins += 1;
      }
    }

    expect(slowWins).toBeGreaterThan(0);
  });

  test("a stunned hero forfeits the initiative and the stun is consumed", () => {
    const state = createCombatState(
      makeHero({ id: "a", spd: 20 }),
      makeHero({ id: "b", spd: 1 }),
      5,
    );
    state.p1.statuses.push({ kind: "stun", duration: 1, power: 1 });

    const rolled = roll(state);

    expect(rolled.turn).toBe("p2");
    expect(rolled.p1.statuses).toHaveLength(0);
  });

  test("passes the round when both heroes are stunned", () => {
    const state = createCombatState(
      makeHero({ id: "a" }),
      makeHero({ id: "b" }),
      5,
    );
    state.p1.statuses.push({ kind: "stun", duration: 1, power: 1 });
    state.p2.statuses.push({ kind: "stun", duration: 1, power: 1 });

    const rolled = roll(state);

    expect(rolled.round).toBe(2);
    expect(rolled.phase).toBe("rolling");
    expect(rolled.initiative).toBeNull();
  });
});

describe("resolving actions", () => {
  test("records the action, rolls a damage die, and opens the next round", () => {
    const state = forceTurn(
      createCombatState(
        makeHero({ id: "a", atk: 20 }),
        makeHero({ id: "b", def: 0, maxHp: 500 }),
        3,
      ),
      "p1",
    );
    const hpBefore = state.p2.hp;

    const resolved = act(state, "attack");

    expect(resolved.actionSeq).toBe(1);
    expect(resolved.lastAction?.side).toBe("p1");
    expect(resolved.lastAction?.action).toBe("attack");
    expect(resolved.lastAction?.damageDie).toBeGreaterThanOrEqual(1);
    expect(resolved.lastAction?.damageDie).toBeLessThanOrEqual(
      DAMAGE_DIE_FACES,
    );
    expect(resolved.p2.hp).toBeLessThan(hpBefore);
    expect(resolved.round).toBe(2);
    expect(resolved.phase).toBe("rolling");
    expect(resolved.initiative).toBeNull();
  });

  test("tags abilities with their element for the arena effect", () => {
    const mage = makeHero({
      id: "mage",
      skill: makeAbility({ element: "fire", mpCost: 0 }),
    });
    const state = forceTurn(
      createCombatState(mage, makeHero({ id: "b", maxHp: 500 }), 3),
      "p1",
    );

    const resolved = act(state, "skill");

    expect(resolved.lastAction?.action).toBe("skill");
    expect(resolved.lastAction?.element).toBe("fire");
  });

  test("abilities go on cooldown for the configured number of rounds", () => {
    const caster = makeHero({
      id: "caster",
      skill: makeAbility({ cooldown: 2, mpCost: 0 }),
    });
    const foe = makeHero({ id: "foe", maxHp: 500 });

    let state = forceTurn(createCombatState(caster, foe, 3), "p1");
    state = act(state, "skill");

    expect(state.round).toBe(2);
    expect(state.p1.cooldowns.skill).toBe(1);
    expect(skillEnabled(state, "p1")).toBe(false);

    state = forceTurn(state, "p1");
    state = act(state, "attack");

    expect(state.round).toBe(3);
    expect(skillEnabled(state, "p1")).toBe(true);
  });

  test("burn ticks at the start of each round and expires", () => {
    const burner = makeHero({
      id: "burner",
      skill: makeAbility({
        mpCost: 0,
        applies: { kind: "burn", duration: 2, power: 5 },
      }),
    });
    const victim = makeHero({ id: "victim", atk: 0, def: 0, maxHp: 500 });

    let state = forceTurn(createCombatState(burner, victim, 3), "p1");
    state = act(state, "skill");

    expect(state.p2.statuses).toEqual([
      { kind: "burn", duration: 1, power: 5 },
    ]);
    expect(state.log.filter((entry) => entry.text.includes("burns for"))).toHaveLength(
      1,
    );

    state = forceTurn(state, "p1");
    state = act(state, "attack");

    expect(state.p2.statuses).toHaveLength(0);
    expect(state.log.filter((entry) => entry.text.includes("burns for"))).toHaveLength(
      2,
    );
  });

  test("renewal regenerates HP at the start of a round", () => {
    const regenerator = makeHero({
      id: "regen",
      maxHp: 100,
      passive: makePassive("renewal"),
    });
    const foe = makeHero({ id: "foe", atk: 0, def: 0, maxHp: 500 });

    let state = forceTurn(createCombatState(regenerator, foe, 3), "p1");
    state.p1.hp = 50;
    state = act(state, "attack");

    expect(state.p1.hp).toBe(55);
  });

  test("falls back to a basic attack when the ability is unavailable", () => {
    const caster = makeHero({
      id: "caster",
      maxMp: 0,
      skill: makeAbility({ mpCost: 10 }),
    });
    const foe = makeHero({ id: "foe", def: 0, maxHp: 500 });

    const state = forceTurn(createCombatState(caster, foe, 3), "p1");
    const hpBefore = state.p2.hp;

    const resolved = act(state, "skill");

    expect(resolved.p1.mp).toBe(0);
    expect(resolved.p1.cooldowns.skill).toBe(0);
    expect(resolved.p2.hp).toBeLessThan(hpBefore);
    expect(resolved.lastAction?.action).toBe("attack");
    expect(
      resolved.log.some((entry) => entry.text.includes("attacks instead")),
    ).toBe(true);
  });

  test("ends the duel and picks a winner when HP hits zero", () => {
    const killer = makeHero({ id: "killer", atk: 200 });
    const victim = makeHero({ id: "victim", def: 0, maxHp: 20 });

    let state = forceTurn(createCombatState(killer, victim, 3), "p1");
    state = act(state, "attack");

    expect(state.phase).toBe("finished");
    expect(state.winner).toBe("p1");
    expect(state.turn).toBeNull();
    expect(state.p2.hp).toBe(0);

    expect(duelReducer(state, { type: "roll" })).toBe(state);
  });

  test("is deterministic for a given seed", () => {
    const build = () =>
      createCombatState(
        makeHero({ id: "a", spd: 12 }),
        makeHero({ id: "b", spd: 9 }),
        4242,
      );

    let left = build();
    let right = build();

    for (let step = 0; step < 8; step += 1) {
      left = roll(left);
      right = roll(right);
      if (left.phase === "acting") {
        left = act(left, "attack");
        right = act(right, "attack");
      }
    }

    expect(JSON.stringify(left)).toBe(JSON.stringify(right));
  });
});

describe("chooseAiAction", () => {
  test("takes a lethal basic attack", () => {
    const strong = makeHero({
      id: "strong",
      atk: 100,
      skill: makeAbility({ mpCost: 999 }),
      ultimate: makeAbility({ id: "ultimate", mpCost: 999 }),
    });
    const weak = makeHero({ id: "weak", spd: 1, def: 0, maxHp: 30 });

    const state = createCombatState(strong, weak, 1);
    expect(chooseAiAction(state, "p1")).toBe("attack");
  });

  test("heals when low and the skill is a heal", () => {
    const healer = makeHero({
      id: "healer",
      skill: makeAbility({ mode: "heal", mult: 0.3, mpCost: 0 }),
    });
    const foe = makeHero({ id: "foe", spd: 1, def: 0, maxHp: 500 });

    const state = createCombatState(healer, foe, 1);
    combatantFor(state, "p1").hp = 50;

    expect(chooseAiAction(state, "p1")).toBe("skill");
  });

  test("braces when out of MP", () => {
    const dry = makeHero({
      id: "dry",
      maxMp: 0,
      skill: makeAbility({ mpCost: 10 }),
      ultimate: makeAbility({ id: "ultimate", mpCost: 20 }),
    });
    const foe = makeHero({ id: "foe", spd: 1, def: 100, maxHp: 500 });

    const state = createCombatState(dry, foe, 1);
    expect(chooseAiAction(state, "p1")).toBe("defend");
  });
});

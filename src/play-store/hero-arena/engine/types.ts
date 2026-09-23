export type Side = "p1" | "p2";

export type AbilityId = "skill" | "ultimate";

export type ActionId = "attack" | "skill" | "ultimate" | "defend";

export type HeroArchetype =
  | "Vanguard"
  | "Berserker"
  | "Assassin"
  | "Mage"
  | "Support"
  | "Ranger";

export type PassiveId =
  | "bulwark"
  | "mana-surge"
  | "lethality"
  | "berserk"
  | "renewal"
  | "precision";

export interface Passive {
  id: PassiveId;
  name: string;
  description: string;
}

export type StatusKind = "burn" | "stun" | "weaken";

export interface StatusEffect {
  kind: StatusKind;
  duration: number;
  power: number;
}

export type StatusApplication = StatusEffect;

/** Flavour school of an ability; drives the projectile colour and splash. */
export type SkillElement =
  | "physical"
  | "fire"
  | "ice"
  | "earth"
  | "storm"
  | "holy"
  | "shadow";

export interface Ability {
  id: AbilityId;
  name: string;
  description: string;
  element: SkillElement;
  mpCost: number;
  /** Rounds before the ability can be used again. */
  cooldown: number;
  mode: "damage" | "heal";
  /** Damage multiplier, or heal as a fraction of max HP when mode is "heal". */
  mult: number;
  applies?: StatusApplication;
  cleanses?: boolean;
}

export interface Hero {
  id: string;
  name: string;
  archetype: string;
  blurb: string;
  color: string;
  accent: string;
  maxHp: number;
  maxMp: number;
  atk: number;
  def: number;
  spd: number;
  critChance: number;
  critMult: number;
  passive: Passive;
  skill: Ability;
  ultimate: Ability;
}

export interface Combatant {
  side: Side;
  hero: Hero;
  hp: number;
  mp: number;
  cooldowns: Record<AbilityId, number>;
  statuses: StatusEffect[];
  defending: boolean;
}

export type LogKind = "info" | "damage" | "heal" | "status" | "crit" | "system";

export interface LogEntry {
  id: number;
  round: number;
  side: Side | null;
  kind: LogKind;
  text: string;
}

/** Result of the hidden initiative roll that opens every round. */
export interface InitiativeRoll {
  p1: number;
  p2: number;
  p1Total: number;
  p2Total: number;
  /** Side that actually gets to act this round (after stun overrides). */
  winner: Side;
}

/** Everything the arena needs to animate the action that just resolved. */
export interface ActionEvent {
  side: Side;
  action: ActionId;
  element: SkillElement;
  damage: number;
  crit: boolean;
  damageDie: number;
  damageMultiplier: number;
  healed: number;
  statuses: StatusKind[];
}

export interface CombatState {
  p1: Combatant;
  p2: Combatant;
  round: number;
  /** "rolling" waits for the initiative roll, "acting" waits for the winner's action. */
  phase: "rolling" | "acting" | "finished";
  initiative: InitiativeRoll | null;
  turn: Side | null;
  lastAction: ActionEvent | null;
  actionSeq: number;
  winner: Side | "draw" | null;
  log: LogEntry[];
  nextLogId: number;
  rngState: number;
}

export type DuelEvent =
  | { type: "start"; p1: Hero; p2: Hero; seed: number }
  | { type: "roll" }
  | { type: "action"; action: ActionId };

/**
 * Izvori XP/coin nagrada. Namerno FIKSNI iznosi za MVP (bez random bonusa) -
 * predvidljivost je vaznija od varijeteta dok se osnovni gameplay loop ne
 * dokaze. Svaki izvor odgovara tacno jednom redu u `xp_events` po dogadjaju
 * (idempotency se garantuje na nivou perzistencije, ne ovde).
 */
export const XP_SOURCES = [
  "WORKOUT_COMPLETE",
  "DAILY_QUEST_COMPLETE",
  "BOSS_QUEST_COMPLETE",
  "WEEKLY_QUEST_COMPLETE",
  "MAIN_QUEST_COMPLETE",
  "SIDE_QUEST_COMPLETE",
  "PENALTY_QUEST_COMPLETE",
] as const;
export type XpSource = (typeof XP_SOURCES)[number];

export const XP_REWARDS: Readonly<Record<XpSource, number>> = {
  WORKOUT_COMPLETE: 150,
  DAILY_QUEST_COMPLETE: 100,
  BOSS_QUEST_COMPLETE: 500,
  WEEKLY_QUEST_COMPLETE: 300,
  MAIN_QUEST_COMPLETE: 400,
  SIDE_QUEST_COMPLETE: 50,
  PENALTY_QUEST_COMPLETE: 50,
};

/**
 * PENALTY_QUEST_COMPLETE nema fiksan iznos ovde - vraceni coins su TACAN
 * iznos izgubljen kroz Penalty System (vidi QuestsService.generatePenaltyQuest),
 * postavljen po instanci questa, ne iz ove tabele. Vrednost 0 je samo
 * placeholder da Record<XpSource, number> ostane iscrpan.
 */
export const COIN_REWARDS: Readonly<Record<XpSource, number>> = {
  WORKOUT_COMPLETE: 25,
  DAILY_QUEST_COMPLETE: 15,
  BOSS_QUEST_COMPLETE: 150,
  WEEKLY_QUEST_COMPLETE: 80,
  MAIN_QUEST_COMPLETE: 100,
  SIDE_QUEST_COMPLETE: 10,
  PENALTY_QUEST_COMPLETE: 0,
};

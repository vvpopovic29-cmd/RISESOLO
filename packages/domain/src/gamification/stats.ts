export const STAT_KEYS = ["strength", "agility", "endurance", "vitality"] as const;
export type StatKey = (typeof STAT_KEYS)[number];

export type PlayerStats = Readonly<Record<StatKey, number>>;

export const ZERO_STATS: PlayerStats = {
  strength: 0,
  agility: 0,
  endurance: 0,
  vitality: 0,
};

/**
 * Boss Quest = nedeljni izazov (vidi apps/api/src/quests) - zavrsava se kada
 * igrac odradi dovoljno treninga tokom ISO nedelje. Progres se NAMERNO ne
 * perzistira posebno - racuna se prebrojavanjem zavrsenih WorkoutSession u
 * toj nedelji (isti princip kao total_xp: izvedeno, ne cuvano, da ne bi
 * doslo do drift-a izmedju sacuvanog i stvarnog stanja).
 */
export const BOSS_QUEST_TARGET_SESSIONS = 3;

export function isBossQuestComplete(completedSessions: number, targetSessions: number): boolean {
  return completedSessions >= targetSessions;
}

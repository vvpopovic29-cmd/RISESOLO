/**
 * Tipovi za Daily Quest sistem (Faza 3 - QUEST SISTEM).
 */

export type QuestStatus = "AVAILABLE" | "IN_PROGRESS" | "COMPLETED" | "EXPIRED";

export interface QuestReward {
  readonly xp: number;
}

/** Sablon iz kog se generisu konkretni Daily Quest-ovi (katalog, ne per-user). */
export interface QuestDefinition {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly targetValue: number;
  readonly unit: string;
  readonly reward: QuestReward;
}

/** Konkretan quest dodeljen jednom korisniku za jedan dan. */
export interface DailyQuest {
  readonly id: string;
  readonly userId: string;
  /** ISO datum (YYYY-MM-DD), UTC dan za koji je quest generisan. */
  readonly date: string;
  readonly definitionId: string;
  readonly title: string;
  readonly description: string;
  readonly targetValue: number;
  readonly unit: string;
  readonly progressValue: number;
  readonly status: QuestStatus;
  readonly reward: QuestReward;
  readonly createdAt: string;
  readonly expiresAt: string;
  readonly completedAt: string | null;
}

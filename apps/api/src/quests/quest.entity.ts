import type { QuestStatus } from "@risesolo/domain";

export interface QuestRecord {
  readonly id: string;
  readonly userId: string;
  readonly title: string;
  readonly description?: string;
  readonly xpReward: number;
  readonly goldReward: number;
  readonly status: QuestStatus;
  readonly createdAt: string;
  readonly completedAt?: string;
}

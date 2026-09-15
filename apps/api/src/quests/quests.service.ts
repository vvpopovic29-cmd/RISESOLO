import { Injectable } from "@nestjs/common";
import { generateDailyQuest, type DailyQuest } from "@risesolo/domain";
import { mapDomainQuestToRow, mapQuestRowToDomain } from "@risesolo/validation";
import { QuestConflictError, QuestsRepository } from "./quests.repository";

function todayUtc(now: Date): string {
  return now.toISOString().slice(0, 10);
}

@Injectable()
export class QuestsService {
  constructor(private readonly questsRepository: QuestsRepository) {}

  /**
   * "Da li quest vec postoji? DA -> vrati postojeci, NE -> generisi novi"
   * (Faza 3). generateDailyQuest je deterministicka (isti id za isti
   * user+date), pa ako dva paralelna zahteva oba pokusaju insert, gubitnik
   * dobija QuestConflictError i prosto ponovo cita pobednikov (identican)
   * red - nema potrebe za lock-om.
   */
  async getOrCreateToday(userId: string, now: Date = new Date()): Promise<DailyQuest> {
    const date = todayUtc(now);
    const existing = await this.questsRepository.findByUserAndDate(userId, date);
    if (existing) {
      return mapQuestRowToDomain(existing);
    }

    const generated = generateDailyQuest(userId, date);
    try {
      const inserted = await this.questsRepository.insert(mapDomainQuestToRow(generated));
      return mapQuestRowToDomain(inserted);
    } catch (error) {
      if (error instanceof QuestConflictError) {
        const raceWinner = await this.questsRepository.findByUserAndDate(userId, date);
        if (raceWinner) {
          return mapQuestRowToDomain(raceWinner);
        }
      }
      throw error;
    }
  }

  /** Upisuje azurirano stanje questa (progress/status/completedAt) - poziva se iz Completion Engine-a (Faza 6). */
  async persist(quest: DailyQuest): Promise<DailyQuest> {
    const updated = await this.questsRepository.update(quest.id, {
      progress_value: quest.progressValue,
      status: quest.status,
      completed_at: quest.completedAt,
    });
    return mapQuestRowToDomain(updated);
  }
}

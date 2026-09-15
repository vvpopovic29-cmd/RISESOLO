import { generateDailyQuest } from "@risesolo/domain";
import { mapDomainQuestToRow } from "@risesolo/validation";
import { QuestsService } from "./quests.service";
import { QuestConflictError, type QuestsRepository } from "./quests.repository";

const USER = "user-123";
const NOW = new Date("2026-09-14T12:00:00.000Z");

describe("QuestsService.getOrCreateToday", () => {
  it("vraca postojeci quest bez pokusaja insert-a ako vec postoji za danas", async () => {
    const existingRow = mapDomainQuestToRow(generateDailyQuest(USER, "2026-09-14"));
    const repository = {
      findByUserAndDate: jest.fn().mockResolvedValue(existingRow),
      insert: jest.fn(),
    } as unknown as QuestsRepository;

    const service = new QuestsService(repository);
    const result = await service.getOrCreateToday(USER, NOW);

    expect(result.id).toBe(existingRow.id);
    expect(repository.insert).not.toHaveBeenCalled();
  });

  it("generise i insertuje nov quest ako ne postoji", async () => {
    const generated = generateDailyQuest(USER, "2026-09-14");
    const insertedRow = mapDomainQuestToRow(generated);
    const repository = {
      findByUserAndDate: jest.fn().mockResolvedValue(null),
      insert: jest.fn().mockResolvedValue(insertedRow),
    } as unknown as QuestsRepository;

    const service = new QuestsService(repository);
    const result = await service.getOrCreateToday(USER, NOW);

    expect(result.id).toBe(generated.id);
    expect(result.status).toBe("AVAILABLE");
    expect(repository.insert).toHaveBeenCalledTimes(1);
  });

  it("na QuestConflictError (race) ponovo cita umesto da baci gresku", async () => {
    const generated = generateDailyQuest(USER, "2026-09-14");
    const raceWinnerRow = mapDomainQuestToRow({ ...generated, progressValue: 5, status: "IN_PROGRESS" });
    const repository = {
      findByUserAndDate: jest
        .fn()
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(raceWinnerRow),
      insert: jest.fn().mockRejectedValue(new QuestConflictError("duplicate")),
    } as unknown as QuestsRepository;

    const service = new QuestsService(repository);
    const result = await service.getOrCreateToday(USER, NOW);

    expect(result.progressValue).toBe(5);
    expect(result.status).toBe("IN_PROGRESS");
    expect(repository.findByUserAndDate).toHaveBeenCalledTimes(2);
  });
});

describe("QuestsService.persist", () => {
  it("upisuje progress/status/completedAt preko repository.update", async () => {
    const quest = { ...generateDailyQuest(USER, "2026-09-14"), progressValue: 50, status: "COMPLETED" as const, completedAt: NOW.toISOString() };
    const updatedRow = mapDomainQuestToRow(quest);
    const repository = {
      update: jest.fn().mockResolvedValue(updatedRow),
    } as unknown as QuestsRepository;

    const service = new QuestsService(repository);
    const result = await service.persist(quest);

    expect(repository.update).toHaveBeenCalledWith(quest.id, {
      progress_value: 50,
      status: "COMPLETED",
      completed_at: NOW.toISOString(),
    });
    expect(result.status).toBe("COMPLETED");
  });
});

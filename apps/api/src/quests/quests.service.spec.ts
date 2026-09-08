import { ConflictException, NotFoundException } from "@nestjs/common";
import { Test, type TestingModule } from "@nestjs/testing";
import { InMemoryPlayerRepository, PLAYER_REPOSITORY } from "../player/player.repository";
import { PlayerService } from "../player/player.service";
import { InMemoryQuestsRepository, QUESTS_REPOSITORY } from "./quests.repository";
import { QuestsService } from "./quests.service";

describe("QuestsService", () => {
  let service: QuestsService;
  let playerService: PlayerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuestsService,
        PlayerService,
        { provide: QUESTS_REPOSITORY, useClass: InMemoryQuestsRepository },
        { provide: PLAYER_REPOSITORY, useClass: InMemoryPlayerRepository },
      ],
    }).compile();

    service = module.get(QuestsService);
    playerService = module.get(PlayerService);
    await playerService.createInitialProfile("user-1");
  });

  it("create pravi active quest", async () => {
    const quest = await service.create("user-1", {
      title: "50 sklekova",
      xpReward: 50,
      goldReward: 10,
    });

    expect(quest.status).toBe("active");
    expect(quest.title).toBe("50 sklekova");
  });

  it("listMine vraca samo questove tog korisnika", async () => {
    await playerService.createInitialProfile("user-2");
    await service.create("user-1", { title: "Quest A", xpReward: 10, goldReward: 0 });
    await service.create("user-2", { title: "Quest B", xpReward: 10, goldReward: 0 });

    const questsForUser1 = await service.listMine("user-1");
    expect(questsForUser1).toHaveLength(1);
    expect(questsForUser1[0]?.title).toBe("Quest A");
  });

  it("complete dodeljuje nagradu i vraca azuriran player profil", async () => {
    const quest = await service.create("user-1", {
      title: "100 sklekova",
      xpReward: 100,
      goldReward: 25,
    });

    const result = await service.complete("user-1", quest.id);

    expect(result.quest.status).toBe("completed");
    expect(result.leveledUp).toBe(true);
    expect(result.previousRank).toBe("E");
    expect(result.player.level).toBe(2);
    expect(result.player.gold).toBe(25);
  });

  it("complete baca ConflictException ako je quest vec zavrsen", async () => {
    const quest = await service.create("user-1", {
      title: "Quest",
      xpReward: 10,
      goldReward: 0,
    });
    await service.complete("user-1", quest.id);

    await expect(service.complete("user-1", quest.id)).rejects.toBeInstanceOf(ConflictException);
  });

  it("complete baca NotFoundException za tudji quest", async () => {
    await playerService.createInitialProfile("user-2");
    const quest = await service.create("user-1", {
      title: "Quest",
      xpReward: 10,
      goldReward: 0,
    });

    await expect(service.complete("user-2", quest.id)).rejects.toBeInstanceOf(NotFoundException);
  });
});

import { Test, type TestingModule } from "@nestjs/testing";
import type { QuestResponse } from "@risesolo/validation";
import type { AuthenticatedUser } from "../common/current-user.decorator";
import { QuestsController } from "./quests.controller";
import { QuestsService } from "./quests.service";

describe("QuestsController", () => {
  let controller: QuestsController;
  const currentUser: AuthenticatedUser = { userId: "user-1", email: "hunter@risesolo.app" };
  const quest: QuestResponse = {
    id: "quest-1",
    title: "50 sklekova",
    xpReward: 50,
    goldReward: 10,
    status: "active",
    createdAt: new Date().toISOString(),
  };
  const questsService = {
    create: jest.fn().mockResolvedValue(quest),
    listMine: jest.fn().mockResolvedValue([quest]),
    complete: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [QuestsController],
      providers: [{ provide: QuestsService, useValue: questsService }],
    }).compile();

    controller = module.get(QuestsController);
  });

  it("create delegira na QuestsService.create sa userId iz tokena", async () => {
    const body = { title: "50 sklekova", xpReward: 50, goldReward: 10 };
    const result = await controller.create(currentUser, body);

    expect(questsService.create).toHaveBeenCalledWith("user-1", body);
    expect(result).toBe(quest);
  });

  it("listMine delegira na QuestsService.listMine", async () => {
    const result = await controller.listMine(currentUser);

    expect(questsService.listMine).toHaveBeenCalledWith("user-1");
    expect(result).toEqual([quest]);
  });

  it("complete delegira na QuestsService.complete", async () => {
    await controller.complete(currentUser, "quest-1");

    expect(questsService.complete).toHaveBeenCalledWith("user-1", "quest-1");
  });
});

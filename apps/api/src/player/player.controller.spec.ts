import { Test, type TestingModule } from "@nestjs/testing";
import type { PlayerProfileResponse } from "@risesolo/validation";
import type { AuthenticatedUser } from "../common/current-user.decorator";
import { PlayerController } from "./player.controller";
import { PlayerService } from "./player.service";

describe("PlayerController", () => {
  let controller: PlayerController;
  const currentUser: AuthenticatedUser = { userId: "user-1", email: "hunter@risesolo.app" };
  const profile: PlayerProfileResponse = {
    userId: "user-1",
    level: 1,
    rank: "E",
    totalXp: 0,
    xpIntoLevel: 0,
    xpRequiredForLevel: 100,
    gold: 0,
    unallocatedStatPoints: 0,
    stats: { strength: 0, agility: 0, endurance: 0, vitality: 0 },
  };
  const playerService = {
    getProfile: jest.fn().mockResolvedValue(profile),
    allocateStat: jest.fn().mockResolvedValue(profile),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PlayerController],
      providers: [{ provide: PlayerService, useValue: playerService }],
    }).compile();

    controller = module.get(PlayerController);
  });

  it("getMyProfile delegira na PlayerService.getProfile sa userId iz tokena", async () => {
    const result = await controller.getMyProfile(currentUser);

    expect(playerService.getProfile).toHaveBeenCalledWith("user-1");
    expect(result).toBe(profile);
  });

  it("allocateStat delegira na PlayerService.allocateStat", async () => {
    const result = await controller.allocateStat(currentUser, { stat: "strength", points: 2 });

    expect(playerService.allocateStat).toHaveBeenCalledWith("user-1", "strength", 2);
    expect(result).toBe(profile);
  });
});

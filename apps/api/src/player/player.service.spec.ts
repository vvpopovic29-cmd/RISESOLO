import { BadRequestException, NotFoundException } from "@nestjs/common";
import { Test, type TestingModule } from "@nestjs/testing";
import { InMemoryPlayerRepository, PLAYER_REPOSITORY } from "./player.repository";
import { PlayerService } from "./player.service";

describe("PlayerService", () => {
  let service: PlayerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlayerService,
        { provide: PLAYER_REPOSITORY, useClass: InMemoryPlayerRepository },
      ],
    }).compile();

    service = module.get(PlayerService);
  });

  it("getProfile baca NotFoundException ako profil ne postoji", async () => {
    await expect(service.getProfile("unknown-user")).rejects.toBeInstanceOf(NotFoundException);
  });

  it("createInitialProfile pravi profil na nivou 1, rang E, bez poena", async () => {
    await service.createInitialProfile("user-1");
    const profile = await service.getProfile("user-1");

    expect(profile).toMatchObject({
      userId: "user-1",
      level: 1,
      rank: "E",
      totalXp: 0,
      gold: 0,
      unallocatedStatPoints: 0,
      stats: { strength: 0, agility: 0, endurance: 0, vitality: 0 },
    });
  });

  it("applyRewards dodaje XP/gold i prijavljuje level-up", async () => {
    await service.createInitialProfile("user-1");
    const outcome = await service.applyRewards("user-1", { xp: 100, gold: 25 });

    expect(outcome.leveledUp).toBe(true);
    expect(outcome.levelsGained).toBe(1);

    const profile = await service.getProfile("user-1");
    expect(profile.level).toBe(2);
    expect(profile.gold).toBe(25);
    expect(profile.unallocatedStatPoints).toBe(3);
  });

  it("allocateStat trosi neraspodeljene poene na izabranu statistiku", async () => {
    await service.createInitialProfile("user-1");
    await service.applyRewards("user-1", { xp: 100, gold: 0 });

    const profile = await service.allocateStat("user-1", "strength", 2);
    expect(profile.stats.strength).toBe(2);
    expect(profile.unallocatedStatPoints).toBe(1);
  });

  it("allocateStat baca BadRequestException kada nema dovoljno poena", async () => {
    await service.createInitialProfile("user-1");

    await expect(service.allocateStat("user-1", "strength", 1)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});

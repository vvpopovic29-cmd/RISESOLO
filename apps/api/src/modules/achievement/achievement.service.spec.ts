import { BadRequestException } from "@nestjs/common";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createChainableMock } from "../../test/supabase-query-builder.mock";
import { AchievementService } from "./achievement.service";
import type { AchievementRow, PlayerAchievementRow } from "./achievement.types";

const firstWorkoutRow: AchievementRow = {
  id: "a1",
  code: "first_workout",
  title: "Prvi korak",
  description: "Zabelezi svoj prvi trening.",
  category: "training",
  requirement_type: "workout_count",
  requirement_value: 1,
  xp_reward: 50,
  coin_reward: 10,
  sort_order: 10,
};

const streak7Row: AchievementRow = {
  id: "a2",
  code: "streak_7",
  title: "Nedelja discipline",
  description: "Dostigni streak od 7 dana.",
  category: "consistency",
  requirement_type: "longest_streak",
  requirement_value: 7,
  xp_reward: 250,
  coin_reward: 60,
  sort_order: 31,
};

describe("AchievementService", () => {
  describe("listAchievements", () => {
    it("spaja katalog sa unlocked/unlockedAt stanjem za igraca", async () => {
      const unlockedRow: PlayerAchievementRow = {
        player_id: "p1",
        achievement_id: "a1",
        unlocked_at: "2026-01-05T10:00:00.000Z",
      };
      const achievementsBuilder = createChainableMock({
        data: [firstWorkoutRow, streak7Row],
        error: null,
      });
      const unlockedBuilder = createChainableMock({ data: [unlockedRow], error: null });
      const from = jest
        .fn()
        .mockReturnValueOnce(achievementsBuilder)
        .mockReturnValueOnce(unlockedBuilder);
      const supabase = { from, rpc: jest.fn() } as unknown as SupabaseClient;
      const service = new AchievementService(supabase);

      const result = await service.listAchievements("p1");

      expect(result).toEqual([
        {
          id: "a1",
          code: "first_workout",
          title: "Prvi korak",
          description: "Zabelezi svoj prvi trening.",
          category: "training",
          requirementType: "workout_count",
          requirementValue: 1,
          xpReward: 50,
          coinReward: 10,
          unlocked: true,
          unlockedAt: "2026-01-05T10:00:00.000Z",
        },
        {
          id: "a2",
          code: "streak_7",
          title: "Nedelja discipline",
          description: "Dostigni streak od 7 dana.",
          category: "consistency",
          requirementType: "longest_streak",
          requirementValue: 7,
          xpReward: 250,
          coinReward: 60,
          unlocked: false,
          unlockedAt: null,
        },
      ]);
    });
  });

  describe("evaluateAchievements", () => {
    it("prosledjuje player id RPC-u i mapira novootkljucane achievement-e", async () => {
      const rpc = jest.fn().mockResolvedValue({ data: [firstWorkoutRow], error: null });
      const supabase = { from: jest.fn(), rpc } as unknown as SupabaseClient;
      const service = new AchievementService(supabase);

      const result = await service.evaluateAchievements("p1");

      expect(rpc).toHaveBeenCalledWith("fn_evaluate_achievements", { p_player_id: "p1" });
      expect(result).toHaveLength(1);
      expect(result[0]?.code).toBe("first_workout");
      expect(result[0]?.unlocked).toBe(true);
    });

    it("vraca praznu listu kada nema novih achievement-a", async () => {
      const rpc = jest.fn().mockResolvedValue({ data: [], error: null });
      const supabase = { from: jest.fn(), rpc } as unknown as SupabaseClient;
      const service = new AchievementService(supabase);

      const result = await service.evaluateAchievements("p1");

      expect(result).toEqual([]);
    });

    it("baca BadRequestException kada RPC vrati gresku", async () => {
      const rpc = jest
        .fn()
        .mockResolvedValue({ data: null, error: { message: "player not found" } });
      const supabase = { from: jest.fn(), rpc } as unknown as SupabaseClient;
      const service = new AchievementService(supabase);

      await expect(service.evaluateAchievements("missing")).rejects.toThrow(BadRequestException);
    });
  });
});

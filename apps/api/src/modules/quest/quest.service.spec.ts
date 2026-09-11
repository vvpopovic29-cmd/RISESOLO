import { BadRequestException, NotFoundException } from "@nestjs/common";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createChainableMock } from "../../test/supabase-query-builder.mock";
import { QuestService } from "./quest.service";
import type { QuestRow } from "./quest.types";

const baseQuestRow: QuestRow = {
  id: "q1",
  player_id: "p1",
  type: "daily",
  title: "Zavrsi danasnji trening",
  description: null,
  linked_action: "workout",
  target_count: 1,
  progress_count: 0,
  xp_reward: 500,
  coin_reward: 20,
  status: "active",
  expires_at: null,
  completed_at: null,
  created_at: "2026-01-01T00:00:00.000Z",
  target_rank: null,
};

function noopSweepRpc(): jest.Mock {
  return jest.fn().mockResolvedValue({ data: null, error: null });
}

describe("QuestService", () => {
  describe("listQuests", () => {
    it("pokrece sweep isteklih questova pre ucitavanja liste", async () => {
      const builder = createChainableMock({ data: [baseQuestRow], error: null });
      const rpc = noopSweepRpc();
      const supabase = { from: jest.fn(() => builder), rpc } as unknown as SupabaseClient;
      const service = new QuestService(supabase);

      const result = await service.listQuests("p1");

      expect(rpc).toHaveBeenCalledWith("fn_expire_stale_quests", { p_player_id: "p1" });
      expect(result).toHaveLength(1);
      expect(result[0]?.id).toBe("q1");
    });

    it("filtrira po statusu kada je prosledjen", async () => {
      const builder = createChainableMock({ data: [], error: null });
      const supabase = {
        from: jest.fn(() => builder),
        rpc: noopSweepRpc(),
      } as unknown as SupabaseClient;
      const service = new QuestService(supabase);

      await service.listQuests("p1", "completed");

      expect(builder.eq).toHaveBeenCalledWith("status", "completed");
    });
  });

  describe("generateDailyQuest", () => {
    it("vraca postojeci aktivan dnevni quest umesto da napravi duplikat", async () => {
      const existingBuilder = createChainableMock({ data: baseQuestRow, error: null });
      const supabase = {
        from: jest.fn(() => existingBuilder),
        rpc: noopSweepRpc(),
      } as unknown as SupabaseClient;
      const service = new QuestService(supabase);

      const result = await service.generateDailyQuest("p1");

      expect(result.id).toBe("q1");
      expect(existingBuilder.insert).not.toHaveBeenCalled();
    });

    it("kreira novi dnevni quest sa fiksnim nagradama i genericnim naslovom kada igrac nema Training Plan", async () => {
      const findBuilder = createChainableMock({ data: null, error: null });
      const trainingPlanBuilder = createChainableMock({ data: null, error: null });
      const insertBuilder = createChainableMock({ data: baseQuestRow, error: null });
      const from = jest
        .fn()
        .mockReturnValueOnce(findBuilder)
        .mockReturnValueOnce(trainingPlanBuilder)
        .mockReturnValueOnce(insertBuilder);
      const supabase = { from, rpc: noopSweepRpc() } as unknown as SupabaseClient;
      const service = new QuestService(supabase);

      const result = await service.generateDailyQuest("p1");

      expect(result.id).toBe("q1");
      expect(insertBuilder.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          player_id: "p1",
          type: "daily",
          linked_action: "workout",
          title: "Zavrsi danasnji trening",
        }),
      );
    });

    it("prilagodjava naslov/opis fokusu iz Training Plan-a kada igrac ima aktivan plan", async () => {
      const findBuilder = createChainableMock({ data: null, error: null });
      const trainingPlanBuilder = createChainableMock({
        data: { schedule: Array(7).fill("push") },
        error: null,
      });
      const insertBuilder = createChainableMock({ data: baseQuestRow, error: null });
      const from = jest
        .fn()
        .mockReturnValueOnce(findBuilder)
        .mockReturnValueOnce(trainingPlanBuilder)
        .mockReturnValueOnce(insertBuilder);
      const supabase = { from, rpc: noopSweepRpc() } as unknown as SupabaseClient;
      const service = new QuestService(supabase);

      await service.generateDailyQuest("p1");

      expect(insertBuilder.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Zavrsi danasnji Push trening",
          description: expect.stringContaining("Push fokus danas"),
        }),
      );
    });
  });

  describe("generateWeeklyQuest", () => {
    it("vraca postojeci aktivan weekly quest umesto da napravi duplikat", async () => {
      const weeklyRow: QuestRow = { ...baseQuestRow, type: "weekly", target_count: 5 };
      const existingBuilder = createChainableMock({ data: weeklyRow, error: null });
      const supabase = {
        from: jest.fn(() => existingBuilder),
        rpc: noopSweepRpc(),
      } as unknown as SupabaseClient;
      const service = new QuestService(supabase);

      const result = await service.generateWeeklyQuest("p1");

      expect(result.type).toBe("weekly");
      expect(existingBuilder.insert).not.toHaveBeenCalled();
    });

    it("kreira novi weekly quest sa target_count=5 kada ne postoji aktivan za ovu nedelju", async () => {
      const findBuilder = createChainableMock({ data: null, error: null });
      const weeklyRow: QuestRow = { ...baseQuestRow, type: "weekly", target_count: 5 };
      const insertBuilder = createChainableMock({ data: weeklyRow, error: null });
      const from = jest.fn().mockReturnValueOnce(findBuilder).mockReturnValueOnce(insertBuilder);
      const supabase = { from, rpc: noopSweepRpc() } as unknown as SupabaseClient;
      const service = new QuestService(supabase);

      const result = await service.generateWeeklyQuest("p1");

      expect(result.type).toBe("weekly");
      expect(insertBuilder.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          player_id: "p1",
          type: "weekly",
          linked_action: "workout",
          target_count: 5,
        }),
      );
    });
  });

  describe("generateSideQuest", () => {
    it("kreira novi side quest sa linked_action=nutrition kada ne postoji aktivan za danas", async () => {
      const findBuilder = createChainableMock({ data: null, error: null });
      const sideRow: QuestRow = {
        ...baseQuestRow,
        type: "side",
        linked_action: "nutrition",
        target_count: 3,
      };
      const insertBuilder = createChainableMock({ data: sideRow, error: null });
      const from = jest.fn().mockReturnValueOnce(findBuilder).mockReturnValueOnce(insertBuilder);
      const supabase = { from, rpc: noopSweepRpc() } as unknown as SupabaseClient;
      const service = new QuestService(supabase);

      const result = await service.generateSideQuest("p1");

      expect(result.type).toBe("side");
      expect(result.linkedAction).toBe("nutrition");
      expect(insertBuilder.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          player_id: "p1",
          type: "side",
          linked_action: "nutrition",
          target_count: 3,
        }),
      );
    });
  });

  describe("generateRankExamQuest", () => {
    it("baca BadRequestException kada je igrac vec na najvisem rangu (SSS)", async () => {
      const playerBuilder = createChainableMock({
        data: { rank: "SSS", level: 40 },
        error: null,
      });
      const supabase = {
        from: jest.fn(() => playerBuilder),
        rpc: noopSweepRpc(),
      } as unknown as SupabaseClient;
      const service = new QuestService(supabase);

      await expect(service.generateRankExamQuest("p1")).rejects.toThrow(BadRequestException);
    });

    it("baca BadRequestException kada Level ne dostize prag za sledeci rang", async () => {
      const playerBuilder = createChainableMock({ data: { rank: "E", level: 2 }, error: null });
      const supabase = {
        from: jest.fn(() => playerBuilder),
        rpc: noopSweepRpc(),
      } as unknown as SupabaseClient;
      const service = new QuestService(supabase);

      await expect(service.generateRankExamQuest("p1")).rejects.toThrow(BadRequestException);
    });

    it("vraca postojeci aktivan Rank Exam quest umesto da napravi duplikat", async () => {
      const playerBuilder = createChainableMock({ data: { rank: "E", level: 5 }, error: null });
      const bossQuestRow: QuestRow = {
        ...baseQuestRow,
        type: "boss",
        target_rank: "D",
      };
      const existingBuilder = createChainableMock({ data: bossQuestRow, error: null });
      const from = jest
        .fn()
        .mockReturnValueOnce(playerBuilder)
        .mockReturnValueOnce(existingBuilder);
      const supabase = { from, rpc: noopSweepRpc() } as unknown as SupabaseClient;
      const service = new QuestService(supabase);

      const result = await service.generateRankExamQuest("p1");

      expect(result.targetRank).toBe("D");
      expect(existingBuilder.insert).not.toHaveBeenCalled();
    });

    it("kreira novi Rank Exam quest sa target_rank kada igrac ispunjava uslove i nema aktivan ispit", async () => {
      const playerBuilder = createChainableMock({ data: { rank: "E", level: 5 }, error: null });
      const findBuilder = createChainableMock({ data: null, error: null });
      const cooldownBuilder = createChainableMock({ data: null, error: null });
      const bossQuestRow: QuestRow = {
        ...baseQuestRow,
        type: "boss",
        target_rank: "D",
      };
      const insertBuilder = createChainableMock({ data: bossQuestRow, error: null });
      const from = jest
        .fn()
        .mockReturnValueOnce(playerBuilder)
        .mockReturnValueOnce(findBuilder)
        .mockReturnValueOnce(cooldownBuilder)
        .mockReturnValueOnce(insertBuilder);
      const supabase = { from, rpc: noopSweepRpc() } as unknown as SupabaseClient;
      const service = new QuestService(supabase);

      const result = await service.generateRankExamQuest("p1");

      expect(result.targetRank).toBe("D");
      expect(insertBuilder.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          player_id: "p1",
          type: "boss",
          linked_action: "workout",
          target_rank: "D",
        }),
      );
    });

    it("baca BadRequestException kada je prethodni Rank Exam za isti rang istekao pre manje od 24h", async () => {
      const playerBuilder = createChainableMock({ data: { rank: "E", level: 5 }, error: null });
      const findBuilder = createChainableMock({ data: null, error: null });
      const recentlyFailedAt = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const cooldownBuilder = createChainableMock({
        data: { expires_at: recentlyFailedAt },
        error: null,
      });
      const from = jest
        .fn()
        .mockReturnValueOnce(playerBuilder)
        .mockReturnValueOnce(findBuilder)
        .mockReturnValueOnce(cooldownBuilder);
      const supabase = { from, rpc: noopSweepRpc() } as unknown as SupabaseClient;
      const service = new QuestService(supabase);

      await expect(service.generateRankExamQuest("p1")).rejects.toThrow(BadRequestException);
    });

    it("dozvoljava novi pokusaj kada je prethodni neuspeh stariji od 24h", async () => {
      const playerBuilder = createChainableMock({ data: { rank: "E", level: 5 }, error: null });
      const findBuilder = createChainableMock({ data: null, error: null });
      const longAgoFailedAt = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();
      const cooldownBuilder = createChainableMock({
        data: { expires_at: longAgoFailedAt },
        error: null,
      });
      const bossQuestRow: QuestRow = { ...baseQuestRow, type: "boss", target_rank: "D" };
      const insertBuilder = createChainableMock({ data: bossQuestRow, error: null });
      const from = jest
        .fn()
        .mockReturnValueOnce(playerBuilder)
        .mockReturnValueOnce(findBuilder)
        .mockReturnValueOnce(cooldownBuilder)
        .mockReturnValueOnce(insertBuilder);
      const supabase = { from, rpc: noopSweepRpc() } as unknown as SupabaseClient;
      const service = new QuestService(supabase);

      const result = await service.generateRankExamQuest("p1");

      expect(result.targetRank).toBe("D");
      expect(insertBuilder.insert).toHaveBeenCalled();
    });
  });

  describe("completeQuest", () => {
    it("poziva fn_complete_daily_quest RPC i vraca mapiran quest", async () => {
      const rpc = jest
        .fn()
        .mockResolvedValue({ data: { ...baseQuestRow, status: "completed" }, error: null });
      const supabase = { from: jest.fn(), rpc } as unknown as SupabaseClient;
      const service = new QuestService(supabase);

      const result = await service.completeQuest("p1", "q1");

      expect(rpc).toHaveBeenCalledWith("fn_complete_daily_quest", {
        p_player_id: "p1",
        p_quest_id: "q1",
      });
      expect(result.status).toBe("completed");
    });

    it("baca NotFoundException kada quest ne postoji za igraca", async () => {
      const rpc = jest
        .fn()
        .mockResolvedValue({ data: null, error: { message: "quest xyz not found for player p1" } });
      const supabase = { from: jest.fn(), rpc } as unknown as SupabaseClient;
      const service = new QuestService(supabase);

      await expect(service.completeQuest("p1", "missing")).rejects.toThrow(NotFoundException);
    });

    it("baca BadRequestException kada progres jos nije dostigao cilj", async () => {
      const rpc = jest.fn().mockResolvedValue({
        data: null,
        error: { message: "quest q1 progress 0 has not reached target 1" },
      });
      const supabase = { from: jest.fn(), rpc } as unknown as SupabaseClient;
      const service = new QuestService(supabase);

      await expect(service.completeQuest("p1", "q1")).rejects.toThrow(BadRequestException);
    });
  });
});

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
};

describe("QuestService", () => {
  describe("listQuests", () => {
    it("vraca mapiranu listu questova", async () => {
      const builder = createChainableMock({ data: [baseQuestRow], error: null });
      const supabase = {
        from: jest.fn(() => builder),
        rpc: jest.fn(),
      } as unknown as SupabaseClient;
      const service = new QuestService(supabase);

      const result = await service.listQuests("p1");

      expect(result).toHaveLength(1);
      expect(result[0]?.id).toBe("q1");
    });

    it("filtrira po statusu kada je prosledjen", async () => {
      const builder = createChainableMock({ data: [], error: null });
      const supabase = {
        from: jest.fn(() => builder),
        rpc: jest.fn(),
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
        rpc: jest.fn(),
      } as unknown as SupabaseClient;
      const service = new QuestService(supabase);

      const result = await service.generateDailyQuest("p1");

      expect(result.id).toBe("q1");
      expect(existingBuilder.insert).not.toHaveBeenCalled();
    });

    it("kreira novi dnevni quest sa fiksnim nagradama kada ne postoji aktivan za danas", async () => {
      const findBuilder = createChainableMock({ data: null, error: null });
      const insertBuilder = createChainableMock({ data: baseQuestRow, error: null });
      const from = jest.fn().mockReturnValueOnce(findBuilder).mockReturnValueOnce(insertBuilder);
      const supabase = { from, rpc: jest.fn() } as unknown as SupabaseClient;
      const service = new QuestService(supabase);

      const result = await service.generateDailyQuest("p1");

      expect(result.id).toBe("q1");
      expect(insertBuilder.insert).toHaveBeenCalledWith(
        expect.objectContaining({ player_id: "p1", type: "daily", linked_action: "workout" }),
      );
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

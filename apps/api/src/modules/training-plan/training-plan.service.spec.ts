import { BadRequestException } from "@nestjs/common";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createChainableMock } from "../../test/supabase-query-builder.mock";
import { TrainingPlanService } from "./training-plan.service";
import type { TrainingPlanRow } from "./training-plan.types";

const basePlanRow: TrainingPlanRow = {
  player_id: "p1",
  split_type: "push_pull_legs",
  days_per_week: 3,
  schedule: ["rest", "rest", "push", "rest", "pull", "rest", "legs"],
  updated_at: "2026-01-01T00:00:00.000Z",
};

describe("TrainingPlanService", () => {
  describe("getPlan", () => {
    it("vraca sva null polja kada igrac jos nema plan", async () => {
      const builder = createChainableMock({ data: null, error: null });
      const supabase = {
        from: jest.fn(() => builder),
        rpc: jest.fn(),
      } as unknown as SupabaseClient;
      const service = new TrainingPlanService(supabase);

      const result = await service.getPlan("p1");

      expect(result).toEqual({
        splitType: null,
        daysPerWeek: null,
        schedule: null,
        updatedAt: null,
      });
    });

    it("mapira postojeci plan iz baze", async () => {
      const builder = createChainableMock({ data: basePlanRow, error: null });
      const supabase = {
        from: jest.fn(() => builder),
        rpc: jest.fn(),
      } as unknown as SupabaseClient;
      const service = new TrainingPlanService(supabase);

      const result = await service.getPlan("p1");

      expect(result.splitType).toBe("push_pull_legs");
      expect(result.daysPerWeek).toBe(3);
      expect(result.schedule).toEqual(basePlanRow.schedule);
    });
  });

  describe("updatePlan", () => {
    it("generise raspored preko domain sloja i prosledjuje ga RPC-u", async () => {
      const rpc = jest.fn().mockResolvedValue({ data: basePlanRow, error: null });
      const supabase = { from: jest.fn(), rpc } as unknown as SupabaseClient;
      const service = new TrainingPlanService(supabase);

      const result = await service.updatePlan("p1", {
        splitType: "push_pull_legs",
        daysPerWeek: 3,
      });

      expect(rpc).toHaveBeenCalledWith("fn_upsert_training_plan", {
        p_player_id: "p1",
        p_split_type: "push_pull_legs",
        p_days_per_week: 3,
        p_schedule: ["rest", "rest", "push", "rest", "pull", "rest", "legs"],
      });
      expect(result.splitType).toBe("push_pull_legs");
      expect(result.schedule).toHaveLength(7);
    });

    it("baca BadRequestException kada RPC vrati gresku", async () => {
      const rpc = jest.fn().mockResolvedValue({ data: null, error: { message: "db error" } });
      const supabase = { from: jest.fn(), rpc } as unknown as SupabaseClient;
      const service = new TrainingPlanService(supabase);

      await expect(
        service.updatePlan("p1", { splitType: "full_body", daysPerWeek: 3 }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});

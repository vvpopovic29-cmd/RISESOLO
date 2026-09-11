import { BadRequestException } from "@nestjs/common";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createChainableMock } from "../../test/supabase-query-builder.mock";
import { NutritionService } from "./nutrition.service";
import type {
  MealLogRow,
  NutritionDailyBonusRow,
  NutritionTargetsRow,
  WaterLogRow,
} from "./nutrition.types";

const baseTargetsRow: NutritionTargetsRow = {
  player_id: "p1",
  calorie_target: 2400,
  protein_target_g: 180,
  carb_target_g: 250,
  fat_target_g: 70,
  water_target_ml: 2500,
  updated_at: "2026-01-01T00:00:00.000Z",
};

const baseMealRow: MealLogRow = {
  id: "m1",
  player_id: "p1",
  name: "Rucak",
  calories: 650,
  protein_g: 45,
  carbs_g: 60,
  fat_g: 20,
  logged_at: "2026-01-01T12:00:00.000Z",
  created_at: "2026-01-01T12:00:00.000Z",
};

const baseWaterRow: WaterLogRow = {
  id: "w1",
  player_id: "p1",
  amount_ml: 500,
  logged_at: "2026-01-01T12:00:00.000Z",
};

const baseBonusRow: NutritionDailyBonusRow = {
  player_id: "p1",
  bonus_date: "2026-01-01",
  granted_at: "2026-01-01T20:00:00.000Z",
};

describe("NutritionService", () => {
  describe("getTargets", () => {
    it("vraca mapirane ciljeve kada red postoji", async () => {
      const builder = createChainableMock({ data: baseTargetsRow, error: null });
      const supabase = {
        from: jest.fn(() => builder),
        rpc: jest.fn(),
      } as unknown as SupabaseClient;
      const service = new NutritionService(supabase);

      const result = await service.getTargets("p1");

      expect(result).toEqual({
        calorieTarget: 2400,
        proteinTargetG: 180,
        carbTargetG: 250,
        fatTargetG: 70,
        waterTargetMl: 2500,
      });
    });

    it("vraca sve null vrednosti kada igrac jos nema postavljene ciljeve", async () => {
      const builder = createChainableMock({ data: null, error: null });
      const supabase = {
        from: jest.fn(() => builder),
        rpc: jest.fn(),
      } as unknown as SupabaseClient;
      const service = new NutritionService(supabase);

      const result = await service.getTargets("p1");

      expect(result).toEqual({
        calorieTarget: null,
        proteinTargetG: null,
        carbTargetG: null,
        fatTargetG: null,
        waterTargetMl: null,
      });
    });
  });

  describe("updateTargets", () => {
    it("poziva fn_upsert_nutrition_targets sa mapiranim parametrima", async () => {
      const rpc = jest.fn().mockResolvedValue({ data: baseTargetsRow, error: null });
      const supabase = { from: jest.fn(), rpc } as unknown as SupabaseClient;
      const service = new NutritionService(supabase);

      await service.updateTargets("p1", { calorieTarget: 2400 });

      expect(rpc).toHaveBeenCalledWith("fn_upsert_nutrition_targets", {
        p_player_id: "p1",
        p_calorie_target: 2400,
        p_protein_target_g: null,
        p_carb_target_g: null,
        p_fat_target_g: null,
        p_water_target_ml: null,
      });
    });

    it("baca BadRequestException kada RPC vrati gresku", async () => {
      const rpc = jest.fn().mockResolvedValue({ data: null, error: { message: "boom" } });
      const supabase = { from: jest.fn(), rpc } as unknown as SupabaseClient;
      const service = new NutritionService(supabase);

      await expect(service.updateTargets("p1", { calorieTarget: 2400 })).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe("logMeal", () => {
    it("poziva fn_log_meal i vraca mapiran obrok", async () => {
      const rpc = jest.fn().mockResolvedValue({ data: baseMealRow, error: null });
      const supabase = { from: jest.fn(), rpc } as unknown as SupabaseClient;
      const service = new NutritionService(supabase);

      const result = await service.logMeal("p1", {
        name: "Rucak",
        calories: 650,
        proteinG: 45,
        carbsG: 60,
        fatG: 20,
      });

      expect(rpc).toHaveBeenCalledWith("fn_log_meal", {
        p_player_id: "p1",
        p_name: "Rucak",
        p_calories: 650,
        p_protein_g: 45,
        p_carbs_g: 60,
        p_fat_g: 20,
      });
      expect(result.id).toBe("m1");
    });
  });

  describe("logWater", () => {
    it("poziva fn_log_water i vraca mapiran unos vode", async () => {
      const rpc = jest.fn().mockResolvedValue({ data: baseWaterRow, error: null });
      const supabase = { from: jest.fn(), rpc } as unknown as SupabaseClient;
      const service = new NutritionService(supabase);

      const result = await service.logWater("p1", { amountMl: 500 });

      expect(rpc).toHaveBeenCalledWith("fn_log_water", { p_player_id: "p1", p_amount_ml: 500 });
      expect(result.amountMl).toBe(500);
    });
  });

  describe("getDailySummary", () => {
    it("agregira obroke i unos vode za dati dan i prilaze ciljeve", async () => {
      const mealsBuilder = createChainableMock({ data: [baseMealRow], error: null });
      const waterBuilder = createChainableMock({ data: [baseWaterRow], error: null });
      const targetsBuilder = createChainableMock({ data: baseTargetsRow, error: null });
      const bonusBuilder = createChainableMock({ data: null, error: null });
      const from = jest
        .fn()
        .mockReturnValueOnce(mealsBuilder)
        .mockReturnValueOnce(waterBuilder)
        .mockReturnValueOnce(targetsBuilder)
        .mockReturnValueOnce(bonusBuilder);
      const supabase = { from, rpc: jest.fn() } as unknown as SupabaseClient;
      const service = new NutritionService(supabase);

      const result = await service.getDailySummary("p1", "2026-01-01");

      expect(result.date).toBe("2026-01-01");
      expect(result.totalCalories).toBe(650);
      expect(result.totalProteinG).toBe(45);
      expect(result.totalWaterMl).toBe(500);
      expect(result.targets.calorieTarget).toBe(2400);
      expect(result.meals).toHaveLength(1);
      expect(result.waterLogs).toHaveLength(1);
      expect(result.dailyGoalMet).toBe(false);
      expect(result.bonusXpGranted).toBe(false);
    });

    it("dailyGoalMet je true kada su svi ciljevi ispunjeni", async () => {
      const bigMeal: MealLogRow = {
        ...baseMealRow,
        calories: 2400,
        protein_g: 180,
        carbs_g: 250,
        fat_g: 70,
      };
      const bigWater: WaterLogRow = { ...baseWaterRow, amount_ml: 2500 };
      const mealsBuilder = createChainableMock({ data: [bigMeal], error: null });
      const waterBuilder = createChainableMock({ data: [bigWater], error: null });
      const targetsBuilder = createChainableMock({ data: baseTargetsRow, error: null });
      const bonusBuilder = createChainableMock({ data: baseBonusRow, error: null });
      const from = jest
        .fn()
        .mockReturnValueOnce(mealsBuilder)
        .mockReturnValueOnce(waterBuilder)
        .mockReturnValueOnce(targetsBuilder)
        .mockReturnValueOnce(bonusBuilder);
      const supabase = { from, rpc: jest.fn() } as unknown as SupabaseClient;
      const service = new NutritionService(supabase);

      const result = await service.getDailySummary("p1", "2026-01-01");

      expect(result.dailyGoalMet).toBe(true);
      expect(result.bonusXpGranted).toBe(true);
    });
  });
});

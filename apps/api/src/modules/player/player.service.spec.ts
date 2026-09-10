import {
  BadRequestException,
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";
import type { SupabaseClient } from "@supabase/supabase-js";
import { PlayerService } from "./player.service";
import type { PlayerRow } from "./player.types";

const baseRow: PlayerRow = {
  id: "p1",
  display_name: "Vukasin",
  level: 1,
  xp: 50,
  stat_points_available: 0,
  rank: "E",
  class: null,
  coins: 0,
  hp: 100,
  strength: 1,
  agility: 1,
  endurance: 1,
  vitality: 1,
  intelligence: 1,
  current_streak: 0,
  longest_streak: 0,
  last_activity_date: null,
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
};

interface SupabaseResult<T> {
  data: T | null;
  error: { message: string } | null;
}

interface QueryBuilderMock {
  select: jest.Mock;
  update: jest.Mock;
  eq: jest.Mock;
  maybeSingle: jest.Mock;
}

function createQueryBuilderMock(result: SupabaseResult<unknown>): QueryBuilderMock {
  const builder: QueryBuilderMock = {
    select: jest.fn(),
    update: jest.fn(),
    eq: jest.fn(),
    maybeSingle: jest.fn(() => Promise.resolve(result)),
  };
  builder.select.mockReturnValue(builder);
  builder.update.mockReturnValue(builder);
  builder.eq.mockReturnValue(builder);
  return builder;
}

function createSupabaseMock(
  queryResult: SupabaseResult<unknown>,
  rpcResult: SupabaseResult<unknown> = { data: null, error: null },
) {
  const builder = createQueryBuilderMock(queryResult);
  const supabase = {
    from: jest.fn(() => builder),
    rpc: jest.fn(() => Promise.resolve(rpcResult)),
  };
  return supabase as unknown as SupabaseClient;
}

describe("PlayerService", () => {
  describe("getProfile", () => {
    it("vraca mapiran DTO sa xpToNextLevel izracunatim iz domain formule", async () => {
      const supabase = createSupabaseMock({ data: baseRow, error: null });
      const service = new PlayerService(supabase);

      const result = await service.getProfile("p1");

      expect(result.displayName).toBe("Vukasin");
      expect(result.level).toBe(1);
      expect(result.xp).toBe(50);
      expect(result.xpToNextLevel).toBe(50); // level 1 zahteva 100 XP, 50 vec sakupljeno
    });

    it("baca NotFoundException kada player profil ne postoji", async () => {
      const supabase = createSupabaseMock({ data: null, error: null });
      const service = new PlayerService(supabase);

      await expect(service.getProfile("missing")).rejects.toThrow(NotFoundException);
    });

    it("baca InternalServerErrorException kada Supabase vrati gresku", async () => {
      const supabase = createSupabaseMock({ data: null, error: { message: "connection lost" } });
      const service = new PlayerService(supabase);

      await expect(service.getProfile("p1")).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe("updateProfile", () => {
    it("salje samo prosledjena polja i vraca azuriran DTO", async () => {
      const updatedRow: PlayerRow = { ...baseRow, display_name: "Novo Ime" };
      const supabase = createSupabaseMock({ data: updatedRow, error: null });
      const service = new PlayerService(supabase);

      const result = await service.updateProfile("p1", { displayName: "Novo Ime" });

      expect(result.displayName).toBe("Novo Ime");
    });
  });

  describe("allocateStatPoints", () => {
    it("poziva fn_allocate_stat_points RPC sa tacnim parametrima", async () => {
      const updatedRow: PlayerRow = { ...baseRow, strength: 2, stat_points_available: 0 };
      const supabase = createSupabaseMock(
        { data: null, error: null },
        { data: updatedRow, error: null },
      );
      const service = new PlayerService(supabase);

      const result = await service.allocateStatPoints("p1", { stat: "strength", points: 1 });

      expect(supabase.rpc).toHaveBeenCalledWith("fn_allocate_stat_points", {
        p_player_id: "p1",
        p_stat: "strength",
        p_points: 1,
      });
      expect(result.strength).toBe(2);
    });

    it("baca BadRequestException kada RPC odbije zahtev (npr. nema dovoljno poena)", async () => {
      const supabase = createSupabaseMock(
        { data: null, error: null },
        { data: null, error: { message: "nema dovoljno stat poena" } },
      );
      const service = new PlayerService(supabase);

      await expect(
        service.allocateStatPoints("p1", { stat: "strength", points: 100 }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});

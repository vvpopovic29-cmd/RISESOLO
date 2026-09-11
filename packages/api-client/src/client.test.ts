import { ApiError, createApiClient } from "./client";

function mockFetch(body: unknown, status = 200): typeof fetch {
  const ok = status >= 200 && status < 300;
  return (async () => ({
    ok,
    status,
    json: async () => body,
  })) as unknown as typeof fetch;
}

describe("createApiClient", () => {
  it("getHealth() vraca parsiran i tipiziran odgovor kada je sema validna", async () => {
    const client = createApiClient({
      baseUrl: "http://localhost:3000",
      fetchImpl: mockFetch({
        status: "ok",
        uptimeSeconds: 12.5,
        timestamp: new Date().toISOString(),
      }),
    });

    const health = await client.getHealth();
    expect(health.status).toBe("ok");
    expect(health.uptimeSeconds).toBe(12.5);
  });

  it("baca ApiError kada odgovor ne odgovara semi", async () => {
    const client = createApiClient({
      baseUrl: "http://localhost:3000",
      fetchImpl: mockFetch({ status: "not-ok" }),
    });

    await expect(client.getHealth()).rejects.toBeInstanceOf(ApiError);
  });

  it("baca ApiError kada je HTTP status neuspesan", async () => {
    const client = createApiClient({
      baseUrl: "http://localhost:3000",
      fetchImpl: mockFetch({}, 500),
    });

    await expect(client.getHealth()).rejects.toBeInstanceOf(ApiError);
  });

  it("baca ApiError kada fetch odbaci (mrezna greska)", async () => {
    const failingFetch = (async () => {
      throw new Error("network down");
    }) as unknown as typeof fetch;

    const client = createApiClient({ baseUrl: "http://localhost:3000", fetchImpl: failingFetch });

    await expect(client.getHealth()).rejects.toBeInstanceOf(ApiError);
  });

  it("skida trailing slash iz baseUrl pre poziva", async () => {
    let calledUrl = "";
    const fetchSpy: typeof fetch = (async (url: RequestInfo | URL) => {
      calledUrl = String(url);
      return {
        ok: true,
        status: 200,
        json: async () => ({ status: "ok", uptimeSeconds: 1, timestamp: new Date().toISOString() }),
      } as unknown as Response;
    }) as unknown as typeof fetch;

    const client = createApiClient({ baseUrl: "http://localhost:3000/", fetchImpl: fetchSpy });
    await client.getHealth();
    expect(calledUrl).toBe("http://localhost:3000/health");
  });

  it("prilaze Authorization header na zasticene rute kada je getAccessToken prosledjen", async () => {
    let capturedHeaders: Record<string, string> = {};
    const fetchSpy: typeof fetch = (async (_url, init) => {
      capturedHeaders = (init?.headers ?? {}) as Record<string, string>;
      return {
        ok: true,
        status: 200,
        json: async () => ({
          id: "00000000-0000-0000-0000-000000000001",
          displayName: "Vukasin",
          level: 1,
          xp: 0,
          xpToNextLevel: 100,
          statPointsAvailable: 0,
          rank: "E",
          class: null,
          coins: 0,
          hp: 100,
          strength: 1,
          agility: 1,
          endurance: 1,
          vitality: 1,
          intelligence: 1,
          currentStreak: 0,
          longestStreak: 0,
          lastActivityDate: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }),
      } as unknown as Response;
    }) as unknown as typeof fetch;

    const client = createApiClient({
      baseUrl: "http://localhost:3000",
      fetchImpl: fetchSpy,
      getAccessToken: () => "test-token",
    });

    await client.getPlayer();

    expect(capturedHeaders.Authorization).toBe("Bearer test-token");
  });

  it("izostavlja Authorization header za health (authenticated: false) cak i sa getAccessToken", async () => {
    let capturedHeaders: Record<string, string> = {};
    const fetchSpy: typeof fetch = (async (_url, init) => {
      capturedHeaders = (init?.headers ?? {}) as Record<string, string>;
      return {
        ok: true,
        status: 200,
        json: async () => ({ status: "ok", uptimeSeconds: 1, timestamp: new Date().toISOString() }),
      } as unknown as Response;
    }) as unknown as typeof fetch;

    const client = createApiClient({
      baseUrl: "http://localhost:3000",
      fetchImpl: fetchSpy,
      getAccessToken: () => "test-token",
    });

    await client.getHealth();

    expect(capturedHeaders.Authorization).toBeUndefined();
  });

  it("prosledjuje query parametre (npr. listQuests sa status filterom)", async () => {
    let calledUrl = "";
    const fetchSpy: typeof fetch = (async (url: RequestInfo | URL) => {
      calledUrl = String(url);
      return { ok: true, status: 200, json: async () => [] } as unknown as Response;
    }) as unknown as typeof fetch;

    const client = createApiClient({ baseUrl: "http://localhost:3000", fetchImpl: fetchSpy });
    await client.listQuests("completed");

    expect(calledUrl).toBe("http://localhost:3000/quests?status=completed");
  });

  it("logWorkout salje POST sa telom i validira odgovor", async () => {
    let capturedMethod = "";
    let capturedBody = "";
    const fetchSpy: typeof fetch = (async (_url, init) => {
      capturedMethod = init?.method ?? "";
      capturedBody = String(init?.body ?? "");
      return {
        ok: true,
        status: 201,
        json: async () => ({
          workoutId: "00000000-0000-0000-0000-000000000002",
          personalRecordsCount: 0,
          newPersonalRecords: [],
          restDayWarning: false,
          player: {
            id: "00000000-0000-0000-0000-000000000001",
            displayName: "Vukasin",
            level: 1,
            xp: 500,
            xpToNextLevel: 100,
            statPointsAvailable: 0,
            rank: "E",
            class: null,
            coins: 20,
            hp: 100,
            strength: 1,
            agility: 1,
            endurance: 1,
            vitality: 1,
            intelligence: 1,
            currentStreak: 1,
            longestStreak: 1,
            lastActivityDate: "2026-01-01",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        }),
      } as unknown as Response;
    }) as unknown as typeof fetch;

    const client = createApiClient({ baseUrl: "http://localhost:3000", fetchImpl: fetchSpy });
    const input = { sets: [{ exerciseId: "e1", reps: 8, weightKg: 60 }] };
    const result = await client.logWorkout(input);

    expect(capturedMethod).toBe("POST");
    expect(JSON.parse(capturedBody)).toEqual(input);
    expect(result.workoutId).toBe("00000000-0000-0000-0000-000000000002");
  });

  it("generateWeeklyQuest() salje POST i validira odgovor", async () => {
    let capturedUrl = "";
    let capturedMethod = "";
    const fetchSpy: typeof fetch = (async (url: RequestInfo | URL, init) => {
      capturedUrl = String(url);
      capturedMethod = init?.method ?? "";
      return {
        ok: true,
        status: 200,
        json: async () => ({
          id: "00000000-0000-0000-0000-000000000005",
          type: "weekly",
          title: "Zavrsi 5 treninga ove nedelje",
          description: null,
          linkedAction: "workout",
          targetCount: 5,
          progressCount: 0,
          xpReward: 2000,
          coinReward: 150,
          status: "active",
          expiresAt: null,
          completedAt: null,
          createdAt: new Date().toISOString(),
          targetRank: null,
        }),
      } as unknown as Response;
    }) as unknown as typeof fetch;

    const client = createApiClient({ baseUrl: "http://localhost:3000", fetchImpl: fetchSpy });
    const result = await client.generateWeeklyQuest();

    expect(capturedUrl).toBe("http://localhost:3000/quests/weekly/generate");
    expect(capturedMethod).toBe("POST");
    expect(result.type).toBe("weekly");
  });

  it("updateTrainingPlan() salje PUT sa telom i validira odgovor", async () => {
    let capturedMethod = "";
    let capturedBody = "";
    const fetchSpy: typeof fetch = (async (_url, init) => {
      capturedMethod = init?.method ?? "";
      capturedBody = String(init?.body ?? "");
      return {
        ok: true,
        status: 200,
        json: async () => ({
          splitType: "push_pull_legs",
          daysPerWeek: 3,
          schedule: ["rest", "rest", "push", "rest", "pull", "rest", "legs"],
          updatedAt: new Date().toISOString(),
        }),
      } as unknown as Response;
    }) as unknown as typeof fetch;

    const client = createApiClient({ baseUrl: "http://localhost:3000", fetchImpl: fetchSpy });
    const input = { splitType: "push_pull_legs" as const, daysPerWeek: 3 };
    const result = await client.updateTrainingPlan(input);

    expect(capturedMethod).toBe("PUT");
    expect(JSON.parse(capturedBody)).toEqual(input);
    expect(result.splitType).toBe("push_pull_legs");
    expect(result.schedule).toHaveLength(7);
  });

  it("getTrainingPlan() vraca sva null polja kada igrac jos nema plan", async () => {
    const client = createApiClient({
      baseUrl: "http://localhost:3000",
      fetchImpl: mockFetch({
        splitType: null,
        daysPerWeek: null,
        schedule: null,
        updatedAt: null,
      }),
    });

    const result = await client.getTrainingPlan();
    expect(result.splitType).toBeNull();
  });

  it("listAchievements() vraca parsiranu listu", async () => {
    const achievement = {
      id: "00000000-0000-0000-0000-000000000003",
      code: "first_workout",
      title: "Prvi korak",
      description: "Zabelezi svoj prvi trening.",
      category: "training",
      requirementType: "workout_count",
      requirementValue: 1,
      xpReward: 50,
      coinReward: 10,
      unlocked: false,
      unlockedAt: null,
    };
    const client = createApiClient({
      baseUrl: "http://localhost:3000",
      fetchImpl: mockFetch([achievement]),
    });

    const result = await client.listAchievements();
    expect(result).toEqual([achievement]);
  });

  it("evaluateAchievements() salje POST bez tela i validira odgovor", async () => {
    let capturedMethod = "";
    let capturedBody: unknown;
    const fetchSpy: typeof fetch = (async (_url, init) => {
      capturedMethod = init?.method ?? "";
      capturedBody = init?.body;
      return { ok: true, status: 200, json: async () => [] } as unknown as Response;
    }) as unknown as typeof fetch;

    const client = createApiClient({ baseUrl: "http://localhost:3000", fetchImpl: fetchSpy });
    const result = await client.evaluateAchievements();

    expect(capturedMethod).toBe("POST");
    expect(capturedBody).toBeUndefined();
    expect(result).toEqual([]);
  });
});

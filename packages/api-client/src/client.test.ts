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

  it("dodaje Authorization header na autentifikovane rute kada getAccessToken vraca token", async () => {
    let capturedHeaders: Record<string, string> = {};
    const fetchSpy: typeof fetch = (async (_url: RequestInfo | URL, init?: RequestInit) => {
      capturedHeaders = (init?.headers as Record<string, string>) ?? {};
      return { ok: true, status: 200, json: async () => samplePlayerState() } as unknown as Response;
    }) as unknown as typeof fetch;

    const client = createApiClient({
      baseUrl: "http://localhost:3000",
      fetchImpl: fetchSpy,
      getAccessToken: () => "test-jwt-token",
    });
    await client.players.getMe();

    expect(capturedHeaders.Authorization).toBe("Bearer test-jwt-token");
  });

  it("ne dodaje Authorization header na auth rute (register/login)", async () => {
    let capturedHeaders: Record<string, string> = {};
    const fetchSpy: typeof fetch = (async (_url: RequestInfo | URL, init?: RequestInit) => {
      capturedHeaders = (init?.headers as Record<string, string>) ?? {};
      return {
        ok: true,
        status: 201,
        json: async () => ({ accessToken: "t", user: { id: "1", email: "a@b.com", username: "a" } }),
      } as unknown as Response;
    }) as unknown as typeof fetch;

    const client = createApiClient({
      baseUrl: "http://localhost:3000",
      fetchImpl: fetchSpy,
      getAccessToken: () => "should-not-be-sent",
    });
    await client.auth.login({ email: "a@b.com", password: "password123" });

    expect(capturedHeaders.Authorization).toBeUndefined();
  });

  it("workouts.logSet() ne ocekuje telo odgovora (204 No Content)", async () => {
    const fetchSpy: typeof fetch = (async () => ({ ok: true, status: 204, json: async () => undefined })) as unknown as typeof fetch;
    const client = createApiClient({ baseUrl: "http://localhost:3000", fetchImpl: fetchSpy });

    await expect(client.workouts.logSet("session-1", { exerciseId: "ex-1", setNumber: 1, reps: 10, completed: true })).resolves.toBeUndefined();
  });

  it("baca ApiError sa porukom iz NestJS error tela kada zahtev nije uspesan", async () => {
    const fetchSpy: typeof fetch = (async () => ({
      ok: false,
      status: 409,
      json: async () => ({ message: "Trening je vec zavrsen", error: "Conflict", statusCode: 409 }),
    })) as unknown as typeof fetch;
    const client = createApiClient({ baseUrl: "http://localhost:3000", fetchImpl: fetchSpy });

    await expect(client.workouts.complete("session-1")).rejects.toMatchObject({
      message: "Trening je vec zavrsen",
      status: 409,
    });
  });
});

function samplePlayerState() {
  return {
    profile: {
      username: "tester",
      avatarUrl: null,
      onboarded: true,
      age: null,
      heightCm: null,
      weightKg: null,
      trainingType: null,
      experienceLevel: null,
    },
    progression: {
      totalXp: 0,
      level: 1,
      currentLevelXp: 0,
      requiredXp: 100,
      progress: 0,
      rank: "E",
      coins: 0,
      currentStreak: 0,
    },
    stats: { strength: 1, agility: 1, endurance: 1, vitality: 1, intelligence: 1, statPoints: 0 },
    penalty: { applied: false, missedQuestCount: 0, coinsLost: 0 },
  };
}

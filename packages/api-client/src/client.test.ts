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
});

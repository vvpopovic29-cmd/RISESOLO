import { z } from "zod";
import { EnvValidationError, envPrimitives, loadEnv } from "./env";

const testSchema = z.object({
  PORT: envPrimitives.port,
  NODE_ENV: envPrimitives.nodeEnv,
  DATABASE_URL: envPrimitives.url,
});

describe("loadEnv", () => {
  it("parsira validan environment i vraca tipizovan objekat", () => {
    const result = loadEnv(testSchema, {
      PORT: "3000",
      NODE_ENV: "test",
      DATABASE_URL: "postgresql://user:pass@localhost:5432/db",
    });

    expect(result).toEqual({
      PORT: 3000,
      NODE_ENV: "test",
      DATABASE_URL: "postgresql://user:pass@localhost:5432/db",
    });
  });

  it("primenjuje default vrednost kada polje nedostaje", () => {
    const result = loadEnv(testSchema, {
      PORT: "3000",
      DATABASE_URL: "postgresql://user:pass@localhost:5432/db",
    });

    expect(result.NODE_ENV).toBe("development");
  });

  it("baca EnvValidationError sa svim greskama kada je environment nevalidan", () => {
    expect(() =>
      loadEnv(testSchema, {
        PORT: "not-a-number",
        DATABASE_URL: "nije-url",
      }),
    ).toThrow(EnvValidationError);
  });

  it("poruka greske sadrzi putanju svakog nevalidnog polja", () => {
    try {
      loadEnv(testSchema, { PORT: "abc", DATABASE_URL: "abc" });
      throw new Error("loadEnv nije bacio gresku");
    } catch (error) {
      expect(error).toBeInstanceOf(EnvValidationError);
      const validationError = error as EnvValidationError;
      expect(validationError.issues.length).toBeGreaterThanOrEqual(2);
      expect(validationError.message).toContain("PORT");
      expect(validationError.message).toContain("DATABASE_URL");
    }
  });
});

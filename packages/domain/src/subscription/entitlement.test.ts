import { FREE_TRAINING_PLAN_LIMIT, canGenerateTrainingPlan, isEntitlementActive } from "./entitlement";

describe("isEntitlementActive", () => {
  const now = new Date("2026-06-01T00:00:00Z");

  it("nije aktivna kada je expiresAt null (nikad kupljeno)", () => {
    expect(isEntitlementActive(null, now)).toBe(false);
  });

  it("aktivna je kada je expiresAt u buducnosti", () => {
    expect(isEntitlementActive(new Date("2026-07-01T00:00:00Z"), now)).toBe(true);
  });

  it("nije aktivna kada je expiresAt u proslosti (istekla)", () => {
    expect(isEntitlementActive(new Date("2026-05-01T00:00:00Z"), now)).toBe(false);
  });

  it("nije aktivna tacno u trenutku isteka (strogo >, ne >=)", () => {
    expect(isEntitlementActive(now, now)).toBe(false);
  });
});

describe("canGenerateTrainingPlan", () => {
  it("pro korisnik uvek moze, bez obzira na broj postojecih planova", () => {
    expect(canGenerateTrainingPlan(0, true)).toBe(true);
    expect(canGenerateTrainingPlan(100, true)).toBe(true);
  });

  it("besplatan korisnik moze dok ne dostigne FREE_TRAINING_PLAN_LIMIT", () => {
    expect(canGenerateTrainingPlan(0, false)).toBe(true);
    expect(canGenerateTrainingPlan(FREE_TRAINING_PLAN_LIMIT - 1, false)).toBe(true);
  });

  it("besplatan korisnik ne moze posle dostignutog limita", () => {
    expect(canGenerateTrainingPlan(FREE_TRAINING_PLAN_LIMIT, false)).toBe(false);
    expect(canGenerateTrainingPlan(FREE_TRAINING_PLAN_LIMIT + 5, false)).toBe(false);
  });
});

import { PENALTY_COINS_MISSED_DAILY_QUEST, applyCoinPenalty, calculatePenaltyCoins } from "./penalty";

describe("calculatePenaltyCoins", () => {
  it("vraca 0 za 0 propustenih questova", () => {
    expect(calculatePenaltyCoins(0)).toBe(0);
  });

  it("mnozi broj propustenih questova sa fiksnom kaznom po questu", () => {
    expect(calculatePenaltyCoins(1)).toBe(PENALTY_COINS_MISSED_DAILY_QUEST);
    expect(calculatePenaltyCoins(3)).toBe(3 * PENALTY_COINS_MISSED_DAILY_QUEST);
  });
});

describe("applyCoinPenalty", () => {
  it("oduzima kaznu od trenutnih coins", () => {
    expect(applyCoinPenalty(100, 20)).toBe(80);
  });

  it("klampuje na 0 kada je kazna veca od trenutnih coins", () => {
    expect(applyCoinPenalty(15, 20)).toBe(0);
  });

  it("ne menja coins kada je kazna 0", () => {
    expect(applyCoinPenalty(50, 0)).toBe(50);
  });
});

import { distributeTreasury } from "./treasury";

describe("distributeTreasury", () => {
  it("deli ravnomerno kada je deljivo bez ostatka", () => {
    expect(distributeTreasury(100, 5)).toEqual({ perMember: 20, remainder: 0 });
  });

  it("ostatak od celobrojnog deljenja ostaje u riznici", () => {
    expect(distributeTreasury(100, 3)).toEqual({ perMember: 33, remainder: 1 });
  });

  it("vraca sve u riznicu (bez raspodele) kada nema clanova", () => {
    expect(distributeTreasury(50, 0)).toEqual({ perMember: 0, remainder: 50 });
  });

  it("vraca nule kada je riznica prazna", () => {
    expect(distributeTreasury(0, 5)).toEqual({ perMember: 0, remainder: 0 });
  });
});

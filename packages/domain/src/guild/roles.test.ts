import { canChangeRole, canDistributeTreasury, canKick } from "./roles";

describe("canKick", () => {
  it("LEADER moze da izbaci OFFICER ili MEMBER", () => {
    expect(canKick("LEADER", "OFFICER")).toBe(true);
    expect(canKick("LEADER", "MEMBER")).toBe(true);
  });

  it("OFFICER moze da izbaci samo MEMBER-a", () => {
    expect(canKick("OFFICER", "MEMBER")).toBe(true);
    expect(canKick("OFFICER", "OFFICER")).toBe(false);
  });

  it("niko ne moze da izbaci LEADER-a", () => {
    expect(canKick("LEADER", "LEADER")).toBe(false);
    expect(canKick("OFFICER", "LEADER")).toBe(false);
  });

  it("MEMBER ne moze da izbaci nikoga", () => {
    expect(canKick("MEMBER", "MEMBER")).toBe(false);
    expect(canKick("MEMBER", "OFFICER")).toBe(false);
  });
});

describe("canChangeRole", () => {
  it("samo LEADER menja uloge", () => {
    expect(canChangeRole("LEADER")).toBe(true);
    expect(canChangeRole("OFFICER")).toBe(false);
    expect(canChangeRole("MEMBER")).toBe(false);
  });
});

describe("canDistributeTreasury", () => {
  it("samo LEADER raspodeljuje riznicu", () => {
    expect(canDistributeTreasury("LEADER")).toBe(true);
    expect(canDistributeTreasury("OFFICER")).toBe(false);
    expect(canDistributeTreasury("MEMBER")).toBe(false);
  });
});

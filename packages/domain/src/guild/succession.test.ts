import { selectNextLeader, type GuildMemberForSuccession } from "./succession";

function member(overrides: Partial<GuildMemberForSuccession>): GuildMemberForSuccession {
  return { userId: "u1", role: "MEMBER", joinedAt: new Date("2026-01-01"), ...overrides };
}

describe("selectNextLeader", () => {
  it("vraca null kada nema preostalih clanova (raspustanje ceha)", () => {
    expect(selectNextLeader([])).toBeNull();
  });

  it("bira najstarijeg OFFICER-a kada postoji bar jedan", () => {
    const members = [
      member({ userId: "member-old", role: "MEMBER", joinedAt: new Date("2026-01-01") }),
      member({ userId: "officer-new", role: "OFFICER", joinedAt: new Date("2026-03-01") }),
      member({ userId: "officer-old", role: "OFFICER", joinedAt: new Date("2026-02-01") }),
    ];

    expect(selectNextLeader(members)).toBe("officer-old");
  });

  it("bira najstarijeg MEMBER-a kada nema nijednog OFFICER-a", () => {
    const members = [
      member({ userId: "member-new", joinedAt: new Date("2026-03-01") }),
      member({ userId: "member-old", joinedAt: new Date("2026-01-01") }),
    ];

    expect(selectNextLeader(members)).toBe("member-old");
  });
});

import {
  GUILD_ITEM_DEFINITIONS,
  type GuildItemId,
  type GuildItemStatsSnapshot,
  evaluateNewlyDiscoveredGuildItems,
} from "./guild-item";

const EMPTY_SNAPSHOT: GuildItemStatsSnapshot = {
  isGuildLeader: false,
  currentGuildRaidsCompleted: 0,
  currentGuildTreasuryCoins: 0,
  guildMembershipDays: 0,
  currentGuildLevel: 0,
};

describe("GUILD_ITEM_DEFINITIONS", () => {
  it("ima jedinstvene ID-jeve", () => {
    const ids = GUILD_ITEM_DEFINITIONS.map((definition) => definition.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("evaluateNewlyDiscoveredGuildItems", () => {
  it("ne vraca nista za korisnika koji nije clan ceha (prazan snapshot)", () => {
    expect(evaluateNewlyDiscoveredGuildItems(EMPTY_SNAPSHOT, new Set())).toEqual([]);
  });

  it("otkriva GUILD_FOUNDER samo kada je korisnik LEADER trenutnog ceha", () => {
    expect(evaluateNewlyDiscoveredGuildItems(EMPTY_SNAPSHOT, new Set())).not.toContain("GUILD_FOUNDER");
    const snapshot: GuildItemStatsSnapshot = { ...EMPTY_SNAPSHOT, isGuildLeader: true };
    expect(evaluateNewlyDiscoveredGuildItems(snapshot, new Set())).toContain("GUILD_FOUNDER");
  });

  it("otkriva RAID_BREAKER tek pri 5+ zavrsenih raid-ova ceha", () => {
    const below: GuildItemStatsSnapshot = { ...EMPTY_SNAPSHOT, currentGuildRaidsCompleted: 4 };
    expect(evaluateNewlyDiscoveredGuildItems(below, new Set())).not.toContain("RAID_BREAKER");
    const at: GuildItemStatsSnapshot = { ...EMPTY_SNAPSHOT, currentGuildRaidsCompleted: 5 };
    expect(evaluateNewlyDiscoveredGuildItems(at, new Set())).toContain("RAID_BREAKER");
  });

  it("otkriva TREASURY_KEEPER tek pri 1000+ coins-a u cehovskoj riznici", () => {
    const below: GuildItemStatsSnapshot = { ...EMPTY_SNAPSHOT, currentGuildTreasuryCoins: 999 };
    expect(evaluateNewlyDiscoveredGuildItems(below, new Set())).not.toContain("TREASURY_KEEPER");
    const at: GuildItemStatsSnapshot = { ...EMPTY_SNAPSHOT, currentGuildTreasuryCoins: 1000 };
    expect(evaluateNewlyDiscoveredGuildItems(at, new Set())).toContain("TREASURY_KEEPER");
  });

  it("otkriva GUILD_VETERAN tek posle 14+ dana clanstva", () => {
    const below: GuildItemStatsSnapshot = { ...EMPTY_SNAPSHOT, guildMembershipDays: 13 };
    expect(evaluateNewlyDiscoveredGuildItems(below, new Set())).not.toContain("GUILD_VETERAN");
    const at: GuildItemStatsSnapshot = { ...EMPTY_SNAPSHOT, guildMembershipDays: 14 };
    expect(evaluateNewlyDiscoveredGuildItems(at, new Set())).toContain("GUILD_VETERAN");
  });

  it("otkriva GUILD_POWERHOUSE tek kada ceh dostigne nivo 10", () => {
    const below: GuildItemStatsSnapshot = { ...EMPTY_SNAPSHOT, currentGuildLevel: 9 };
    expect(evaluateNewlyDiscoveredGuildItems(below, new Set())).not.toContain("GUILD_POWERHOUSE");
    const at: GuildItemStatsSnapshot = { ...EMPTY_SNAPSHOT, currentGuildLevel: 10 };
    expect(evaluateNewlyDiscoveredGuildItems(at, new Set())).toContain("GUILD_POWERHOUSE");
  });

  it("preskace vec otkrivene predmete", () => {
    const snapshot: GuildItemStatsSnapshot = { ...EMPTY_SNAPSHOT, isGuildLeader: true };
    const alreadyDiscovered = new Set<GuildItemId>(["GUILD_FOUNDER"]);
    expect(evaluateNewlyDiscoveredGuildItems(snapshot, alreadyDiscovered)).toEqual([]);
  });
});

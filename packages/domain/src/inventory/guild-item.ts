/**
 * Guild Items - treci izvor u Inventory sistemu. Za razliku od Hidden Item-a
 * (tajan uslov) i Workshop Item-a (vidljiv katalog + aktivna izrada), Guild
 * Item je VIDLJIV katalog KOJI SE AUTOMATSKI DODELJUJE na osnovu cehovske
 * aktivnosti - isti "derive, don't cache" princip kao Hidden Item (nista
 * posebno se ne belezi tokom igre, snapshot se svez racuna iz postojecih
 * Guild/GuildMembership/GuildRaid tabela), ali BEZ tajne (name/description
 * se uvek salju, isti princip kao Achievements pragovi). Kad korisnik nije
 * clan ceha, svi uslovi su NAMERNO neispunjeni (snapshot vraca 0/false), ne
 * baca gresku.
 */

export const GUILD_ITEM_IDS = [
  "GUILD_FOUNDER",
  "RAID_BREAKER",
  "TREASURY_KEEPER",
  "GUILD_VETERAN",
  "GUILD_POWERHOUSE",
] as const;
export type GuildItemId = (typeof GUILD_ITEM_IDS)[number];

export interface GuildItemStatsSnapshot {
  /** Trenutna ulога u cehu je LEADER (isMet je permanentan preko alreadyDiscovered filtera i ako kasnije izgubi ulogu/napusti ceh). */
  isGuildLeader: boolean;
  /** Broj COMPLETED GuildRaid-ova TRENUTNOG ceha (ne licni doprinos - kolektivni cehovski rekord). */
  currentGuildRaidsCompleted: number;
  /** Trenutni saldo cehovske riznice (Guild.treasuryCoins). */
  currentGuildTreasuryCoins: number;
  /** Broj dana od GuildMembership.joinedAt do danas (0 ako nije clan ceha). */
  guildMembershipDays: number;
  /** calculateLevel(Guild.totalXp) trenutnog ceha (0 ako nije clan ceha). */
  currentGuildLevel: number;
}

export interface GuildItemDefinition {
  id: GuildItemId;
  isMet: (snapshot: GuildItemStatsSnapshot) => boolean;
}

export const GUILD_ITEM_DEFINITIONS: readonly GuildItemDefinition[] = [
  { id: "GUILD_FOUNDER", isMet: (s) => s.isGuildLeader },
  { id: "RAID_BREAKER", isMet: (s) => s.currentGuildRaidsCompleted >= 5 },
  { id: "TREASURY_KEEPER", isMet: (s) => s.currentGuildTreasuryCoins >= 1000 },
  { id: "GUILD_VETERAN", isMet: (s) => s.guildMembershipDays >= 14 },
  { id: "GUILD_POWERHOUSE", isMet: (s) => s.currentGuildLevel >= 10 },
];

/**
 * Vraca ID-jeve Guild Item-a ciji je uslov ispunjen u datom snapshot-u a
 * korisnik ih jos nema u `alreadyDiscovered` - isti princip kao
 * evaluateNewlyDiscoveredHiddenItems/evaluateNewlyUnlockedAchievements.
 */
export function evaluateNewlyDiscoveredGuildItems(
  snapshot: GuildItemStatsSnapshot,
  alreadyDiscovered: ReadonlySet<GuildItemId>,
): GuildItemId[] {
  return GUILD_ITEM_DEFINITIONS.filter(
    (definition) => !alreadyDiscovered.has(definition.id) && definition.isMet(snapshot),
  ).map((definition) => definition.id);
}

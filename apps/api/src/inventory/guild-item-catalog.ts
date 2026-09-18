import { assertNever, type GuildItemId } from "@risesolo/domain";

export interface GuildItemDisplay {
  name: string;
  description: string;
}

/**
 * Prikazni tekst po Guild Item-u - namerno odvojeno od domain sloja (isti
 * princip kao getHiddenItemDisplay/getWorkshopItemDisplay). Za razliku od
 * Hidden Item-a, ovaj tekst se vraca UVEK (otkriven ili ne) - Guild katalog
 * je unapred vidljiv, "tajna" postoji samo kod Hidden Item-a.
 */
export function getGuildItemDisplay(id: GuildItemId): GuildItemDisplay {
  switch (id) {
    case "GUILD_FOUNDER":
      return { name: "Osnivac Ceha", description: "Budi vodja (LEADER) svog ceha." };
    case "RAID_BREAKER":
      return { name: "Razbijac Rejdova", description: "Tvoj ceh je zavrsio 5 ili vise cehovskih rejdova." };
    case "TREASURY_KEEPER":
      return { name: "Cuvar Riznice", description: "Riznica tvog ceha je dostigla 1000 ili vise coins-a." };
    case "GUILD_VETERAN":
      return { name: "Cehovski Veteran", description: "Clan si svog ceha 14 ili vise dana." };
    case "GUILD_POWERHOUSE":
      return { name: "Cehovska Sila", description: "Tvoj ceh je dostigao nivo 10." };
    default:
      return assertNever(id, "Nepoznat guild itemId");
  }
}

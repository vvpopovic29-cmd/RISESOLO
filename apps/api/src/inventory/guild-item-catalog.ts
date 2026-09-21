import { assertNever, DEFAULT_LOCALE, type GuildItemId, type Locale } from "@risesolo/domain";

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
export function getGuildItemDisplay(id: GuildItemId, locale: Locale = DEFAULT_LOCALE): GuildItemDisplay {
  const en = locale === "en";
  switch (id) {
    case "GUILD_FOUNDER":
      return en
        ? { name: "Guild Founder", description: "Be the leader (LEADER) of your guild." }
        : { name: "Osnivac Ceha", description: "Budi vodja (LEADER) svog ceha." };
    case "RAID_BREAKER":
      return en
        ? { name: "Raid Breaker", description: "Your guild completed 5 or more guild raids." }
        : { name: "Razbijac Rejdova", description: "Tvoj ceh je zavrsio 5 ili vise cehovskih rejdova." };
    case "TREASURY_KEEPER":
      return en
        ? { name: "Treasury Keeper", description: "Your guild's treasury reached 1000 or more coins." }
        : { name: "Cuvar Riznice", description: "Riznica tvog ceha je dostigla 1000 ili vise coins-a." };
    case "GUILD_VETERAN":
      return en
        ? { name: "Guild Veteran", description: "You've been a member of your guild for 14 or more days." }
        : { name: "Cehovski Veteran", description: "Clan si svog ceha 14 ili vise dana." };
    case "GUILD_POWERHOUSE":
      return en
        ? { name: "Guild Powerhouse", description: "Your guild reached level 10." }
        : { name: "Cehovska Sila", description: "Tvoj ceh je dostigao nivo 10." };
    default:
      return assertNever(id, "Nepoznat guild itemId");
  }
}

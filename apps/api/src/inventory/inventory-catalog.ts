import { assertNever, DEFAULT_LOCALE, type HiddenItemId, type Locale } from "@risesolo/domain";

export interface HiddenItemDisplay {
  name: string;
  description: string;
}

/**
 * Prikazni tekst po Hidden Item-u - namerno odvojeno od domain sloja (isti
 * princip kao getShopItemDisplay/ACHIEVEMENT_NOTIFICATION_CONTENT). Samo se
 * poziva za VEC otkrivene predmete (vidi InventoryService.listForUser) -
 * neotkriven predmet nikad ne stize do ove funkcije, pa opis uslova
 * otkljucavanja ovde ne otkriva "spojler" pre otkrica.
 */
export function getHiddenItemDisplay(id: HiddenItemId, locale: Locale = DEFAULT_LOCALE): HiddenItemDisplay {
  const en = locale === "en";
  switch (id) {
    case "MIDNIGHT_WARRIOR":
      return en
        ? { name: "Midnight Warrior", description: "You trained between midnight and 4am - few dare to train at that hour." }
        : {
            name: "Nocni Ratnik",
            description: "Zavrsio si trening izmedju ponoci i 4 ujutru - retki se usude da treniraju u to doba.",
          };
    case "CENTURY_CLUB":
      return en
        ? { name: "Century Club", description: "You did 100 or more reps in a single workout session." }
        : {
            name: "Klub Stotke",
            description: "Odradio si 100 ili vise ponavljanja u jednoj jedinoj sesiji treninga.",
          };
    case "BALANCED_WARRIOR":
      return en
        ? { name: "Balanced Warrior", description: "All five of your attributes reached 15+ and are nearly equal." }
        : {
            name: "Uravnotezeni Ratnik",
            description: "Svih pet tvojih atributa dostiglo je 15+ i medjusobno su gotovo izjednaceni.",
          };
    case "COIN_HOARDER":
      return en
        ? { name: "Coin Hoarder", description: "You stacked up 5000 or more coins." }
        : {
            name: "Cuvar Riznice",
            description: "Nagomilao si 5000 ili vise coins-a.",
          };
    case "UNBROKEN_DISCIPLINE":
      return en
        ? {
            name: "Unbroken Discipline",
            description: "You kept a 7+ day streak without ever losing coins to a missed daily quest.",
          }
        : {
            name: "Nesalomljiva Disciplina",
            description: "Odrzao si niz od 7+ dana a da nijednom nisi izgubio coins zbog propustenog dnevnog questa.",
          };
    default:
      return assertNever(id, "Nepoznat hidden itemId");
  }
}

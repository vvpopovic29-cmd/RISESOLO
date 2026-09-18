import { assertNever, type HiddenItemId } from "@risesolo/domain";

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
export function getHiddenItemDisplay(id: HiddenItemId): HiddenItemDisplay {
  switch (id) {
    case "MIDNIGHT_WARRIOR":
      return {
        name: "Nocni Ratnik",
        description: "Zavrsio si trening izmedju ponoci i 4 ujutru - retki se usude da treniraju u to doba.",
      };
    case "CENTURY_CLUB":
      return {
        name: "Klub Stotke",
        description: "Odradio si 100 ili vise ponavljanja u jednoj jedinoj sesiji treninga.",
      };
    case "BALANCED_WARRIOR":
      return {
        name: "Uravnotezeni Ratnik",
        description: "Svih pet tvojih atributa dostiglo je 15+ i medjusobno su gotovo izjednaceni.",
      };
    case "COIN_HOARDER":
      return {
        name: "Cuvar Riznice",
        description: "Nagomilao si 5000 ili vise coins-a.",
      };
    case "UNBROKEN_DISCIPLINE":
      return {
        name: "Nesalomljiva Disciplina",
        description: "Odrzao si niz od 7+ dana a da nijednom nisi izgubio coins zbog propustenog dnevnog questa.",
      };
    default:
      return assertNever(id, "Nepoznat hidden itemId");
  }
}

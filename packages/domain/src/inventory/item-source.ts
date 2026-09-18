/**
 * Inventory sistem (B2) - novi koncept odvojen od Achievements (badges, vidljivi
 * pragovi) i Coin Shop-a (kozmetika kupljena za coins). Predmet u Inventory-ju
 * ima IZVOR (kako je igrac do njega dosao) - `HIDDEN` (tajan uslov, GET-only),
 * `WORKSHOP` (vidljiv katalog, aktivna izrada preko POST uz nivo+coins),
 * `GUILD` (vidljiv katalog, automatski dodeljen na osnovu cehovske aktivnosti -
 * GET-only kao Hidden, ali BEZ tajne), `EVENT` (vidljiv katalog, aktivno
 * "prisvajanje" preko POST kao Workshop, ali VREMENSKI ogranicen - moze se
 * prisvojiti samo dok je tekuci datum unutar godisnjeg prozora dogadjaja, bez
 * coins/nivo uslova, vidi event-item.ts), `AI_GENERATED` (tajan uslov kao
 * Hidden - GET-only automatsko otkrivanje po nivou - ali name/description
 * generise Claude po igracu, Pro-gated, isti princip kao AI Quest, vidi
 * ai-item.ts) i `RECOVERY` (vidljiv katalog kao Guild, automatski dodeljen
 * GET-only, ali na osnovu LICNOG obrasca odmora izmedju treninga - najveci
 * razmak izmedju dva treninga, broj "odmorenih" razmaka, ukupan broj dana
 * treninga - vidi recovery-item.ts). Ostali izvor (CUSTOM) se dodaje u
 * narednoj fazi, isti princip kao QuestType (svaka faza doda jednu Prisma
 * enum vrednost preko `ALTER TYPE ... ADD VALUE`, ne menja postojece).
 */

export const ITEM_SOURCES = ["HIDDEN", "WORKSHOP", "GUILD", "EVENT", "AI_GENERATED", "RECOVERY"] as const;
export type ItemSource = (typeof ITEM_SOURCES)[number];

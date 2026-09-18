/**
 * Inventory sistem (B2) - novi koncept odvojen od Achievements (badges, vidljivi
 * pragovi) i Coin Shop-a (kozmetika kupljena za coins). Predmet u Inventory-ju
 * ima IZVOR (kako je igrac do njega dosao) - `HIDDEN` (tajan uslov, GET-only),
 * `WORKSHOP` (vidljiv katalog, aktivna izrada preko POST) i `GUILD` (vidljiv
 * katalog, automatski dodeljen na osnovu cehovske aktivnosti - GET-only kao
 * Hidden, ali BEZ tajne, prikaz je isti princip kao Achievements). Ostali
 * izvori (EVENT/AI_GENERATED/RECOVERY/CUSTOM) se dodaju fazu po fazu, isti
 * princip kao QuestType (svaka faza doda jednu Prisma enum vrednost preko
 * `ALTER TYPE ... ADD VALUE`, ne menja postojece).
 */

export const ITEM_SOURCES = ["HIDDEN", "WORKSHOP", "GUILD"] as const;
export type ItemSource = (typeof ITEM_SOURCES)[number];

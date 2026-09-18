/**
 * Inventory sistem (B2) - novi koncept odvojen od Achievements (badges, vidljivi
 * pragovi) i Coin Shop-a (kozmetika kupljena za coins). Predmet u Inventory-ju
 * ima IZVOR (kako je igrac do njega dosao) - `HIDDEN` je prvi izvor koji se
 * implementira, ostali (WORKSHOP/EVENT/AI_GENERATED/RECOVERY/CUSTOM) se dodaju
 * fazu po fazu, isti princip kao QuestType (svaka faza doda jednu Prisma enum
 * vrednost preko `ALTER TYPE ... ADD VALUE`, ne menja postojece).
 */

export const ITEM_SOURCES = ["HIDDEN"] as const;
export type ItemSource = (typeof ITEM_SOURCES)[number];

/**
 * AI Quest = Pro-gated bonus izazov ciji title/description generise Claude
 * (vidi apps/api/src/ai/ai.service.ts generateQuestFlavor), personalizovano
 * po igracevom nivou/rangu/stat-ovima/streak-u - za razliku od svih ostalih
 * questova, sadrzaj NIJE iz fiksnog kataloga. Kompletiranje je namerno
 * identicno Daily Quest-ovog WORKOUT_COMPLETE kind-a (bilo koji zavrsen
 * trening tog dana) - razlika izmedju ova dva questa je IZVOR sadrzaja
 * (AI vs staticni katalog), ne mehanika. Besplatni korisnici i dani kada
 * AI servis nije dostupan NIKAD ne dobijaju ovaj quest (vidi
 * QuestsService.getCurrentAiQuest) - graceful degradation, nikad greska.
 */
export const AI_QUEST_KIND = "AI_PERSONALIZED" as const;
export type AiQuestKind = typeof AI_QUEST_KIND;
export const AI_QUEST_KINDS = [AI_QUEST_KIND] as const;

export const AI_QUEST_TARGET = 1;

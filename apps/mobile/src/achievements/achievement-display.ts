import type { AchievementDto } from "@risesolo/validation";

export interface AchievementDisplay {
  title: string;
  description: string;
  icon: string;
}

/**
 * Prikazni tekst po achievement-u - namerno odvojeno od domain sloja (isti
 * princip kao MEAL_TYPE_LABEL u nutrition.tsx). Pragovi ovde moraju da prate
 * packages/domain/src/achievements/achievement.ts - ako se prag tamo
 * promeni, opis ovde treba rucno azurirati (nema jedinstvenog izvora za
 * prikazni tekst, samo za same pragove).
 */
export function getAchievementDisplay(id: AchievementDto["id"]): AchievementDisplay {
  switch (id) {
    case "FIRST_WORKOUT":
      return { title: "Prvi korak", description: "Zavrsi svoj prvi trening.", icon: "🏁" };
    case "WORKOUTS_10":
      return { title: "Posvecenik", description: "Zavrsi 10 treninga.", icon: "💪" };
    case "WORKOUTS_50":
      return { title: "Ratnik", description: "Zavrsi 50 treninga.", icon: "⚔️" };
    case "WORKOUTS_100":
      return { title: "Legenda", description: "Zavrsi 100 treninga.", icon: "🏆" };
    case "STREAK_3":
      return { title: "Na pravom putu", description: "Odrzi 3-dnevni niz treninga.", icon: "🔥" };
    case "STREAK_7":
      return { title: "Nedelja discipline", description: "Odrzi 7-dnevni niz treninga.", icon: "🔥" };
    case "STREAK_30":
      return { title: "Neumoljiv", description: "Odrzi 30-dnevni niz treninga.", icon: "🔥" };
    case "LEVEL_5":
      return { title: "Uspon", description: "Dostigni nivo 5.", icon: "⭐" };
    case "LEVEL_10":
      return { title: "Veteran", description: "Dostigni nivo 10.", icon: "🌟" };
    case "LEVEL_20":
      return { title: "Sampion", description: "Dostigni nivo 20.", icon: "👑" };
    case "DAILY_QUESTS_10":
      return { title: "Redovnost", description: "Zavrsi 10 dnevnih questova.", icon: "📋" };
    case "DAILY_QUESTS_50":
      return { title: "Rutina", description: "Zavrsi 50 dnevnih questova.", icon: "📋" };
    case "BOSS_QUEST_FIRST":
      return { title: "Lovac na bosseve", description: "Pobedi svoj prvi Boss Quest.", icon: "🐉" };
    case "BOSS_QUEST_10":
      return { title: "Ubica bosseva", description: "Pobedi 10 Boss Quest-ova.", icon: "🐉" };
    case "NUTRITION_FIRST":
      return { title: "Svestan ishrane", description: "Zabelezi svoj prvi obrok.", icon: "🍎" };
    case "NUTRITION_25":
      return { title: "Disciplinovana ishrana", description: "Zabelezi 25 obroka.", icon: "🍎" };
    case "AI_PLAN_FIRST":
      return { title: "Strateg", description: "Generisi svoj prvi AI trening plan.", icon: "🧠" };
    case "GUILD_JOIN":
      return { title: "Timski igrac", description: "Pridruzi se cehu.", icon: "🛡️" };
  }
}

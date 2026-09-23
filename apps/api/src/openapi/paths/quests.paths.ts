import {
  aiQuestResponseSchema,
  bossQuestSchema,
  dailyQuestSchema,
  mainQuestSchema,
  penaltyQuestResponseSchema,
  sideQuestResponseSchema,
  weeklyQuestSchema,
} from "@risesolo/validation";
import { AUTH_RESPONSES, AUTH_SECURITY, jsonResponse, registry } from "../registry";

export function registerQuestsPaths(): void {
  const DailyQuest = registry.register("DailyQuest", dailyQuestSchema);
  const BossQuest = registry.register("BossQuest", bossQuestSchema);
  const WeeklyQuest = registry.register("WeeklyQuest", weeklyQuestSchema);
  const MainQuest = registry.register("MainQuest", mainQuestSchema);
  const SideQuestResponse = registry.register("SideQuestResponse", sideQuestResponseSchema);
  const PenaltyQuestResponse = registry.register("PenaltyQuestResponse", penaltyQuestResponseSchema);
  const AiQuestResponse = registry.register("AiQuestResponse", aiQuestResponseSchema);

  const questGet = (path: string, summary: string, schema: Parameters<typeof jsonResponse>[0]): void => {
    registry.registerPath({
      method: "get",
      path,
      tags: ["Quests"],
      summary,
      security: AUTH_SECURITY,
      responses: {
        200: jsonResponse(schema),
        ...AUTH_RESPONSES,
      },
    });
  };

  questGet("/quests/today", "Dnevni quest (server-autoritativan, obnavlja se svaki dan)", DailyQuest);
  questGet("/quests/boss", "Boss quest (nedeljni izazov)", BossQuest);
  questGet("/quests/weekly", "Nedeljni quest", WeeklyQuest);
  questGet("/quests/main", "Glavni quest (lanac priče)", MainQuest);
  questGet("/quests/side", "Sporedni quest", SideQuestResponse);
  questGet("/quests/penalty", "Kazneni quest (posle propuštenog dnevnog questa)", PenaltyQuestResponse);
  questGet("/quests/ai", "AI-generisani quest (zahteva pro pretplatu)", AiQuestResponse);
}

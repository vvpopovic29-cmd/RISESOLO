import { OpenApiGeneratorV3 } from "@asteasolutions/zod-to-openapi";
import type { OpenAPIObject } from "@nestjs/swagger";
import { registry } from "./registry";
import { registerAchievementsPaths } from "./paths/achievements.paths";
import { registerAuthPaths } from "./paths/auth.paths";
import { registerExercisesPaths } from "./paths/exercises.paths";
import { registerFriendsPaths } from "./paths/friends.paths";
import { registerGuildsPaths } from "./paths/guilds.paths";
import { registerHealthPaths } from "./paths/health.paths";
import { registerInventoryPaths } from "./paths/inventory.paths";
import { registerLeaderboardPaths } from "./paths/leaderboard.paths";
import { registerNotificationsPaths } from "./paths/notifications.paths";
import { registerNutritionPaths } from "./paths/nutrition.paths";
import { registerPlayersPaths } from "./paths/players.paths";
import { registerQuestsPaths } from "./paths/quests.paths";
import { registerShopPaths } from "./paths/shop.paths";
import { registerSubscriptionsPaths } from "./paths/subscriptions.paths";
import { registerTrainingPlansPaths } from "./paths/training-plans.paths";
import { registerWorkoutHistoryPaths } from "./paths/workout-history.paths";
import { registerWorkoutTemplatesPaths } from "./paths/workout-templates.paths";
import { registerWorkoutsPaths } from "./paths/workouts.paths";

let built = false;

function registerAllPaths(): void {
  if (built) {
    return;
  }
  built = true;

  registerHealthPaths();
  registerAuthPaths();
  registerPlayersPaths();
  registerExercisesPaths();
  registerQuestsPaths();
  registerTrainingPlansPaths();
  registerWorkoutsPaths();
  registerWorkoutTemplatesPaths();
  registerWorkoutHistoryPaths();
  registerShopPaths();
  registerNutritionPaths();
  registerGuildsPaths();
  registerSubscriptionsPaths();
  registerNotificationsPaths();
  registerAchievementsPaths();
  registerLeaderboardPaths();
  registerFriendsPaths();
  registerInventoryPaths();
}

export function buildOpenApiDocument(): OpenAPIObject {
  registerAllPaths();

  const generator = new OpenApiGeneratorV3(registry.definitions);
  const document = generator.generateDocument({
    openapi: "3.0.3",
    info: {
      title: "RISESOLO API",
      version: "0.1.0",
      description:
        "Generisano iz istih Zod ugovora (`@risesolo/validation`) koje koriste ZodValidationPipe na serveru i packages/api-client na klijentu - šeme ovde su tačan odraz stvarnih request/response tela.",
    },
    servers: [{ url: "/", description: "Trenutni server" }],
  });

  // zod-to-openapi generiše openapi3-ts (oas30) tip - strukturno kompatibilan
  // sa @nestjs/swagger-ovim sopstvenim OpenAPIObject tipom koji SwaggerModule.setup očekuje.
  return document as unknown as OpenAPIObject;
}

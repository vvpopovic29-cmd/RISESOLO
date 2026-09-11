import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AuthModule } from "./auth/auth.module";
import { validateApiEnv } from "./config/env";
import { HealthModule } from "./health/health.module";
import { AchievementModule } from "./modules/achievement/achievement.module";
import { NutritionModule } from "./modules/nutrition/nutrition.module";
import { PlayerModule } from "./modules/player/player.module";
import { QuestModule } from "./modules/quest/quest.module";
import { TrainingPlanModule } from "./modules/training-plan/training-plan.module";
import { WorkoutModule } from "./modules/workout/workout.module";
import { SupabaseModule } from "./supabase/supabase.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [".env", "../../.env"],
      validate: validateApiEnv,
    }),
    SupabaseModule,
    AuthModule,
    HealthModule,
    PlayerModule,
    QuestModule,
    WorkoutModule,
    NutritionModule,
    AchievementModule,
    TrainingPlanModule,
  ],
})
export class AppModule {}

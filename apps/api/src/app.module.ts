import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { validateApiEnv } from "./config/env";
import { AuthModule } from "./auth/auth.module";
import { HealthModule } from "./health/health.module";
import { PrismaModule } from "./prisma/prisma.module";
import { PlayersModule } from "./players/players.module";
import { ExercisesModule } from "./exercises/exercises.module";
import { QuestsModule } from "./quests/quests.module";
import { WorkoutsModule } from "./workouts/workouts.module";
import { TrainingPlansModule } from "./training-plans/training-plans.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [".env", "../../.env"],
      validate: validateApiEnv,
    }),
    PrismaModule,
    HealthModule,
    AuthModule,
    PlayersModule,
    ExercisesModule,
    QuestsModule,
    WorkoutsModule,
    TrainingPlansModule,
  ],
})
export class AppModule {}

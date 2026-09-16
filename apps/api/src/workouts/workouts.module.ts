import { Module } from "@nestjs/common";
import { AchievementsModule } from "../achievements/achievements.module";
import { AuthModule } from "../auth/auth.module";
import { ExercisesModule } from "../exercises/exercises.module";
import { GuildsModule } from "../guilds/guilds.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { QuestsModule } from "../quests/quests.module";
import { WorkoutTemplatesController } from "./workout-templates.controller";
import { WorkoutTemplatesService } from "./workout-templates.service";
import { WorkoutsController } from "./workouts.controller";
import { WorkoutsService } from "./workouts.service";

@Module({
  imports: [AuthModule, QuestsModule, GuildsModule, NotificationsModule, AchievementsModule, ExercisesModule],
  controllers: [WorkoutsController, WorkoutTemplatesController],
  providers: [WorkoutsService, WorkoutTemplatesService],
})
export class WorkoutsModule {}

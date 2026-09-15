import { Module } from "@nestjs/common";
import { PlayersModule } from "../players/players.module";
import { ExercisesModule } from "../exercises/exercises.module";
import { QuestsModule } from "../quests/quests.module";
import { WorkoutsController } from "./workouts.controller";
import { WorkoutsService } from "./workouts.service";
import { WorkoutsRepository } from "./workouts.repository";

@Module({
  imports: [PlayersModule, ExercisesModule, QuestsModule],
  controllers: [WorkoutsController],
  providers: [WorkoutsService, WorkoutsRepository],
})
export class WorkoutsModule {}

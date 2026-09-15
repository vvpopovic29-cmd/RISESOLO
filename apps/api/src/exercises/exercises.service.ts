import { Injectable } from "@nestjs/common";
import {
  filterExercisesByCategory,
  filterExercisesByDifficulty,
  type Exercise,
  type ExerciseCategory,
  type ExerciseDifficulty,
} from "@risesolo/domain";
import type { ExercisesRepository } from "./exercises.repository";

export interface ListExercisesQuery {
  readonly category?: ExerciseCategory;
  readonly difficulty?: ExerciseDifficulty;
}

@Injectable()
export class ExercisesService {
  constructor(private readonly exercisesRepository: ExercisesRepository) {}

  async list(query: ListExercisesQuery): Promise<Exercise[]> {
    let exercises = await this.exercisesRepository.listAll();
    if (query.category) {
      exercises = filterExercisesByCategory(exercises, query.category);
    }
    if (query.difficulty) {
      exercises = filterExercisesByDifficulty(exercises, query.difficulty);
    }
    return exercises;
  }
}

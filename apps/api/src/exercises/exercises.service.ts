import { Injectable, NotFoundException } from "@nestjs/common";
import type { ExerciseDto, ListExercisesQuery } from "@risesolo/validation";
import type { Exercise } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class ExercisesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: ListExercisesQuery): Promise<ExerciseDto[]> {
    const exercises = await this.prisma.exercise.findMany({
      where: {
        category: query.category,
        type: query.type,
        difficulty: query.difficulty,
      },
      orderBy: [{ category: "asc" }, { progressionOrder: "asc" }, { name: "asc" }],
    });
    return exercises.map(toDto);
  }

  async getBySlug(slug: string): Promise<ExerciseDto> {
    const exercise = await this.prisma.exercise.findUnique({ where: { slug } });
    if (!exercise) {
      throw new NotFoundException(`Vezba '${slug}' nije pronadjena`);
    }
    return toDto(exercise);
  }
}

function toDto(exercise: Exercise): ExerciseDto {
  return {
    id: exercise.id,
    slug: exercise.slug,
    name: exercise.name,
    category: exercise.category,
    subcategory: exercise.subcategory,
    type: exercise.type,
    difficulty: exercise.difficulty,
    equipment: exercise.equipment,
    movementPattern: exercise.movementPattern,
    primaryMuscles: exercise.primaryMuscles,
    secondaryMuscles: exercise.secondaryMuscles,
    instructions: exercise.instructions,
    formCues: exercise.formCues,
    safetyNotes: exercise.safetyNotes,
    defaultSets: exercise.defaultSets,
    defaultReps: exercise.defaultReps,
    holdSeconds: exercise.holdSeconds,
    restSeconds: exercise.restSeconds,
    progressionChain: exercise.progressionChain,
    progressionOrder: exercise.progressionOrder,
  };
}

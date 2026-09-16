import { Injectable, NotFoundException } from "@nestjs/common";
import type { ExerciseDto, ListExercisesQuery } from "@risesolo/validation";
import type { CandidateExercise } from "@risesolo/domain";
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

  /** Koristi TrainingPlansService da obogati sacuvani plan (slug -> puni podaci o vezbi). */
  async findManyBySlugs(slugs: readonly string[]): Promise<ExerciseDto[]> {
    if (slugs.length === 0) return [];
    const exercises = await this.prisma.exercise.findMany({ where: { slug: { in: [...slugs] } } });
    return exercises.map(toDto);
  }

  /** Koristi WorkoutTemplatesService da obogati sacuvani template (exerciseId -> puni podaci o vezbi). */
  async findManyByIds(ids: readonly string[]): Promise<ExerciseDto[]> {
    if (ids.length === 0) return [];
    const exercises = await this.prisma.exercise.findMany({ where: { id: { in: [...ids] } } });
    return exercises.map(toDto);
  }

  /**
   * Kandidat vezbe za AI trening plan (packages/domain selectCandidateExercises) -
   * namerno iskljucuje SKILL vezbe (handstand/muscle-up progresije), koje
   * pretpostavljaju posvecen fokus van generickog nedeljnog plana.
   */
  async listCandidates(): Promise<CandidateExercise[]> {
    const exercises = await this.prisma.exercise.findMany({
      where: { type: { in: ["CALISTHENICS", "GYM"] } },
    });
    return exercises.map((exercise) => ({
      slug: exercise.slug,
      name: exercise.name,
      category: exercise.category,
      type: exercise.type as CandidateExercise["type"],
      difficulty: exercise.difficulty as CandidateExercise["difficulty"],
      movementPattern: exercise.movementPattern,
    }));
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

import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import type {
  CreateWorkoutTemplateRequest,
  WorkoutTemplateDetailDto,
  WorkoutTemplateSummaryDto,
} from "@risesolo/validation";
import type { Workout, WorkoutTemplateExercise } from "@prisma/client";
import { ExercisesService } from "../exercises/exercises.service";
import { PrismaService } from "../prisma/prisma.service";

type WorkoutWithExercises = Workout & { exercises: WorkoutTemplateExercise[] };

/**
 * "Moji treninzi" - imenovana, ponovo-upotrebljiva kolekcija vezbi (Workout
 * model je odavno postojao u schema.prisma kao prazan template koncept -
 * ovo ga prvi put stvarno koristi). `order` se izvodi iz pozicije u nizu pri
 * kreiranju, klijent ga ne salje eksplicitno.
 */
@Injectable()
export class WorkoutTemplatesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly exercisesService: ExercisesService,
  ) {}

  async create(userId: string, dto: CreateWorkoutTemplateRequest): Promise<WorkoutTemplateDetailDto> {
    const exerciseIds = dto.exercises.map((exercise) => exercise.exerciseId);
    const existingExercises = await this.exercisesService.findManyByIds(exerciseIds);
    const existingIds = new Set(existingExercises.map((exercise) => exercise.id));
    const hasUnknownExercise = exerciseIds.some((id) => !existingIds.has(id));
    if (hasUnknownExercise) {
      throw new BadRequestException("Jedna ili vise vezbi ne postoje");
    }

    const created = await this.prisma.workout.create({
      data: {
        userId,
        name: dto.name,
        exercises: {
          create: dto.exercises.map((exercise, index) => ({
            exerciseId: exercise.exerciseId,
            order: index + 1,
            targetSets: exercise.targetSets ?? null,
          })),
        },
      },
      include: { exercises: true },
    });

    return this.hydrate(created);
  }

  async list(userId: string): Promise<WorkoutTemplateSummaryDto[]> {
    const workouts = await this.prisma.workout.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { exercises: true } } },
    });

    return workouts.map((workout) => ({
      id: workout.id,
      name: workout.name,
      exerciseCount: workout._count.exercises,
      createdAt: workout.createdAt.toISOString(),
    }));
  }

  async getById(userId: string, id: string): Promise<WorkoutTemplateDetailDto> {
    const workout = await this.prisma.workout.findUnique({
      where: { id },
      include: { exercises: true },
    });
    // Ownership provera ovde (ekvivalent RLS-a) - 404 i za nepostojeci i za tudji template, ne curi informaciju.
    if (!workout || workout.userId !== userId) {
      throw new NotFoundException("Workout template nije pronadjen");
    }
    return this.hydrate(workout);
  }

  async delete(userId: string, id: string): Promise<void> {
    const workout = await this.prisma.workout.findUnique({ where: { id } });
    if (!workout || workout.userId !== userId) {
      throw new NotFoundException("Workout template nije pronadjen");
    }
    await this.prisma.workout.delete({ where: { id } });
  }

  private async hydrate(workout: WorkoutWithExercises): Promise<WorkoutTemplateDetailDto> {
    const exerciseIds = workout.exercises.map((exercise) => exercise.exerciseId);
    const exercises = await this.exercisesService.findManyByIds(exerciseIds);
    const byId = new Map(exercises.map((exercise) => [exercise.id, exercise]));

    return {
      id: workout.id,
      name: workout.name,
      exerciseCount: workout.exercises.length,
      createdAt: workout.createdAt.toISOString(),
      exercises: workout.exercises
        .slice()
        .sort((a, b) => a.order - b.order)
        .map((templateExercise) => ({
          order: templateExercise.order,
          targetSets: templateExercise.targetSets,
          exercise: byId.get(templateExercise.exerciseId) ?? null,
        })),
    };
  }
}

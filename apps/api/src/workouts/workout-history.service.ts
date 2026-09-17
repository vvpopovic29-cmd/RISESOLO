import { Injectable } from "@nestjs/common";
import type { PersonalRecordDto, WorkoutHistoryEntryDto, WorkoutHistoryExerciseDto } from "@risesolo/validation";
import type { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

type CompletedSetWithExercise = Prisma.WorkoutSetGetPayload<{
  include: { exercise: { select: { slug: true; name: true } } };
}>;

@Injectable()
export class WorkoutHistoryService {
  constructor(private readonly prisma: PrismaService) {}

  /** Poslednje zavrsene sesije, najnovije prve - `xpGained` cita bazni WORKOUT_COMPLETE XpEvent za svaku. */
  async list(userId: string, limit: number): Promise<WorkoutHistoryEntryDto[]> {
    const sessions = await this.prisma.workoutSession.findMany({
      where: { userId, status: "COMPLETED" },
      orderBy: { completedAt: "desc" },
      take: limit,
      include: {
        workout: { select: { name: true } },
        sets: {
          where: { completed: true },
          orderBy: { setNumber: "asc" },
          include: { exercise: { select: { slug: true, name: true } } },
        },
      },
    });
    if (sessions.length === 0) {
      return [];
    }

    const xpEvents = await this.prisma.xpEvent.findMany({
      where: { userId, source: "WORKOUT_COMPLETE", sourceId: { in: sessions.map((session) => session.id) } },
    });
    const xpGainedBySessionId = new Map(xpEvents.map((event) => [event.sourceId, event.amount]));

    return sessions.map((session) => ({
      id: session.id,
      workoutName: session.workout?.name ?? null,
      completedAt: (session.completedAt ?? session.startedAt).toISOString(),
      xpGained: xpGainedBySessionId.get(session.id) ?? 0,
      exercises: summarizeExercises(session.sets),
    }));
  }

  /** Najbolja ikad ulogovana serija po vezbi (max ponavljanja / max trajanje), preko svih zavrsenih sesija. */
  async listPersonalRecords(userId: string): Promise<PersonalRecordDto[]> {
    const grouped = await this.prisma.workoutSet.groupBy({
      by: ["exerciseId"],
      where: { completed: true, session: { userId, status: "COMPLETED" } },
      _max: { reps: true, durationSeconds: true },
    });
    if (grouped.length === 0) {
      return [];
    }

    const exercises = await this.prisma.exercise.findMany({
      where: { id: { in: grouped.map((group) => group.exerciseId) } },
      select: { id: true, slug: true, name: true },
    });
    const exerciseById = new Map(exercises.map((exercise) => [exercise.id, exercise]));

    const records: PersonalRecordDto[] = [];
    for (const group of grouped) {
      const exercise = exerciseById.get(group.exerciseId);
      if (!exercise) continue;
      records.push({
        exerciseId: exercise.id,
        exerciseSlug: exercise.slug,
        exerciseName: exercise.name,
        bestReps: group._max.reps,
        bestDurationSeconds: group._max.durationSeconds,
      });
    }
    return records.sort((a, b) => a.exerciseName.localeCompare(b.exerciseName));
  }
}

function summarizeExercises(sets: CompletedSetWithExercise[]): WorkoutHistoryExerciseDto[] {
  const byExerciseId = new Map<string, WorkoutHistoryExerciseDto>();
  for (const set of sets) {
    const existing = byExerciseId.get(set.exerciseId);
    if (!existing) {
      byExerciseId.set(set.exerciseId, {
        exerciseId: set.exerciseId,
        exerciseSlug: set.exercise.slug,
        exerciseName: set.exercise.name,
        setCount: 1,
        bestReps: set.reps,
        bestDurationSeconds: set.durationSeconds,
      });
      continue;
    }
    existing.setCount += 1;
    if (set.reps !== null) {
      existing.bestReps = existing.bestReps !== null ? Math.max(existing.bestReps, set.reps) : set.reps;
    }
    if (set.durationSeconds !== null) {
      existing.bestDurationSeconds =
        existing.bestDurationSeconds !== null ? Math.max(existing.bestDurationSeconds, set.durationSeconds) : set.durationSeconds;
    }
  }
  return [...byExerciseId.values()];
}

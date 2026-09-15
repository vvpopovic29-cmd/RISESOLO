import { randomUUID } from "node:crypto";
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
} from "@nestjs/common";
import {
  completeWorkout,
  logSet as domainLogSet,
  startFreeformWorkoutSession,
  startWorkoutSessionFromTemplate,
  type CompletionOutcome,
  type WorkoutSession,
} from "@risesolo/domain";
import { mapWorkoutSessionRowToDomain, mapWorkoutTemplateRowToDomain } from "@risesolo/validation";
import { WorkoutsRepository } from "./workouts.repository";
import { PlayersService } from "../players/players.service";
import { ExercisesService } from "../exercises/exercises.service";
import { QuestsService } from "../quests/quests.service";
import type { StartWorkoutRequest } from "./start-workout.dto";
import type { LogSetRequest } from "./log-set.dto";

@Injectable()
export class WorkoutsService {
  constructor(
    private readonly workoutsRepository: WorkoutsRepository,
    private readonly playersService: PlayersService,
    private readonly exercisesService: ExercisesService,
    private readonly questsService: QuestsService,
  ) {}

  async startSession(
    userId: string,
    request: StartWorkoutRequest,
    now: Date = new Date(),
  ): Promise<WorkoutSession> {
    const sessionId = randomUUID();
    let session: WorkoutSession;

    if (request.templateId) {
      const templateRow = await this.workoutsRepository.getTemplateWithExercises(request.templateId);
      const template = mapWorkoutTemplateRowToDomain(templateRow);
      if (template.userId !== null && template.userId !== userId) {
        throw new ForbiddenException("Ovaj workout template ne pripada tebi");
      }
      session = startWorkoutSessionFromTemplate({ id: sessionId, userId, template, now });
    } else if (request.exerciseIds) {
      session = startFreeformWorkoutSession({
        id: sessionId,
        userId,
        exerciseIds: request.exerciseIds,
        now,
      });
    } else {
      // schema.refine garantuje da je exerciseIds definisan kada templateId nije
      throw new BadRequestException("Mora biti prosledjen templateId ili exerciseIds");
    }

    await this.workoutsRepository.createSession({
      id: session.id,
      user_id: session.userId,
      workout_template_id: session.workoutTemplateId,
      status: session.status,
      started_at: session.startedAt,
    });
    await this.workoutsRepository.createSessionExercises(
      session.exercises.map((e) => ({
        session_id: session.id,
        exercise_id: e.exerciseId,
        order_index: e.order,
      })),
    );

    return session;
  }

  async logSet(userId: string, sessionId: string, request: LogSetRequest): Promise<WorkoutSession> {
    const sessionRow = await this.workoutsRepository.getSessionWithExercises(sessionId);
    if (sessionRow.user_id !== userId) {
      throw new ForbiddenException("Ovaj workout session ne pripada tebi");
    }
    const session = mapWorkoutSessionRowToDomain(sessionRow);

    const setId = randomUUID();
    const result = domainLogSet(session, request.exerciseId, setId, {
      reps: request.reps ?? null,
      weight: request.weight ?? null,
      durationSeconds: request.durationSeconds ?? null,
      assistance: request.assistance ?? null,
      completed: request.completed,
    });
    if (!result.ok) {
      throw new BadRequestException(result.error);
    }

    const sessionExerciseRow = sessionRow.workout_session_exercises.find(
      (e) => e.exercise_id === request.exerciseId,
    );
    if (!sessionExerciseRow) {
      // Ne bi trebalo da se desi - domainLogSet bi vec vratio EXERCISE_NOT_IN_SESSION gresku.
      throw new BadRequestException({ reason: "EXERCISE_NOT_IN_SESSION", exerciseId: request.exerciseId });
    }

    const updatedExercise = result.value.exercises.find((e) => e.exerciseId === request.exerciseId);
    const newSet = updatedExercise?.sets.find((s) => s.id === setId);
    if (!newSet) {
      // Ne bi trebalo da se desi - domainLogSet je upravo vratio ok rezultat sa ovim setId-jem.
      throw new BadRequestException({ reason: "SET_NOT_FOUND_AFTER_LOG", setId });
    }

    await this.workoutsRepository.insertSet(sessionExerciseRow.id, {
      id: newSet.id,
      set_number: newSet.setNumber,
      reps: newSet.reps,
      weight: newSet.weight,
      duration_seconds: newSet.durationSeconds,
      assistance: newSet.assistance,
      completed: newSet.completed,
    });

    return result.value;
  }

  /**
   * Completion Engine (Faza 6) - jedini put kojim se XP/level/rank/coins/
   * quest/streak menjaju. Napomena o atomicnosti: ovo je niz sekvencijalnih
   * upisa (session -> xp_events -> progression -> quest), NE jedna DB
   * transakcija. Za produkciju bi ovo trebalo da bude Postgres RPC funkcija
   * (kao stari fn_grant_xp koji je zamenjen ovom TS implementacijom) da bi
   * cela operacija bila all-or-nothing; MVP prihvata taj rizik.
   */
  async completeWorkoutSession(userId: string, sessionId: string, now: Date = new Date()): Promise<CompletionOutcome> {
    const sessionRow = await this.workoutsRepository.getSessionWithExercises(sessionId);
    if (sessionRow.user_id !== userId) {
      throw new ForbiddenException("Ovaj workout session ne pripada tebi");
    }
    const session = mapWorkoutSessionRowToDomain(sessionRow);

    const [exercises, progressionSnapshot, activeQuest] = await Promise.all([
      this.exercisesService.list({}),
      this.playersService.getProgressionSnapshot(userId),
      this.questsService.getOrCreateToday(userId, now),
    ]);

    const result = completeWorkout({
      session,
      exercises,
      previousTotalXp: progressionSnapshot.totalXp,
      previousStreak: progressionSnapshot.streak,
      previousCoins: progressionSnapshot.coins,
      activeQuest,
      now,
    });

    if (!result.ok) {
      throw new BadRequestException(result.error);
    }
    const outcome = result.value;
    const completedAt = outcome.session.completedAt;
    if (!completedAt) {
      // Invarijanta: completeWorkout uvek postavlja completedAt na uspesnom rezultatu.
      throw new InternalServerErrorException("completeWorkout nije postavio completedAt");
    }

    await this.workoutsRepository.completeSession(sessionId, completedAt);

    if (outcome.workoutXpGained > 0) {
      await this.workoutsRepository.insertXpEvent({
        user_id: userId,
        source: "WORKOUT",
        source_id: sessionId,
        amount: outcome.workoutXpGained,
      });
    }
    if (outcome.questXpGained > 0 && outcome.quest) {
      await this.workoutsRepository.insertXpEvent({
        user_id: userId,
        source: "QUEST",
        source_id: outcome.quest.quest.id,
        amount: outcome.questXpGained,
      });
    }

    await this.playersService.applyProgressionUpdate(userId, {
      totalXp: outcome.totalXp,
      coins: outcome.totalCoins,
      streak: outcome.streak,
    });

    if (outcome.quest) {
      await this.questsService.persist(outcome.quest.quest);
    }

    return outcome;
  }
}

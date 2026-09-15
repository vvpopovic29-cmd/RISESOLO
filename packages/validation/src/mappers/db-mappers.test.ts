import { mapPlayerStatsRowToDomain } from "./player-stats.mapper";
import { mapProgressionRowToStreak } from "./streak.mapper";
import { mapDomainQuestToRow, mapQuestRowToDomain } from "./quest.mapper";
import { mapWorkoutSessionRowToDomain, mapWorkoutTemplateRowToDomain } from "./workout.mapper";
import { mapExerciseRowToDomain } from "./exercise.mapper";
import { mapProfileRowToDomain } from "../contracts/profile";
import type { PlayerStatsRow } from "../contracts/player-stats";
import type { ProgressionRow } from "../contracts/progression";
import type { QuestRow } from "../contracts/quest";
import type { ExerciseRow } from "../contracts/exercise";
import type {
  WorkoutSessionWithExercisesRow,
  WorkoutTemplateWithExercisesRow,
} from "../contracts/workout";
import type { ProfileRow } from "../contracts/profile";

describe("mapProfileRowToDomain", () => {
  it("mapira snake_case red u camelCase Profile", () => {
    const row: ProfileRow = {
      id: "11111111-1111-1111-1111-111111111111",
      username: "hunter_abc123",
      avatar_url: null,
      created_at: "2026-09-14T00:00:00.000Z",
      updated_at: "2026-09-14T00:00:00.000Z",
    };
    expect(mapProfileRowToDomain(row)).toEqual({
      id: row.id,
      username: "hunter_abc123",
      avatarUrl: null,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    });
  });
});

describe("mapExerciseRowToDomain", () => {
  it("ugnjezdava ravne thumbnail_url/video_url/gif_url kolone u media objekat", () => {
    const row: ExerciseRow = {
      id: "cal-chest-push-up",
      name: "Push-Up",
      slug: "push-up",
      library: "CALISTHENICS",
      category: "CHEST",
      subcategory: null,
      movement_pattern: "PUSH",
      difficulty: "BEGINNER",
      equipment: ["BODYWEIGHT"],
      primary_muscles: ["Chest"],
      secondary_muscles: ["Triceps"],
      instructions: ["..."],
      form_cues: [],
      common_mistakes: [],
      safety_notes: ["..."],
      default_sets: 3,
      default_reps: "10-15",
      tempo: "2-0-2",
      rest_seconds: 45,
      xp_value: 8,
      thumbnail_url: "https://example.com/thumb.png",
      video_url: null,
      gif_url: null,
      tags: ["chest", "push"],
    };
    const exercise = mapExerciseRowToDomain(row);
    expect(exercise.media).toEqual({
      thumbnailUrl: "https://example.com/thumb.png",
      videoUrl: null,
      gifUrl: null,
    });
    expect(exercise.movementPattern).toBe("PUSH");
    expect(exercise.defaultSets).toBe(3);
  });
});

describe("mapPlayerStatsRowToDomain", () => {
  it("mapira unspent_points -> unspentPoints i ostale kolone 1:1", () => {
    const row: PlayerStatsRow = {
      user_id: "u1",
      strength: 5,
      agility: 6,
      endurance: 7,
      vitality: 8,
      intelligence: 9,
      unspent_points: 3,
      updated_at: "2026-09-14T00:00:00.000Z",
    };
    expect(mapPlayerStatsRowToDomain(row)).toEqual({
      strength: 5,
      agility: 6,
      endurance: 7,
      vitality: 8,
      intelligence: 9,
      unspentPoints: 3,
    });
  });
});

describe("mapProgressionRowToStreak", () => {
  it("izvlaci streak polja iz progression reda", () => {
    const row: ProgressionRow = {
      user_id: "u1",
      total_xp: 1000,
      coins: 20,
      current_streak: 4,
      longest_streak: 10,
      last_activity_date: "2026-09-14",
      updated_at: "2026-09-14T00:00:00.000Z",
    };
    expect(mapProgressionRowToStreak(row)).toEqual({
      currentStreak: 4,
      longestStreak: 10,
      lastActivityDate: "2026-09-14",
    });
  });
});

describe("quest mapper", () => {
  const row: QuestRow = {
    id: "daily-u1-2026-09-14",
    user_id: "u1",
    date: "2026-09-14",
    definition_id: "pushup-50",
    title: "50 Push-Ups",
    description: "...",
    target_value: 50,
    unit: "reps",
    progress_value: 10,
    status: "IN_PROGRESS",
    reward_xp: 80,
    created_at: "2026-09-14T00:00:00.000Z",
    expires_at: "2026-09-14T23:59:59.999Z",
    completed_at: null,
  };

  it("mapQuestRowToDomain gradi DailyQuest sa reward.xp", () => {
    const quest = mapQuestRowToDomain(row);
    expect(quest.reward).toEqual({ xp: 80 });
    expect(quest.definitionId).toBe("pushup-50");
    expect(quest.progressValue).toBe(10);
  });

  it("mapDomainQuestToRow je inverzna funkcija (round-trip)", () => {
    const quest = mapQuestRowToDomain(row);
    expect(mapDomainQuestToRow(quest)).toEqual(row);
  });
});

describe("workout mappers", () => {
  it("mapWorkoutSessionRowToDomain sortira vezbe po order_index i setove po set_number", () => {
    const row: WorkoutSessionWithExercisesRow = {
      id: "session-1",
      user_id: "u1",
      workout_template_id: null,
      status: "IN_PROGRESS",
      started_at: "2026-09-14T10:00:00.000Z",
      completed_at: null,
      workout_session_exercises: [
        {
          id: "se-2",
          session_id: "session-1",
          exercise_id: "cal-legs-squat",
          order_index: 2,
          workout_sets: [
            {
              id: "set-b",
              session_exercise_id: "se-2",
              set_number: 2,
              reps: 20,
              weight: null,
              duration_seconds: null,
              assistance: null,
              completed: true,
              created_at: "2026-09-14T10:05:00.000Z",
            },
            {
              id: "set-a",
              session_exercise_id: "se-2",
              set_number: 1,
              reps: 20,
              weight: null,
              duration_seconds: null,
              assistance: null,
              completed: true,
              created_at: "2026-09-14T10:04:00.000Z",
            },
          ],
        },
        {
          id: "se-1",
          session_id: "session-1",
          exercise_id: "cal-chest-push-up",
          order_index: 1,
          workout_sets: [],
        },
      ],
    };

    const session = mapWorkoutSessionRowToDomain(row);
    expect(session.exercises.map((e) => e.exerciseId)).toEqual([
      "cal-chest-push-up",
      "cal-legs-squat",
    ]);
    expect(session.exercises[1]?.sets.map((s) => s.setNumber)).toEqual([1, 2]);
    expect(session.exercises[1]?.sets[0]?.id).toBe("set-a");
  });

  it("mapWorkoutTemplateRowToDomain sortira vezbe po order_index", () => {
    const row: WorkoutTemplateWithExercisesRow = {
      id: "template-1",
      user_id: null,
      name: "Push Day",
      description: "",
      created_at: "2026-09-14T00:00:00.000Z",
      workout_template_exercises: [
        {
          id: "te-2",
          template_id: "template-1",
          exercise_id: "cal-shoulders-pike-push-up",
          order_index: 2,
          target_sets: 3,
          target_reps: "8-12",
          target_duration_seconds: null,
          rest_seconds: 60,
        },
        {
          id: "te-1",
          template_id: "template-1",
          exercise_id: "cal-chest-push-up",
          order_index: 1,
          target_sets: 3,
          target_reps: "10-15",
          target_duration_seconds: null,
          rest_seconds: 45,
        },
      ],
    };

    const template = mapWorkoutTemplateRowToDomain(row);
    expect(template.exercises.map((e) => e.exerciseId)).toEqual([
      "cal-chest-push-up",
      "cal-shoulders-pike-push-up",
    ]);
  });
});

import {
  healthResponseSchema,
  playerResponseSchema,
  questResponseSchema,
  exerciseResponseSchema,
  exerciseProgressResponseSchema,
  logWorkoutResponseSchema,
  workoutResponseSchema,
  nutritionTargetsSchema,
  mealLogResponseSchema,
  waterLogResponseSchema,
  nutritionDailySummarySchema,
  achievementResponseSchema,
  z,
  type HealthResponse,
  type PlayerResponse,
  type UpdatePlayerProfileInput,
  type AllocateStatPointsInput,
  type QuestResponse,
  type QuestStatus,
  type ExerciseResponse,
  type ExerciseProgressResponse,
  type LogWorkoutInput,
  type LogWorkoutResponse,
  type WorkoutResponse,
  type NutritionTargets,
  type UpdateNutritionTargetsInput,
  type LogMealInput,
  type MealLogResponse,
  type LogWaterInput,
  type WaterLogResponse,
  type NutritionDailySummary,
  type AchievementResponse,
} from "@risesolo/validation";

export interface ApiClientConfig {
  baseUrl: string;
  fetchImpl?: typeof fetch;
  /**
   * Vraca trenutni Supabase Auth access token (ili null ako korisnik nije
   * ulogovan). Pozvan pre svakog zahteva ka zasticenoj ruti - klijent ga
   * nikad ne kesira sam, jer token istice i osvezava se van ovog paketa.
   */
  getAccessToken?: () => Promise<string | null> | string | null;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public override readonly cause?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH";
  body?: unknown;
  query?: Record<string, string | undefined>;
  /** Ako je true, zahtev nosi Authorization header (podrazumevano true - skoro sve rute su zasticene). */
  authenticated?: boolean;
}

/**
 * Tanki fetch klijent. Odgovor svakog poziva se runtime validira protiv
 * deljene Zod seme iz `@risesolo/validation`, tako da su TS tipovi i stvarni
 * oblik odgovora garantovano usklajeni (jedan izvor istine za DTO).
 */
export function createApiClient(config: ApiClientConfig) {
  const fetchImpl = config.fetchImpl ?? fetch;
  const baseUrl = config.baseUrl.replace(/\/$/, "");

  async function request<TSchema extends z.ZodTypeAny>(
    path: string,
    schema: TSchema,
    options: RequestOptions = {},
  ): Promise<z.infer<TSchema>> {
    const url = new URL(`${baseUrl}${path}`);
    if (options.query) {
      for (const [key, value] of Object.entries(options.query)) {
        if (value !== undefined) {
          url.searchParams.set(key, value);
        }
      }
    }

    const headers: Record<string, string> = {};
    if (options.body !== undefined) {
      headers["Content-Type"] = "application/json";
    }
    if (options.authenticated !== false && config.getAccessToken) {
      const token = await config.getAccessToken();
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
    }

    let response: Response;
    try {
      response = await fetchImpl(url.toString(), {
        method: options.method ?? "GET",
        headers,
        body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      });
    } catch (cause) {
      throw new ApiError(`Zahtev ka ${path} nije uspeo (mrezna greska)`, cause);
    }

    if (!response.ok) {
      throw new ApiError(`${path} je vratio status ${response.status}`);
    }

    const json: unknown = await response.json();
    const parsed = schema.safeParse(json);
    if (!parsed.success) {
      throw new ApiError(`Odgovor rute ${path} ne odgovara ocekivanoj semi`, parsed.error);
    }

    return parsed.data;
  }

  return {
    async getHealth(): Promise<HealthResponse> {
      return request("/health", healthResponseSchema, { authenticated: false });
    },

    // --- Player -------------------------------------------------------
    async getPlayer(): Promise<PlayerResponse> {
      return request("/players/me", playerResponseSchema);
    },
    async updatePlayer(input: UpdatePlayerProfileInput): Promise<PlayerResponse> {
      return request("/players/me", playerResponseSchema, { method: "PATCH", body: input });
    },
    async allocateStatPoints(input: AllocateStatPointsInput): Promise<PlayerResponse> {
      return request("/players/me/stat-points/allocate", playerResponseSchema, {
        method: "POST",
        body: input,
      });
    },

    // --- Quests ---------------------------------------------------------
    async listQuests(status?: QuestStatus): Promise<QuestResponse[]> {
      return request("/quests", z.array(questResponseSchema), { query: { status } });
    },
    async generateDailyQuest(): Promise<QuestResponse> {
      return request("/quests/daily/generate", questResponseSchema, { method: "POST" });
    },
    async completeQuest(questId: string): Promise<QuestResponse> {
      return request(`/quests/${encodeURIComponent(questId)}/complete`, questResponseSchema, {
        method: "POST",
      });
    },

    // --- Training / Exercises -------------------------------------------
    async listExercises(): Promise<ExerciseResponse[]> {
      return request("/exercises", z.array(exerciseResponseSchema));
    },
    async getExerciseProgress(exerciseId: string): Promise<ExerciseProgressResponse> {
      return request(
        `/exercises/${encodeURIComponent(exerciseId)}/progress`,
        exerciseProgressResponseSchema,
      );
    },
    async logWorkout(input: LogWorkoutInput): Promise<LogWorkoutResponse> {
      return request("/workouts", logWorkoutResponseSchema, { method: "POST", body: input });
    },
    async listWorkouts(): Promise<WorkoutResponse[]> {
      return request("/workouts", z.array(workoutResponseSchema));
    },
    async getWorkout(workoutId: string): Promise<WorkoutResponse> {
      return request(`/workouts/${encodeURIComponent(workoutId)}`, workoutResponseSchema);
    },

    // --- Nutrition --------------------------------------------------------
    async getNutritionTargets(): Promise<NutritionTargets> {
      return request("/nutrition/targets", nutritionTargetsSchema);
    },
    async updateNutritionTargets(input: UpdateNutritionTargetsInput): Promise<NutritionTargets> {
      return request("/nutrition/targets", nutritionTargetsSchema, {
        method: "PATCH",
        body: input,
      });
    },
    async logMeal(input: LogMealInput): Promise<MealLogResponse> {
      return request("/nutrition/meals", mealLogResponseSchema, { method: "POST", body: input });
    },
    async logWater(input: LogWaterInput): Promise<WaterLogResponse> {
      return request("/nutrition/water", waterLogResponseSchema, { method: "POST", body: input });
    },
    async getNutritionSummary(date?: string): Promise<NutritionDailySummary> {
      return request("/nutrition/summary", nutritionDailySummarySchema, { query: { date } });
    },

    // --- Achievements -----------------------------------------------------
    async listAchievements(): Promise<AchievementResponse[]> {
      return request("/achievements", z.array(achievementResponseSchema));
    },
    async evaluateAchievements(): Promise<AchievementResponse[]> {
      return request("/achievements/evaluate", z.array(achievementResponseSchema), {
        method: "POST",
      });
    },
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;

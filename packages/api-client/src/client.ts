import {
  allocateStatPointsRequestSchema,
  authResponseSchema,
  completeWorkoutResponseSchema,
  dailyQuestSchema,
  exerciseSchema,
  healthResponseSchema,
  loginRequestSchema,
  onboardProfileRequestSchema,
  playerStateSchema,
  registerRequestSchema,
  workoutSessionSchema,
  type AllocateStatPointsRequest,
  type AuthResponse,
  type CompleteWorkoutResponse,
  type DailyQuestDto,
  type ExerciseDto,
  type HealthResponse,
  type ListExercisesQuery,
  type LoginRequest,
  type LogSetRequest,
  type OnboardProfileRequest,
  type PlayerStateDto,
  type RegisterRequest,
  type StartWorkoutSessionRequest,
  type WorkoutSessionDto,
  z,
} from "@risesolo/validation";
import { ApiError, createHttpClient, type HttpClientConfig } from "./http";

export type ApiClientConfig = HttpClientConfig;
export { ApiError };

/**
 * Tipizovan fetch klijent za ceo RISESOLO API. Svaki odgovor se runtime
 * validira protiv deljene Zod seme iz `@risesolo/validation` (isti ugovor
 * koji koristi `apps/api`) - jedan izvor istine za DTO na oba kraja.
 *
 * Auth: `config.getAccessToken()` se poziva pre svakog zahteva koji trazi
 * token (sve osim `getHealth`/`auth.register`/`auth.login`). Mobile app
 * (`apps/mobile/src/auth`) ga cita iz persist-ovanog stanja.
 */
export function createApiClient(config: ApiClientConfig) {
  const request = createHttpClient(config);
  const exerciseListSchema = z.array(exerciseSchema);

  return {
    getHealth(): Promise<HealthResponse> {
      return request({ method: "GET", path: "/health", auth: false, schema: healthResponseSchema });
    },

    auth: {
      register(dto: RegisterRequest): Promise<AuthResponse> {
        registerRequestSchema.parse(dto);
        return request({ method: "POST", path: "/auth/register", auth: false, body: dto, schema: authResponseSchema });
      },
      login(dto: LoginRequest): Promise<AuthResponse> {
        loginRequestSchema.parse(dto);
        return request({ method: "POST", path: "/auth/login", auth: false, body: dto, schema: authResponseSchema });
      },
    },

    players: {
      getMe(): Promise<PlayerStateDto> {
        return request({ method: "GET", path: "/players/me", schema: playerStateSchema });
      },
      onboard(dto: OnboardProfileRequest): Promise<PlayerStateDto> {
        onboardProfileRequestSchema.parse(dto);
        return request({ method: "POST", path: "/players/me/onboarding", body: dto, schema: playerStateSchema });
      },
      allocateStats(dto: AllocateStatPointsRequest): Promise<PlayerStateDto> {
        allocateStatPointsRequestSchema.parse(dto);
        return request({ method: "POST", path: "/players/me/stats/allocate", body: dto, schema: playerStateSchema });
      },
    },

    exercises: {
      list(query: ListExercisesQuery = {}): Promise<ExerciseDto[]> {
        return request({
          method: "GET",
          path: "/exercises",
          query: { category: query.category, type: query.type, difficulty: query.difficulty },
          schema: exerciseListSchema,
        });
      },
      getBySlug(slug: string): Promise<ExerciseDto> {
        return request({ method: "GET", path: `/exercises/${encodeURIComponent(slug)}`, schema: exerciseSchema });
      },
    },

    quests: {
      today(): Promise<DailyQuestDto> {
        return request({ method: "GET", path: "/quests/today", schema: dailyQuestSchema });
      },
    },

    workouts: {
      startSession(dto: StartWorkoutSessionRequest = {}): Promise<WorkoutSessionDto> {
        return request({ method: "POST", path: "/workouts/sessions", body: dto, schema: workoutSessionSchema });
      },
      logSet(sessionId: string, dto: LogSetRequest): Promise<void> {
        return request({ method: "POST", path: `/workouts/sessions/${sessionId}/sets`, body: dto });
      },
      complete(sessionId: string): Promise<CompleteWorkoutResponse> {
        return request({
          method: "POST",
          path: `/workouts/sessions/${sessionId}/complete`,
          schema: completeWorkoutResponseSchema,
        });
      },
    },
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;

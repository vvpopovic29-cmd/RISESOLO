import {
  allocateStatPointsRequestSchema,
  authResponseSchema,
  bossQuestSchema,
  changeGuildMemberRoleRequestSchema,
  completeWorkoutResponseSchema,
  createGuildRequestSchema,
  createNutritionEntryRequestSchema,
  dailyNutritionSummarySchema,
  dailyQuestSchema,
  donateToGuildRequestSchema,
  exerciseSchema,
  generateTrainingPlanRequestSchema,
  guildDetailSchema,
  guildMessageSchema,
  guildSummarySchema,
  healthResponseSchema,
  joinGuildRequestSchema,
  loginRequestSchema,
  nutritionEntrySchema,
  onboardProfileRequestSchema,
  playerStateSchema,
  postGuildMessageRequestSchema,
  registerRequestSchema,
  subscriptionStatusSchema,
  trainingPlanDetailSchema,
  trainingPlanSummarySchema,
  workoutSessionSchema,
  type AllocateStatPointsRequest,
  type AuthResponse,
  type BossQuestDto,
  type ChangeGuildMemberRoleRequest,
  type CompleteWorkoutResponse,
  type CreateGuildRequest,
  type CreateNutritionEntryRequest,
  type DailyNutritionSummaryDto,
  type DailyQuestDto,
  type DonateToGuildRequest,
  type ExerciseDto,
  type GenerateTrainingPlanRequest,
  type GuildDetailDto,
  type GuildMessageDto,
  type GuildSummaryDto,
  type HealthResponse,
  type JoinGuildRequest,
  type ListExercisesQuery,
  type LoginRequest,
  type LogSetRequest,
  type NutritionEntryDto,
  type OnboardProfileRequest,
  type PlayerStateDto,
  type PostGuildMessageRequest,
  type RegisterRequest,
  type StartWorkoutSessionRequest,
  type SubscriptionStatusDto,
  type TrainingPlanDetailDto,
  type TrainingPlanSummaryDto,
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
  const trainingPlanListSchema = z.array(trainingPlanSummarySchema);
  const guildListSchema = z.array(guildSummarySchema);
  const guildMessageListSchema = z.array(guildMessageSchema);

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
      boss(): Promise<BossQuestDto> {
        return request({ method: "GET", path: "/quests/boss", schema: bossQuestSchema });
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

    trainingPlans: {
      generate(dto: GenerateTrainingPlanRequest): Promise<TrainingPlanDetailDto> {
        generateTrainingPlanRequestSchema.parse(dto);
        return request({
          method: "POST",
          path: "/training-plans/generate",
          body: dto,
          schema: trainingPlanDetailSchema,
        });
      },
      list(): Promise<TrainingPlanSummaryDto[]> {
        return request({ method: "GET", path: "/training-plans", schema: trainingPlanListSchema });
      },
      getById(id: string): Promise<TrainingPlanDetailDto> {
        return request({
          method: "GET",
          path: `/training-plans/${encodeURIComponent(id)}`,
          schema: trainingPlanDetailSchema,
        });
      },
    },

    nutrition: {
      createEntry(dto: CreateNutritionEntryRequest): Promise<NutritionEntryDto> {
        createNutritionEntryRequestSchema.parse(dto);
        return request({ method: "POST", path: "/nutrition/entries", body: dto, schema: nutritionEntrySchema });
      },
      getDay(date?: string): Promise<DailyNutritionSummaryDto> {
        return request({
          method: "GET",
          path: "/nutrition/entries",
          query: { date },
          schema: dailyNutritionSummarySchema,
        });
      },
      deleteEntry(id: string): Promise<void> {
        return request({ method: "DELETE", path: `/nutrition/entries/${encodeURIComponent(id)}` });
      },
    },

    guilds: {
      list(): Promise<GuildSummaryDto[]> {
        return request({ method: "GET", path: "/guilds", schema: guildListSchema });
      },
      getMine(): Promise<GuildDetailDto> {
        return request({ method: "GET", path: "/guilds/me", schema: guildDetailSchema });
      },
      create(dto: CreateGuildRequest): Promise<GuildDetailDto> {
        createGuildRequestSchema.parse(dto);
        return request({ method: "POST", path: "/guilds", body: dto, schema: guildDetailSchema });
      },
      join(dto: JoinGuildRequest): Promise<GuildDetailDto> {
        joinGuildRequestSchema.parse(dto);
        return request({ method: "POST", path: "/guilds/join", body: dto, schema: guildDetailSchema });
      },
      leave(): Promise<void> {
        return request({ method: "POST", path: "/guilds/leave" });
      },
      kickMember(userId: string): Promise<void> {
        return request({ method: "POST", path: `/guilds/members/${encodeURIComponent(userId)}/kick` });
      },
      changeMemberRole(userId: string, dto: ChangeGuildMemberRoleRequest): Promise<void> {
        changeGuildMemberRoleRequestSchema.parse(dto);
        return request({ method: "POST", path: `/guilds/members/${encodeURIComponent(userId)}/role`, body: dto });
      },
      getMessages(): Promise<GuildMessageDto[]> {
        return request({ method: "GET", path: "/guilds/messages", schema: guildMessageListSchema });
      },
      postMessage(dto: PostGuildMessageRequest): Promise<GuildMessageDto> {
        postGuildMessageRequestSchema.parse(dto);
        return request({ method: "POST", path: "/guilds/messages", body: dto, schema: guildMessageSchema });
      },
      donate(dto: DonateToGuildRequest): Promise<GuildDetailDto> {
        donateToGuildRequestSchema.parse(dto);
        return request({ method: "POST", path: "/guilds/treasury/donate", body: dto, schema: guildDetailSchema });
      },
      distributeTreasury(): Promise<GuildDetailDto> {
        return request({ method: "POST", path: "/guilds/treasury/distribute", schema: guildDetailSchema });
      },
    },

    subscriptions: {
      getStatus(): Promise<SubscriptionStatusDto> {
        return request({ method: "GET", path: "/subscriptions/me", schema: subscriptionStatusSchema });
      },
    },
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;

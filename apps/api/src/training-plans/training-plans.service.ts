import { Injectable, NotFoundException, ServiceUnavailableException } from "@nestjs/common";
import { selectCandidateExercises, type CandidateDifficulty, type CandidateType } from "@risesolo/domain";
import type {
  GenerateTrainingPlanRequest,
  TrainingPlanContent,
  TrainingPlanDetailDto,
  TrainingPlanExerciseDetail,
  TrainingPlanSummaryDto,
} from "@risesolo/validation";
import type { Prisma, TrainingPlan } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { ExercisesService } from "../exercises/exercises.service";
import { AiService } from "../ai/ai.service";

type TrainingTypeFilter = Extract<CandidateType, "CALISTHENICS" | "GYM">;

const CANDIDATE_TYPES = new Set<TrainingTypeFilter>(["CALISTHENICS", "GYM"]);
const CANDIDATE_DIFFICULTIES = new Set<CandidateDifficulty>(["BEGINNER", "INTERMEDIATE", "ADVANCED"]);

@Injectable()
export class TrainingPlansService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly exercisesService: ExercisesService,
    private readonly aiService: AiService,
  ) {}

  /**
   * Generise TACNO jedan plan na zahtev (bez auto-adaptacije - vidi
   * packages/validation/contracts/training.ts). Kandidat vezbe se biraju
   * pre poziva AI-a (selectCandidateExercises) da model bira iz malog,
   * relevantnog skupa umesto celog kataloga - i da mozemo da proverimo da
   * nije izmislio slug koji ne postoji.
   */
  async generate(userId: string, dto: GenerateTrainingPlanRequest): Promise<TrainingPlanDetailDto> {
    const profile = await this.prisma.profile.findUnique({ where: { userId } });
    if (!profile) {
      throw new NotFoundException("Profil igraca nije pronadjen");
    }

    const trainingType = toCandidateType(profile.trainingType);
    const experienceLevel = toCandidateDifficulty(profile.experienceLevel);

    const allCandidates = await this.exercisesService.listCandidates();
    const candidates = selectCandidateExercises(allCandidates, { trainingType, experienceLevel });
    if (candidates.length === 0) {
      throw new ServiceUnavailableException("Nema dostupnih vezbi za generisanje plana.");
    }

    const aiOutput = await this.aiService.generateTrainingPlan({
      daysPerWeek: dto.daysPerWeek,
      goal: dto.goal,
      trainingType,
      experienceLevel,
      candidates,
    });

    const validSlugs = new Set(candidates.map((exercise) => exercise.slug));
    const usesOnlyKnownSlugs = aiOutput.days.every((day) =>
      day.exercises.every((exercise) => validSlugs.has(exercise.exerciseSlug)),
    );
    if (!usesOnlyKnownSlugs) {
      throw new ServiceUnavailableException("AI je vratio nepoznatu vezbu, pokusaj ponovo.");
    }

    const content: TrainingPlanContent = { days: aiOutput.days };

    const created = await this.prisma.trainingPlan.create({
      data: {
        userId,
        title: aiOutput.title,
        summary: aiOutput.summary ?? null,
        daysPerWeek: dto.daysPerWeek,
        content: content as unknown as Prisma.InputJsonValue,
        model: this.aiService.model,
      },
    });

    return this.hydrate(created);
  }

  async list(userId: string): Promise<TrainingPlanSummaryDto[]> {
    const plans = await this.prisma.trainingPlan.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: { id: true, title: true, summary: true, daysPerWeek: true, model: true, createdAt: true },
    });
    return plans.map((plan) => ({
      id: plan.id,
      title: plan.title,
      summary: plan.summary,
      daysPerWeek: plan.daysPerWeek,
      model: plan.model,
      createdAt: plan.createdAt.toISOString(),
    }));
  }

  async getById(userId: string, id: string): Promise<TrainingPlanDetailDto> {
    const plan = await this.prisma.trainingPlan.findUnique({ where: { id } });
    // Ownership provera ovde (ekvivalent RLS-a) - ne prosledjujemo userId u WHERE
    // da 404 izgleda isto za "ne postoji" i "postoji ali nije tvoj" (ne curi informaciju).
    if (!plan || plan.userId !== userId) {
      throw new NotFoundException("Trening plan nije pronadjen");
    }
    return this.hydrate(plan);
  }

  private async hydrate(plan: TrainingPlan): Promise<TrainingPlanDetailDto> {
    const content = plan.content as unknown as TrainingPlanContent;
    const slugs = Array.from(new Set(content.days.flatMap((day) => day.exercises.map((e) => e.exerciseSlug))));
    const exercises = await this.exercisesService.findManyBySlugs(slugs);
    const bySlug = new Map(exercises.map((exercise) => [exercise.slug, exercise]));

    return {
      id: plan.id,
      title: plan.title,
      summary: plan.summary,
      daysPerWeek: plan.daysPerWeek,
      model: plan.model,
      createdAt: plan.createdAt.toISOString(),
      content: {
        days: content.days.map((day) => ({
          ...day,
          exercises: day.exercises.map(
            (exercise): TrainingPlanExerciseDetail => ({
              ...exercise,
              exercise: bySlug.get(exercise.exerciseSlug) ?? null,
            }),
          ),
        })),
      },
    };
  }
}

function toCandidateType(value: string | null): TrainingTypeFilter | null {
  return value && CANDIDATE_TYPES.has(value as TrainingTypeFilter) ? (value as TrainingTypeFilter) : null;
}

function toCandidateDifficulty(value: string | null): CandidateDifficulty | null {
  return value && CANDIDATE_DIFFICULTIES.has(value as CandidateDifficulty) ? (value as CandidateDifficulty) : null;
}

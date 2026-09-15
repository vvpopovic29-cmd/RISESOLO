/**
 * Bira uzi skup kandidat vezbi koje se salju AI modelu (apps/api/src/ai) da
 * gradi trening plan. Filtriranje se radi ovde (pure funkcija, testabilna
 * bez mreze/DB) da AI dobije mali, relevantan skup - ne ceo katalog od 247
 * vezbi - sto smanjuje sansu da izmisli slug koji ne postoji.
 */

export const CANDIDATE_DIFFICULTIES = ["BEGINNER", "INTERMEDIATE", "ADVANCED"] as const;
export type CandidateDifficulty = (typeof CANDIDATE_DIFFICULTIES)[number];

export const CANDIDATE_TYPES = ["CALISTHENICS", "GYM", "SKILL"] as const;
export type CandidateType = (typeof CANDIDATE_TYPES)[number];

export interface CandidateExercise {
  slug: string;
  name: string;
  category: string;
  type: CandidateType;
  difficulty: CandidateDifficulty;
  movementPattern: string;
}

export interface SelectCandidateExercisesFilters {
  /** null/undefined = bez ogranicenja po tipu (koristi i CALISTHENICS i GYM). */
  trainingType?: "CALISTHENICS" | "GYM" | null;
  /** null/undefined = bez ogranicenja - ukljuci sve nivoe tezine. */
  experienceLevel?: CandidateDifficulty | null;
  /** Gornja granica vezbi po kategoriji (CHEST, BACK, ...), da plan pokrije vise grupa misica. */
  maxPerCategory?: number;
}

const DEFAULT_MAX_PER_CATEGORY = 6;

/**
 * Vraca vezbe koje odgovaraju tipu treninga i nivou iskustva igraca (nikad
 * teze od `experienceLevel`), ogranicene na najvise `maxPerCategory` po
 * kategoriji misica da bi lista ostala raznovrsna umesto dominirana jednom
 * kategorijom.
 */
export function selectCandidateExercises(
  exercises: readonly CandidateExercise[],
  filters: SelectCandidateExercisesFilters = {},
): CandidateExercise[] {
  const { trainingType, experienceLevel, maxPerCategory = DEFAULT_MAX_PER_CATEGORY } = filters;

  const maxDifficultyIndex = experienceLevel
    ? CANDIDATE_DIFFICULTIES.indexOf(experienceLevel)
    : CANDIDATE_DIFFICULTIES.length - 1;

  const perCategoryCount = new Map<string, number>();
  const result: CandidateExercise[] = [];

  for (const exercise of exercises) {
    if (trainingType && exercise.type !== trainingType) continue;

    const difficultyIndex = CANDIDATE_DIFFICULTIES.indexOf(exercise.difficulty);
    if (difficultyIndex > maxDifficultyIndex) continue;

    const count = perCategoryCount.get(exercise.category) ?? 0;
    if (count >= maxPerCategory) continue;

    perCategoryCount.set(exercise.category, count + 1);
    result.push(exercise);
  }

  return result;
}

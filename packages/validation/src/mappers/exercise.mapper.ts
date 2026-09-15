import type { Exercise, ProgressionChain, SkillLine } from "@risesolo/domain";

import type { ExerciseDto, ExerciseRow, ProgressionChainDto, SkillLineDto } from "../contracts/exercise";

/**
 * Mapira validiran (Zod) DTO oblik (snake_case, sirov JSON iz
 * data/exercises/*.json) u domain oblik (camelCase, @risesolo/domain).
 * Ovo je jedino mesto koje sme da radi tu konverziju - pozivaoci (buduci
 * Faza 2 backend seed skript, Faza 5+ mobile loader) treba da idu:
 * fs.readFile -> JSON.parse -> exerciseLibraryFileSchema.parse -> mapExerciseDtoToDomain.
 */
export function mapExerciseDtoToDomain(dto: ExerciseDto): Exercise {
  return {
    id: dto.id,
    name: dto.name,
    slug: dto.slug,
    library: dto.library,
    category: dto.category,
    subcategory: dto.subcategory,
    movementPattern: dto.movement_pattern,
    difficulty: dto.difficulty,
    equipment: dto.equipment,
    primaryMuscles: dto.primary_muscles,
    secondaryMuscles: dto.secondary_muscles,
    instructions: dto.instructions,
    formCues: dto.form_cues,
    commonMistakes: dto.common_mistakes,
    safetyNotes: dto.safety_notes,
    defaultSets: dto.default_sets,
    defaultReps: dto.default_reps,
    tempo: dto.tempo,
    restSeconds: dto.rest_seconds,
    xpValue: dto.xp_value,
    media: {
      thumbnailUrl: dto.media.thumbnail_url,
      videoUrl: dto.media.video_url,
      gifUrl: dto.media.gif_url,
    },
    tags: dto.tags,
  };
}

/** Isto kao mapExerciseDtoToDomain, ali za `public.exercises` red (ravne media kolone, ne ugnjezden objekat). */
export function mapExerciseRowToDomain(row: ExerciseRow): Exercise {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    library: row.library,
    category: row.category,
    subcategory: row.subcategory,
    movementPattern: row.movement_pattern,
    difficulty: row.difficulty,
    equipment: row.equipment,
    primaryMuscles: row.primary_muscles,
    secondaryMuscles: row.secondary_muscles,
    instructions: row.instructions,
    formCues: row.form_cues,
    commonMistakes: row.common_mistakes,
    safetyNotes: row.safety_notes,
    defaultSets: row.default_sets,
    defaultReps: row.default_reps,
    tempo: row.tempo,
    restSeconds: row.rest_seconds,
    xpValue: row.xp_value,
    media: {
      thumbnailUrl: row.thumbnail_url,
      videoUrl: row.video_url,
      gifUrl: row.gif_url,
    },
    tags: row.tags,
  };
}

export function mapSkillLineDtoToDomain(dto: SkillLineDto): SkillLine {
  return {
    id: dto.id,
    name: dto.name,
    primaryMuscles: dto.primary_muscles,
    description: dto.description,
    steps: dto.steps.map((step) => ({
      id: step.id,
      order: step.order,
      name: step.name,
      difficulty: step.difficulty,
      equipment: step.equipment,
      holdTargetSeconds: step.hold_target_seconds,
      isSkillMastery: step.is_skill_mastery,
    })),
  };
}

export function mapProgressionChainDtoToDomain(dto: ProgressionChainDto): ProgressionChain {
  return {
    id: dto.id,
    name: dto.name,
    category: dto.category,
    steps: dto.steps,
  };
}

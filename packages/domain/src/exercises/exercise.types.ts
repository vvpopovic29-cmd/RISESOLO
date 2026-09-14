/**
 * Tipovi za RISESOLO exercise library dataset (data/exercises/*.json).
 * Cisto strukturni opis podataka - bez poslovne logike (Faza 1).
 */

export type ExerciseLibrary = "CALISTHENICS" | "GYM";

export type ExerciseDifficulty = "BEGINNER" | "INTERMEDIATE" | "ADVANCED";

export type ExerciseCategory =
  | "CHEST"
  | "BACK"
  | "SHOULDERS"
  | "ARMS"
  | "LEGS"
  | "CORE"
  | "FULL_BODY";

export type ExerciseSubcategory =
  | "BICEPS"
  | "TRICEPS"
  | "QUADRICEPS"
  | "HAMSTRINGS"
  | "GLUTES"
  | "CALVES"
  | null;

export type MovementPattern =
  | "PUSH"
  | "PULL"
  | "SQUAT"
  | "HINGE"
  | "CORE"
  | "SKILL_ISOMETRIC"
  | "FULL_BODY_CONDITIONING"
  | "ISOLATION"
  | "MOBILITY";

export type Equipment =
  | "BODYWEIGHT"
  | "WALL"
  | "BENCH"
  | "PULL_UP_BAR"
  | "DIP_BAR"
  | "DUMBBELL"
  | "BARBELL"
  | "KETTLEBELL"
  | "CABLE"
  | "MACHINE"
  | "RESISTANCE_BAND"
  | "JUMP_ROPE";

export interface ExerciseMedia {
  thumbnailUrl: string | null;
  videoUrl: string | null;
  gifUrl: string | null;
}

/** Jedna vezba iz exercise library-ja (calisthenics ili gym). */
export interface Exercise {
  id: string;
  name: string;
  slug: string;
  library: ExerciseLibrary;
  category: ExerciseCategory;
  subcategory: ExerciseSubcategory;
  movementPattern: MovementPattern;
  difficulty: ExerciseDifficulty;
  equipment: Equipment[];
  primaryMuscles: string[];
  secondaryMuscles: string[];
  instructions: string[];
  formCues: string[];
  commonMistakes: string[];
  safetyNotes: string[];
  defaultSets: number;
  defaultReps: string;
  tempo: string;
  restSeconds: number;
  xpValue: number;
  media: ExerciseMedia;
  tags: string[];
}

/** Jedan korak u progresiji ka calisthenics skill-u (npr. Handstand, Planche). */
export interface SkillStep {
  id: string;
  order: number;
  name: string;
  difficulty: ExerciseDifficulty;
  equipment: Equipment[];
  holdTargetSeconds: number | null;
  isSkillMastery: boolean;
}

/** Linija progresije ka jednom calisthenics skill-u (npr. Front Lever, Muscle-Up). */
export interface SkillLine {
  id: string;
  name: string;
  primaryMuscles: string[];
  description: string;
  steps: SkillStep[];
}

/** Imenovani lanac progresije vezbi unutar iste kategorije (npr. Push-Up Progression). */
export interface ProgressionChain {
  id: string;
  name: string;
  category: ExerciseCategory;
  /** ID-jevi vezbi (Exercise.id), redosledom od najlaksе ka najtezoj varijanti. */
  steps: Array<string | null>;
}

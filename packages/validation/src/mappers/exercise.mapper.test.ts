import type { ExerciseDto, ProgressionChainDto, SkillLineDto } from "../contracts/exercise";
import {
  mapExerciseDtoToDomain,
  mapProgressionChainDtoToDomain,
  mapSkillLineDtoToDomain,
} from "./exercise.mapper";

const EXERCISE_DTO: ExerciseDto = {
  id: "cal-chest-standard-push-up",
  name: "Standard Push-Up",
  slug: "standard-push-up",
  library: "CALISTHENICS",
  category: "CHEST",
  subcategory: null,
  movement_pattern: "PUSH",
  difficulty: "BEGINNER",
  equipment: ["BODYWEIGHT"],
  primary_muscles: ["Chest"],
  secondary_muscles: ["Triceps"],
  instructions: ["..."],
  form_cues: ["..."],
  common_mistakes: ["..."],
  safety_notes: ["..."],
  default_sets: 3,
  default_reps: "10-15",
  tempo: "2-0-2",
  rest_seconds: 45,
  xp_value: 8,
  media: { thumbnail_url: null, video_url: null, gif_url: null },
  tags: ["chest", "push"],
};

describe("mapExerciseDtoToDomain", () => {
  it("mapira snake_case DTO polja u camelCase domain oblik bez gubitka podataka", () => {
    const domain = mapExerciseDtoToDomain(EXERCISE_DTO);
    expect(domain).toEqual({
      id: EXERCISE_DTO.id,
      name: EXERCISE_DTO.name,
      slug: EXERCISE_DTO.slug,
      library: EXERCISE_DTO.library,
      category: EXERCISE_DTO.category,
      subcategory: EXERCISE_DTO.subcategory,
      movementPattern: EXERCISE_DTO.movement_pattern,
      difficulty: EXERCISE_DTO.difficulty,
      equipment: EXERCISE_DTO.equipment,
      primaryMuscles: EXERCISE_DTO.primary_muscles,
      secondaryMuscles: EXERCISE_DTO.secondary_muscles,
      instructions: EXERCISE_DTO.instructions,
      formCues: EXERCISE_DTO.form_cues,
      commonMistakes: EXERCISE_DTO.common_mistakes,
      safetyNotes: EXERCISE_DTO.safety_notes,
      defaultSets: EXERCISE_DTO.default_sets,
      defaultReps: EXERCISE_DTO.default_reps,
      tempo: EXERCISE_DTO.tempo,
      restSeconds: EXERCISE_DTO.rest_seconds,
      xpValue: EXERCISE_DTO.xp_value,
      media: { thumbnailUrl: null, videoUrl: null, gifUrl: null },
      tags: EXERCISE_DTO.tags,
    });
  });
});

describe("mapSkillLineDtoToDomain", () => {
  it("mapira skill line i sve korake u camelCase", () => {
    const dto: SkillLineDto = {
      id: "skill-line-handstand",
      name: "Handstand",
      primary_muscles: ["Shoulders"],
      description: "...",
      steps: [
        {
          id: "step-1",
          order: 1,
          name: "Wall Handstand",
          difficulty: "BEGINNER",
          equipment: ["WALL", "BODYWEIGHT"],
          hold_target_seconds: 20,
          is_skill_mastery: false,
        },
      ],
    };
    const domain = mapSkillLineDtoToDomain(dto);
    expect(domain.primaryMuscles).toEqual(["Shoulders"]);
    expect(domain.steps[0]).toEqual({
      id: "step-1",
      order: 1,
      name: "Wall Handstand",
      difficulty: "BEGINNER",
      equipment: ["WALL", "BODYWEIGHT"],
      holdTargetSeconds: 20,
      isSkillMastery: false,
    });
  });
});

describe("mapProgressionChainDtoToDomain", () => {
  it("mapira progression chain 1:1 (vec camelCase-kompatibilan oblik)", () => {
    const dto: ProgressionChainDto = {
      id: "push-up-progression",
      name: "Push-Up Progression",
      category: "CHEST",
      steps: ["a", null, "b"],
    };
    expect(mapProgressionChainDtoToDomain(dto)).toEqual(dto);
  });
});

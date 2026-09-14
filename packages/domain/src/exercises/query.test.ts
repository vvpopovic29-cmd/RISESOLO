import {
  filterExercisesByAvailableEquipment,
  filterExercisesByCategory,
  filterExercisesByDifficulty,
  findExerciseById,
  findExerciseBySlug,
  findProgressionChain,
  findSkillLine,
  firstSkillStep,
  groupExercisesByCategory,
  masterySkillStep,
  nextSkillStep,
  resolveProgressionChainExercises,
} from "./query";
import type { Exercise, ProgressionChain, SkillLine } from "./exercise.types";

function makeExercise(overrides: Partial<Exercise>): Exercise {
  return {
    id: "cal-chest-push-up",
    name: "Push-Up",
    slug: "push-up",
    library: "CALISTHENICS",
    category: "CHEST",
    subcategory: null,
    movementPattern: "PUSH",
    difficulty: "BEGINNER",
    equipment: ["BODYWEIGHT"],
    primaryMuscles: ["Chest"],
    secondaryMuscles: ["Triceps"],
    instructions: ["..."],
    formCues: ["..."],
    commonMistakes: ["..."],
    safetyNotes: ["..."],
    defaultSets: 3,
    defaultReps: "10-15",
    tempo: "2-0-2",
    restSeconds: 45,
    xpValue: 8,
    media: { thumbnailUrl: null, videoUrl: null, gifUrl: null },
    tags: ["chest", "push"],
    ...overrides,
  };
}

const PUSH_UP = makeExercise({ id: "cal-chest-push-up", slug: "push-up" });
const SQUAT = makeExercise({
  id: "cal-legs-squat",
  slug: "squat",
  category: "LEGS",
  subcategory: "QUADRICEPS",
  difficulty: "BEGINNER",
});
const DUMBBELL_CURL = makeExercise({
  id: "gym-arms-dumbbell-curl",
  slug: "dumbbell-curl",
  library: "GYM",
  category: "ARMS",
  subcategory: "BICEPS",
  difficulty: "INTERMEDIATE",
  equipment: ["DUMBBELL"],
});
const ONE_ARM_PUSH_UP = makeExercise({
  id: "cal-chest-one-arm-push-up",
  slug: "one-arm-push-up",
  difficulty: "ADVANCED",
});

const EXERCISES = [PUSH_UP, SQUAT, DUMBBELL_CURL, ONE_ARM_PUSH_UP];

describe("exercise query helpers", () => {
  it("findExerciseById / findExerciseBySlug pronalaze tacan zapis", () => {
    expect(findExerciseById(EXERCISES, "cal-legs-squat")).toBe(SQUAT);
    expect(findExerciseBySlug(EXERCISES, "dumbbell-curl")).toBe(DUMBBELL_CURL);
    expect(findExerciseById(EXERCISES, "ne-postoji")).toBeUndefined();
  });

  it("filterExercisesByCategory vraca samo vezbe te kategorije", () => {
    expect(filterExercisesByCategory(EXERCISES, "CHEST")).toEqual([PUSH_UP, ONE_ARM_PUSH_UP]);
  });

  it("filterExercisesByDifficulty vraca samo vezbe tog nivoa", () => {
    expect(filterExercisesByDifficulty(EXERCISES, "ADVANCED")).toEqual([ONE_ARM_PUSH_UP]);
  });

  it("filterExercisesByAvailableEquipment vraca samo vezbe izvodljive sa datom opremom", () => {
    const bodyweightOnly = filterExercisesByAvailableEquipment(EXERCISES, ["BODYWEIGHT"]);
    expect(bodyweightOnly).toEqual([PUSH_UP, SQUAT, ONE_ARM_PUSH_UP]);

    const withDumbbell = filterExercisesByAvailableEquipment(EXERCISES, ["BODYWEIGHT", "DUMBBELL"]);
    expect(withDumbbell).toHaveLength(4);
  });

  it("groupExercisesByCategory grupise po kategoriji", () => {
    const groups = groupExercisesByCategory(EXERCISES);
    expect(groups.CHEST).toEqual([PUSH_UP, ONE_ARM_PUSH_UP]);
    expect(groups.LEGS).toEqual([SQUAT]);
    expect(groups.ARMS).toEqual([DUMBBELL_CURL]);
  });

  describe("progression chains", () => {
    const CHAIN: ProgressionChain = {
      id: "push-up-progression",
      name: "Push-Up Progression",
      category: "CHEST",
      steps: [PUSH_UP.id, null, ONE_ARM_PUSH_UP.id, "nepostojeci-id"],
    };

    it("findProgressionChain pronalazi lanac po id-ju", () => {
      expect(findProgressionChain([CHAIN], "push-up-progression")).toBe(CHAIN);
    });

    it("resolveProgressionChainExercises preskace null i nepronadjene korake, cuva redosled", () => {
      const resolved = resolveProgressionChainExercises(CHAIN, EXERCISES);
      expect(resolved).toEqual([PUSH_UP, ONE_ARM_PUSH_UP]);
    });
  });

  describe("skill lines", () => {
    const SKILL_LINE: SkillLine = {
      id: "skill-line-handstand",
      name: "Handstand",
      primaryMuscles: ["Shoulders"],
      description: "...",
      steps: [
        {
          id: "step-1",
          order: 1,
          name: "Wall Handstand",
          difficulty: "BEGINNER",
          equipment: ["WALL", "BODYWEIGHT"],
          holdTargetSeconds: 20,
          isSkillMastery: false,
        },
        {
          id: "step-2",
          order: 2,
          name: "Freestanding Handstand",
          difficulty: "INTERMEDIATE",
          equipment: ["BODYWEIGHT"],
          holdTargetSeconds: 30,
          isSkillMastery: false,
        },
        {
          id: "step-3",
          order: 3,
          name: "Handstand Push-Up",
          difficulty: "ADVANCED",
          equipment: ["BODYWEIGHT"],
          holdTargetSeconds: null,
          isSkillMastery: true,
        },
      ],
    };

    it("findSkillLine pronalazi liniju po id-ju", () => {
      expect(findSkillLine([SKILL_LINE], "skill-line-handstand")).toBe(SKILL_LINE);
    });

    it("firstSkillStep vraca prvi (najlaksi) korak", () => {
      expect(firstSkillStep(SKILL_LINE).id).toBe("step-1");
    });

    it("masterySkillStep vraca zavrsni korak", () => {
      expect(masterySkillStep(SKILL_LINE).id).toBe("step-3");
    });

    it("nextSkillStep vraca sledeci korak posle datog", () => {
      expect(nextSkillStep(SKILL_LINE, "step-1")?.id).toBe("step-2");
      expect(nextSkillStep(SKILL_LINE, "step-2")?.id).toBe("step-3");
    });

    it("nextSkillStep vraca null kada je dat vec mastery korak (linija zavrsena)", () => {
      expect(nextSkillStep(SKILL_LINE, "step-3")).toBeNull();
    });

    it("nextSkillStep vraca null za nepoznat currentStepId", () => {
      expect(nextSkillStep(SKILL_LINE, "ne-postoji")).toBeNull();
    });
  });
});

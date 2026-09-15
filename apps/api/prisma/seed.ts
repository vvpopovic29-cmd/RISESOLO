import { PrismaClient, type ExerciseType, type ExerciseDifficulty } from "@prisma/client";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Ucitava apps/api/prisma/seed-data/exercise-library.json u `exercises`
 * tabelu. Idempotentno preko `slug` (upsert) - bezbedno pokrenuti vise puta
 * (npr. posle regenerisanja JSON-a skriptom u seed-data/).
 */

interface SeedExercise {
  slug: string;
  name: string;
  category: string;
  subcategory: string | null;
  type: string;
  difficulty: string;
  equipment: string;
  movement_pattern: string;
  primary_muscles: string[];
  secondary_muscles: string[];
  instructions: string[];
  form_cues: string[];
  safety_notes: string[];
  default_prescription: {
    sets: number | null;
    reps: string | null;
    hold_seconds: number | null;
    rest_seconds: number | null;
  };
  progression: { chain: string; order: number } | null;
}

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const filePath = join(__dirname, "seed-data", "exercise-library.json");
  const raw = readFileSync(filePath, "utf-8");
  const exercises: SeedExercise[] = JSON.parse(raw);

  console.log(`Seed-ujem ${exercises.length} vezbi iz ${filePath}...`);

  let created = 0;
  let updated = 0;

  for (const ex of exercises) {
    const data = {
      name: ex.name,
      category: ex.category,
      subcategory: ex.subcategory,
      type: ex.type as ExerciseType,
      difficulty: ex.difficulty as ExerciseDifficulty,
      equipment: ex.equipment,
      movementPattern: ex.movement_pattern,
      primaryMuscles: ex.primary_muscles,
      secondaryMuscles: ex.secondary_muscles,
      instructions: ex.instructions,
      formCues: ex.form_cues,
      safetyNotes: ex.safety_notes,
      defaultSets: ex.default_prescription.sets,
      defaultReps: ex.default_prescription.reps,
      holdSeconds: ex.default_prescription.hold_seconds,
      restSeconds: ex.default_prescription.rest_seconds,
      progressionChain: ex.progression?.chain ?? null,
      progressionOrder: ex.progression?.order ?? null,
    };

    const result = await prisma.exercise.upsert({
      where: { slug: ex.slug },
      create: { slug: ex.slug, ...data },
      update: data,
    });

    if (result.createdAt.getTime() === result.updatedAt.getTime()) {
      created += 1;
    } else {
      updated += 1;
    }
  }

  console.log(`Gotovo. Kreirano: ${created}, azurirano: ${updated}.`);
}

main()
  .catch((error: unknown) => {
    console.error("Seed nije uspeo:", error);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });

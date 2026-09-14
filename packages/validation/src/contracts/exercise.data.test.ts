import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  filterExercisesByCategory,
  findExerciseById,
  resolveProgressionChainExercises,
} from "@risesolo/domain";

import {
  exerciseLibraryFileSchema,
  progressionChainFileSchema,
  skillLibraryFileSchema,
} from "./exercise";
import { mapExerciseDtoToDomain, mapProgressionChainDtoToDomain } from "../mappers/exercise.mapper";

/**
 * Ovo je jedini test koji stvarno cita data/exercises/*.json i proverava
 * da odgovara ugovoru definisanom u exercise.ts - "regression test" za
 * rucno/programski generisan dataset od ~240 vezbi (Faza 4). Ako neko
 * pokvari strukturu JSON-a, ovaj test to hvata pre nego sto stigne do
 * Supabase seed skripte ili mobilne app-ove.
 */
const DATA_DIR = join(__dirname, "../../../../data/exercises");

function readJson(fileName: string): unknown {
  return JSON.parse(readFileSync(join(DATA_DIR, fileName), "utf-8"));
}

describe("data/exercises/*.json ispunjava ugovor", () => {
  it("calisthenics-exercises.json je validan i count se poklapa sa duzinom niza", () => {
    const raw = readJson("calisthenics-exercises.json");
    const result = exerciseLibraryFileSchema.safeParse(raw);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.exercises.length).toBe(result.data.count);
      expect(result.data.exercises.every((e) => e.library === "CALISTHENICS")).toBe(true);
    }
  });

  it("gym-exercises.json je validan i count se poklapa sa duzinom niza", () => {
    const raw = readJson("gym-exercises.json");
    const result = exerciseLibraryFileSchema.safeParse(raw);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.exercises.length).toBe(result.data.count);
      expect(result.data.exercises.every((e) => e.library === "GYM")).toBe(true);
    }
  });

  it("calisthenics-skills.json je validan i count se poklapa sa duzinom niza", () => {
    const raw = readJson("calisthenics-skills.json");
    const result = skillLibraryFileSchema.safeParse(raw);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.skill_lines.length).toBe(result.data.count);
    }
  });

  it("progression-chains.json je validan", () => {
    const raw = readJson("progression-chains.json");
    const result = progressionChainFileSchema.safeParse(raw);
    expect(result.success).toBe(true);
  });

  it("svi exercise ID-jevi (calisthenics + gym) su jedinstveni", () => {
    const cal = exerciseLibraryFileSchema.parse(readJson("calisthenics-exercises.json"));
    const gym = exerciseLibraryFileSchema.parse(readJson("gym-exercises.json"));
    const allIds = [...cal.exercises, ...gym.exercises].map((e) => e.id);
    expect(new Set(allIds).size).toBe(allIds.length);
  });

  it("svi exercise slug-ovi (calisthenics + gym) su jedinstveni (DB kolona ima UNIQUE constraint)", () => {
    // Regresioni test za bag otkriven pri seedovanju Faze 2: slug je pravljen
    // samo iz imena, bez provere jedinstvenosti - isto ime vezbe (npr.
    // "Chin-Up", "Diamond Push-Up") se ponavlja u razlicitim kategorijama/
    // bibliotekama pa je slug (za razliku od id-ja) mogao da se duplira.
    const cal = exerciseLibraryFileSchema.parse(readJson("calisthenics-exercises.json"));
    const gym = exerciseLibraryFileSchema.parse(readJson("gym-exercises.json"));
    const allExercises = [...cal.exercises, ...gym.exercises];
    const allSlugs = allExercises.map((e) => e.slug);
    const duplicates = allSlugs.filter((slug, index) => allSlugs.indexOf(slug) !== index);
    expect(duplicates).toEqual([]);
    expect(new Set(allSlugs).size).toBe(allSlugs.length);
  });

  it("progression-chains.json referencira samo ID-jeve koji postoje u calisthenics-exercises.json", () => {
    const cal = exerciseLibraryFileSchema.parse(readJson("calisthenics-exercises.json"));
    const chains = progressionChainFileSchema.parse(readJson("progression-chains.json"));
    const validIds = new Set(cal.exercises.map((e) => e.id));
    for (const chain of chains.chains) {
      for (const stepId of chain.steps) {
        if (stepId !== null) {
          expect(validIds.has(stepId)).toBe(true);
        }
      }
    }
  });

  it("svaki skill line ima tacno jedan is_skill_mastery korak, i to poslednji", () => {
    const skills = skillLibraryFileSchema.parse(readJson("calisthenics-skills.json"));
    for (const line of skills.skill_lines) {
      const masteryIndexes = line.steps
        .map((step, index) => (step.is_skill_mastery ? index : -1))
        .filter((index) => index !== -1);
      expect(masteryIndexes).toEqual([line.steps.length - 1]);
    }
  });

  it("end-to-end: parse -> mapiranje u domain oblik -> domain query funkcije rade nad pravim podacima", () => {
    const cal = exerciseLibraryFileSchema.parse(readJson("calisthenics-exercises.json"));
    const chains = progressionChainFileSchema.parse(readJson("progression-chains.json"));

    const domainExercises = cal.exercises.map(mapExerciseDtoToDomain);
    const domainChains = chains.chains.map(mapProgressionChainDtoToDomain);

    const chestExercises = filterExercisesByCategory(domainExercises, "CHEST");
    expect(chestExercises.length).toBeGreaterThan(0);
    expect(chestExercises.every((e) => e.category === "CHEST")).toBe(true);

    const [firstChestExercise] = chestExercises;
    if (!firstChestExercise) throw new Error("chestExercises je neocekivano prazan");
    const found = findExerciseById(domainExercises, firstChestExercise.id);
    expect(found).toEqual(firstChestExercise);

    const pushUpChain = domainChains.find((c) => c.id === "push-up-progression");
    if (!pushUpChain) throw new Error("push-up-progression lanac nije pronadjen");
    const resolved = resolveProgressionChainExercises(pushUpChain, domainExercises);
    expect(resolved.length).toBeGreaterThan(0);
    expect(resolved.every((e) => e.category === "CHEST")).toBe(true);
  });
});

/**
 * Cisti query/filter helperi nad exercise library-jem (Faza 4 -
 * EXERCISE DATABASE). Operisu ISKLJUCIVO nad vec-mapiranim domain
 * objektima (Exercise[]/SkillLine[]/ProgressionChain[]) - ucitavanje i
 * mapiranje sirovog JSON-a (data/exercises/*.json, snake_case) u ove
 * tipove radi @risesolo/validation (runtime granica), da bi domain
 * paket ostao bez I/O i bez zavisnosti.
 */
import type {
  Equipment,
  Exercise,
  ExerciseCategory,
  ExerciseDifficulty,
  ProgressionChain,
  SkillLine,
  SkillStep,
} from "./exercise.types";

export function findExerciseById(exercises: readonly Exercise[], id: string): Exercise | undefined {
  return exercises.find((e) => e.id === id);
}

export function findExerciseBySlug(
  exercises: readonly Exercise[],
  slug: string,
): Exercise | undefined {
  return exercises.find((e) => e.slug === slug);
}

export function filterExercisesByCategory(
  exercises: readonly Exercise[],
  category: ExerciseCategory,
): Exercise[] {
  return exercises.filter((e) => e.category === category);
}

export function filterExercisesByDifficulty(
  exercises: readonly Exercise[],
  difficulty: ExerciseDifficulty,
): Exercise[] {
  return exercises.filter((e) => e.difficulty === difficulty);
}

/** Vraca vezbe koje se mogu izvesti sa ONIM sto korisnik ima (svaki equipment item vezbe mora biti dostupan). */
export function filterExercisesByAvailableEquipment(
  exercises: readonly Exercise[],
  availableEquipment: readonly Equipment[],
): Exercise[] {
  const available = new Set(availableEquipment);
  return exercises.filter((e) => e.equipment.every((item) => available.has(item)));
}

export function groupExercisesByCategory(
  exercises: readonly Exercise[],
): Record<ExerciseCategory, Exercise[]> {
  const groups = {} as Record<ExerciseCategory, Exercise[]>;
  for (const exercise of exercises) {
    const bucket = groups[exercise.category] ?? [];
    bucket.push(exercise);
    groups[exercise.category] = bucket;
  }
  return groups;
}

export function findSkillLine(skillLines: readonly SkillLine[], id: string): SkillLine | undefined {
  return skillLines.find((line) => line.id === id);
}

/** Prvi korak (najlaksa varijanta) u skill liniji. */
export function firstSkillStep(skillLine: SkillLine): SkillStep {
  const [first] = skillLine.steps;
  if (!first) {
    throw new Error(`Skill linija "${skillLine.id}" nema nijedan korak`);
  }
  return first;
}

/** Zavrsni (mastery) korak skill linije. */
export function masterySkillStep(skillLine: SkillLine): SkillStep {
  const step = skillLine.steps.find((s) => s.isSkillMastery);
  if (!step) {
    throw new Error(`Skill linija "${skillLine.id}" nema is_skill_mastery korak`);
  }
  return step;
}

/**
 * Sledeci korak posle datog u skill liniji - osnova za "System AI" koji
 * automatski predlaze sledeci skill na osnovu trenutnog nivoa korisnika.
 * Vraca null ako je currentStepId vec mastery korak (linija je zavrsena)
 * ili ako korak nije pronadjen.
 */
export function nextSkillStep(skillLine: SkillLine, currentStepId: string): SkillStep | null {
  const index = skillLine.steps.findIndex((s) => s.id === currentStepId);
  if (index === -1) return null;
  return skillLine.steps[index + 1] ?? null;
}

export function findProgressionChain(
  chains: readonly ProgressionChain[],
  id: string,
): ProgressionChain | undefined {
  return chains.find((chain) => chain.id === id);
}

/** Razresava ID-jeve iz progression chain-a u stvarne Exercise objekte (preskace null/nepronadjene korake). */
export function resolveProgressionChainExercises(
  chain: ProgressionChain,
  exercises: readonly Exercise[],
): Exercise[] {
  const byId = new Map(exercises.map((e) => [e.id, e] as const));
  return chain.steps
    .filter((id): id is string => id !== null)
    .map((id) => byId.get(id))
    .filter((e): e is Exercise => e !== undefined);
}

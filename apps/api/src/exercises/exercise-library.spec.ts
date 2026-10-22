import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Integritet seed biblioteke vezbi (prisma/seed-data/exercise-library.json) -
 * hvata greske pri regenerisanju/rucnom uredjivanju JSON-a PRE nego sto stignu
 * do `prisma db seed` (npr. dupli slug, prazna uputstva, hold vezba sa reps).
 * Cista unit provera, ne treba baza.
 */

interface LibraryExercise {
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

const library: LibraryExercise[] = JSON.parse(
  readFileSync(join(__dirname, "..", "..", "prisma", "seed-data", "exercise-library.json"), "utf-8"),
);

const TYPES = ["CALISTHENICS", "GYM", "SKILL"];
const DIFFICULTIES = ["BEGINNER", "INTERMEDIATE", "ADVANCED"];
const DIFFICULTY_RANK: Record<string, number> = { BEGINNER: 0, INTERMEDIATE: 1, ADVANCED: 2 };

const skillChains = new Map<string, LibraryExercise[]>();
for (const exercise of library) {
  if (exercise.progression?.chain.startsWith("skill-")) {
    skillChains.set(exercise.progression.chain, [...(skillChains.get(exercise.progression.chain) ?? []), exercise]);
  }
}

describe("exercise-library.json (seed integritet)", () => {
  it("sadrzi dovoljno vezbi za svaki tip", () => {
    expect(library.length).toBeGreaterThanOrEqual(200);
    for (const type of TYPES) {
      expect(library.filter((e) => e.type === type).length).toBeGreaterThan(0);
    }
  });

  it("slug je jedinstven, kebab-case i bez razmaka (seed upsert-uje po slug-u)", () => {
    const slugs = library.map((e) => e.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const slug of slugs) {
      expect(slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    }
  });

  it("type i difficulty su validne Prisma enum vrednosti", () => {
    for (const exercise of library) {
      expect(TYPES).toContain(exercise.type);
      expect(DIFFICULTIES).toContain(exercise.difficulty);
    }
  });

  it("obavezna tekstualna polja nisu prazna", () => {
    for (const exercise of library) {
      for (const field of ["name", "category", "equipment", "movement_pattern"] as const) {
        expect(exercise[field].trim()).not.toBe("");
      }
    }
  });

  it("svaka vezba ima misice, uputstva, form cue-ove i sigurnosne napomene bez praznih stavki", () => {
    for (const exercise of library) {
      for (const field of ["primary_muscles", "instructions", "form_cues", "safety_notes"] as const) {
        expect(exercise[field].length).toBeGreaterThan(0);
        expect(exercise[field].every((item) => item.trim() !== "")).toBe(true);
      }
      expect(Array.isArray(exercise.secondary_muscles)).toBe(true);
    }
  });

  it("SKILL vezbe su u SKILLS kategoriji i obrnuto", () => {
    for (const exercise of library) {
      expect(exercise.type === "SKILL").toBe(exercise.category === "SKILLS");
    }
  });

  describe("default_prescription", () => {
    it("je ili reps-bazirana (reps, bez hold) ili hold-bazirana (hold, bez reps) - nikad oba ni nijedna", () => {
      for (const { slug, default_prescription: p } of library) {
        const hasReps = p.reps !== null;
        const hasHold = p.hold_seconds !== null;
        expect({ slug, exactlyOne: hasReps !== hasHold }).toEqual({ slug, exactlyOne: true });
      }
    });

    it("sets i rest_seconds su pozitivni celi brojevi", () => {
      for (const { default_prescription: p } of library) {
        expect(Number.isInteger(p.sets)).toBe(true);
        expect(p.sets as number).toBeGreaterThan(0);
        expect(Number.isInteger(p.rest_seconds)).toBe(true);
        expect(p.rest_seconds as number).toBeGreaterThan(0);
      }
    });

    it("reps je broj ili opseg (npr. '10' ili '8-12') sa rastucim opsegom; hold_seconds je pozitivan ceo broj", () => {
      for (const { default_prescription: p } of library) {
        if (p.reps !== null) {
          expect(p.reps).toMatch(/^\d+(-\d+)?$/);
          const [min, max] = p.reps.split("-").map(Number);
          if (max !== undefined) expect(max).toBeGreaterThan(min as number);
        } else {
          expect(Number.isInteger(p.hold_seconds)).toBe(true);
          expect(p.hold_seconds as number).toBeGreaterThan(0);
        }
      }
    });
  });

  describe("progresije", () => {
    it("SKILL vezbe uvek pripadaju skill-* lancu, a skill-* lanac sadrzi samo SKILL vezbe", () => {
      for (const exercise of library) {
        const inSkillChain = exercise.progression?.chain.startsWith("skill-") ?? false;
        expect(inSkillChain).toBe(exercise.type === "SKILL");
      }
    });

    it("order je pozitivan ceo broj za svaku vezbu u lancu", () => {
      for (const exercise of library) {
        if (!exercise.progression) continue;
        expect(exercise.progression.chain.trim()).not.toBe("");
        expect(Number.isInteger(exercise.progression.order)).toBe(true);
        expect(exercise.progression.order).toBeGreaterThanOrEqual(1);
      }
    });

    it("skill lanci imaju uzastopne korake 1..N bez rupa i duplikata, a tezina ne opada", () => {
      expect(skillChains.size).toBeGreaterThan(0);
      for (const [chain, steps] of skillChains) {
        const sorted = [...steps].sort((a, b) => (a.progression?.order ?? 0) - (b.progression?.order ?? 0));
        expect({ chain, orders: sorted.map((s) => s.progression?.order) }).toEqual({
          chain,
          orders: sorted.map((_, index) => index + 1),
        });
        const ranks = sorted.map((s) => DIFFICULTY_RANK[s.difficulty] as number);
        expect({ chain, ranks }).toEqual({ chain, ranks: [...ranks].sort((a, b) => a - b) });
      }
    });

    it("svaki progresioni lanac ima bar 2 koraka", () => {
      const chains = new Map<string, LibraryExercise[]>();
      for (const exercise of library) {
        if (!exercise.progression) continue;
        chains.set(exercise.progression.chain, [...(chains.get(exercise.progression.chain) ?? []), exercise]);
      }
      for (const [chain, steps] of chains) {
        expect({ chain, steps: steps.length >= 2 }).toEqual({ chain, steps: true });
      }
    });
  });

  it("isti naziv se sme ponoviti samo izmedju razlicitih lanaca/tipova (nikad dva puta u istom lancu)", () => {
    const seen = new Set<string>();
    for (const exercise of library) {
      const key = `${exercise.progression?.chain ?? exercise.slug}::${exercise.name}`;
      expect({ key, duplicate: seen.has(key) }).toEqual({ key, duplicate: false });
      seen.add(key);
    }
  });
});

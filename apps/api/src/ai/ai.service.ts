import { Injectable, Logger, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Anthropic from "@anthropic-ai/sdk";
import {
  aiItemFlavorSchema,
  aiQuestFlavorSchema,
  aiTrainingPlanSchema,
  formatZodError,
  type AiItemFlavorOutput,
  type AiQuestFlavorOutput,
  type AiTrainingPlanOutput,
} from "@risesolo/validation";
import type { CandidateExercise, PlayerStats } from "@risesolo/domain";
import type { ApiEnv } from "../config/env";

const MODEL = "claude-sonnet-5";
const MAX_TOKENS = 4096;
const TOOL_NAME = "return_training_plan";
const QUEST_FLAVOR_MAX_TOKENS = 1024;
const QUEST_FLAVOR_TOOL_NAME = "return_quest_flavor";
const ITEM_FLAVOR_MAX_TOKENS = 1024;
const ITEM_FLAVOR_TOOL_NAME = "return_item_flavor";

export interface GenerateTrainingPlanPrompt {
  daysPerWeek: number;
  goal?: string;
  trainingType: string | null;
  experienceLevel: string | null;
  candidates: readonly CandidateExercise[];
}

export interface GenerateQuestFlavorPrompt {
  level: number;
  rank: string;
  stats: PlayerStats;
  currentStreak: number;
}

export interface GenerateItemFlavorPrompt {
  level: number;
  rank: string;
  stats: PlayerStats;
  currentStreak: number;
  /** Nivo prag koji je igrac upravo dostigao i otkljucao ovaj predmet (vidi @risesolo/domain AiItemDefinition.levelRequirement). */
  levelRequirement: number;
}

/**
 * Tanak wrapper oko Anthropic SDK-a. Namerno ne zna nista o Prisma/DB - prima
 * kandidat vezbe i vraca validiran plan (packages/validation/contracts/training).
 * `ANTHROPIC_API_KEY` je opcion (vidi src/config/env.ts) - bez njega servis
 * baca 503 umesto da obori ceo API (Faza 2 feature, placeholder-friendly).
 */
@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly client: Anthropic | null;

  constructor(configService: ConfigService<ApiEnv, true>) {
    const apiKey = configService.get("ANTHROPIC_API_KEY", { infer: true });
    this.client = apiKey ? new Anthropic({ apiKey }) : null;
  }

  get isConfigured(): boolean {
    return this.client !== null;
  }

  get model(): string {
    return MODEL;
  }

  async generateTrainingPlan(prompt: GenerateTrainingPlanPrompt): Promise<AiTrainingPlanOutput> {
    if (!this.client) {
      throw new ServiceUnavailableException(
        "AI trening planovi trenutno nisu dostupni (ANTHROPIC_API_KEY nije podesen).",
      );
    }

    let response: Anthropic.Messages.Message;
    try {
      response = await this.client.messages.create({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system: buildSystemPrompt(),
        messages: [{ role: "user", content: buildUserPrompt(prompt) }],
        tools: [trainingPlanTool],
        tool_choice: { type: "tool", name: TOOL_NAME },
      });
    } catch (error) {
      this.logger.error("Poziv Claude API-ja neuspesan", error instanceof Error ? error.stack : error);
      throw new ServiceUnavailableException("Generisanje trening plana trenutno nije uspelo, pokusaj ponovo.");
    }

    const toolUse = response.content.find(
      (block): block is Anthropic.Messages.ToolUseBlock => block.type === "tool_use" && block.name === TOOL_NAME,
    );
    if (!toolUse) {
      this.logger.error(`Claude odgovor ne sadrzi "${TOOL_NAME}" tool_use blok`);
      throw new ServiceUnavailableException("AI model nije vratio ocekivan format odgovora.");
    }

    const parsed = aiTrainingPlanSchema.safeParse(toolUse.input);
    if (!parsed.success) {
      this.logger.error(`Neispravan AI izlaz:\n${formatZodError(parsed.error)}`);
      throw new ServiceUnavailableException("AI model je vratio neispravan plan, pokusaj ponovo.");
    }

    return parsed.data;
  }

  /**
   * AI Quest (vidi apps/api/src/quests) - kratak, personalizovan title/
   * description za bonus quest, NE trening plan. Namerno ODVOJEN alat
   * ("return_quest_flavor") od trening plana - manji izlaz, drugaciji
   * prompt, ali isti obrazac gresaka (503 umesto pucanja aplikacije).
   */
  async generateQuestFlavor(prompt: GenerateQuestFlavorPrompt): Promise<AiQuestFlavorOutput> {
    if (!this.client) {
      throw new ServiceUnavailableException("AI questovi trenutno nisu dostupni (ANTHROPIC_API_KEY nije podesen).");
    }

    let response: Anthropic.Messages.Message;
    try {
      response = await this.client.messages.create({
        model: MODEL,
        max_tokens: QUEST_FLAVOR_MAX_TOKENS,
        system: buildQuestFlavorSystemPrompt(),
        messages: [{ role: "user", content: buildQuestFlavorUserPrompt(prompt) }],
        tools: [questFlavorTool],
        tool_choice: { type: "tool", name: QUEST_FLAVOR_TOOL_NAME },
      });
    } catch (error) {
      this.logger.error("Poziv Claude API-ja neuspesan (quest flavor)", error instanceof Error ? error.stack : error);
      throw new ServiceUnavailableException("Generisanje AI questa trenutno nije uspelo, pokusaj ponovo.");
    }

    const toolUse = response.content.find(
      (block): block is Anthropic.Messages.ToolUseBlock => block.type === "tool_use" && block.name === QUEST_FLAVOR_TOOL_NAME,
    );
    if (!toolUse) {
      this.logger.error(`Claude odgovor ne sadrzi "${QUEST_FLAVOR_TOOL_NAME}" tool_use blok`);
      throw new ServiceUnavailableException("AI model nije vratio ocekivan format odgovora.");
    }

    const parsed = aiQuestFlavorSchema.safeParse(toolUse.input);
    if (!parsed.success) {
      this.logger.error(`Neispravan AI quest flavor izlaz:\n${formatZodError(parsed.error)}`);
      throw new ServiceUnavailableException("AI model je vratio neispravan quest, pokusaj ponovo.");
    }

    return parsed.data;
  }

  /**
   * AI-Generated Inventory Item (vidi @risesolo/domain ai-item.ts) - kratak
   * personalizovan naziv/opis "trofeja" za nivo koji je igrac upravo
   * dostigao. Isti obrazac kao generateQuestFlavor (odvojen alat, manji
   * izlaz), ali tekst se OVDE MORA perzistirati na InventoryItem redu
   * (generatedName/generatedDescription) - za razliku od quest flavora koji
   * se cuva na Quest redu koji vec ima title/description kolone.
   */
  async generateItemFlavor(prompt: GenerateItemFlavorPrompt): Promise<AiItemFlavorOutput> {
    if (!this.client) {
      throw new ServiceUnavailableException("AI predmeti trenutno nisu dostupni (ANTHROPIC_API_KEY nije podesen).");
    }

    let response: Anthropic.Messages.Message;
    try {
      response = await this.client.messages.create({
        model: MODEL,
        max_tokens: ITEM_FLAVOR_MAX_TOKENS,
        system: buildItemFlavorSystemPrompt(),
        messages: [{ role: "user", content: buildItemFlavorUserPrompt(prompt) }],
        tools: [itemFlavorTool],
        tool_choice: { type: "tool", name: ITEM_FLAVOR_TOOL_NAME },
      });
    } catch (error) {
      this.logger.error("Poziv Claude API-ja neuspesan (item flavor)", error instanceof Error ? error.stack : error);
      throw new ServiceUnavailableException("Generisanje AI predmeta trenutno nije uspelo, pokusaj ponovo.");
    }

    const toolUse = response.content.find(
      (block): block is Anthropic.Messages.ToolUseBlock => block.type === "tool_use" && block.name === ITEM_FLAVOR_TOOL_NAME,
    );
    if (!toolUse) {
      this.logger.error(`Claude odgovor ne sadrzi "${ITEM_FLAVOR_TOOL_NAME}" tool_use blok`);
      throw new ServiceUnavailableException("AI model nije vratio ocekivan format odgovora.");
    }

    const parsed = aiItemFlavorSchema.safeParse(toolUse.input);
    if (!parsed.success) {
      this.logger.error(`Neispravan AI item flavor izlaz:\n${formatZodError(parsed.error)}`);
      throw new ServiceUnavailableException("AI model je vratio neispravan predmet, pokusaj ponovo.");
    }

    return parsed.data;
  }
}

function buildSystemPrompt(): string {
  return [
    "Ti si trener u RISESOLO, gamifikovanoj fitnes aplikaciji.",
    "Sastavljas nedeljni trening plan iskljucivo od vezbi koje su ti date u listi kandidata - nikad ne izmisljaj slug koji nije na listi.",
    `Odgovor MORAS vratiti pozivom alata "${TOOL_NAME}".`,
    "Plan treba da bude balansiran po grupama misica preko nedelje i realan za navedeni nivo iskustva.",
  ].join(" ");
}

function buildUserPrompt(prompt: GenerateTrainingPlanPrompt): string {
  const lines = [
    `Broj treninga nedeljno: ${prompt.daysPerWeek}`,
    `Tip treninga: ${prompt.trainingType ?? "bez preferencije (calisthenics ili gym)"}`,
    `Nivo iskustva: ${prompt.experienceLevel ?? "nije naveden"}`,
  ];
  if (prompt.goal) {
    lines.push(`Cilj igraca: ${prompt.goal}`);
  }
  lines.push("", "Dostupne vezbe (slug | naziv | kategorija | tip | tezina | pokret):");
  for (const exercise of prompt.candidates) {
    lines.push(
      `- ${exercise.slug} | ${exercise.name} | ${exercise.category} | ${exercise.type} | ${exercise.difficulty} | ${exercise.movementPattern}`,
    );
  }
  return lines.join("\n");
}

const trainingPlanTool: Anthropic.Messages.Tool = {
  name: TOOL_NAME,
  description: "Vraca strukturirani nedeljni trening plan sastavljen od datih kandidat vezbi.",
  input_schema: {
    type: "object",
    properties: {
      title: { type: "string", description: "Kratak naziv plana." },
      summary: { type: "string", description: "Jedna do dve recenice - opis pristupa/fokusa plana." },
      days: {
        type: "array",
        minItems: 1,
        maxItems: 7,
        items: {
          type: "object",
          properties: {
            day: { type: "integer", minimum: 1, maximum: 7, description: "Redni broj dana treninga (1-7)." },
            focus: { type: "string", description: "npr. 'Grudi i triceps', 'Full body'." },
            exercises: {
              type: "array",
              minItems: 1,
              maxItems: 12,
              items: {
                type: "object",
                properties: {
                  exerciseSlug: { type: "string", description: "Slug TACNO kao u listi kandidata." },
                  sets: { type: "integer", minimum: 1, maximum: 10 },
                  reps: { type: "string", description: "npr. '8-12' ili '30s hold'." },
                  restSeconds: { type: "integer", minimum: 0, maximum: 600 },
                  notes: { type: "string" },
                },
                required: ["exerciseSlug", "sets", "reps"],
              },
            },
          },
          required: ["day", "focus", "exercises"],
        },
      },
    },
    required: ["title", "days"],
  },
};

function buildQuestFlavorSystemPrompt(): string {
  return [
    "Ti si trener u RISESOLO, gamifikovanoj fitnes aplikaciji.",
    "Sastavljas kratak, motivacioni naslov i opis za bonus quest namenjen bas ovom igracu.",
    `Odgovor MORAS vratiti pozivom alata "${QUEST_FLAVOR_TOOL_NAME}".`,
    "Naslov je kratak (do par reci), opis je jedna do dve recenice koje pominju igracevo trenutno stanje (nivo/rang/streak/najslabiji stat) i podsticu ga da danas zavrsi trening.",
    "Nikad ne obecavaj konkretan broj setova/ponavljanja - quest se zavrsava bilo kojim zavrsenim treningom danas.",
  ].join(" ");
}

function buildQuestFlavorUserPrompt(prompt: GenerateQuestFlavorPrompt): string {
  const weakestStat = Object.entries(prompt.stats).reduce((weakest, [key, value]) =>
    value < weakest[1] ? [key, value] : weakest,
  );
  return [
    `Nivo: ${prompt.level}`,
    `Rang: ${prompt.rank}`,
    `Trenutni niz dana (streak): ${prompt.currentStreak}`,
    `Stat-ovi: snaga=${prompt.stats.strength}, agilnost=${prompt.stats.agility}, izdrzljivost=${prompt.stats.endurance}, vitalnost=${prompt.stats.vitality}, inteligencija=${prompt.stats.intelligence}`,
    `Najslabiji stat: ${weakestStat[0]}`,
  ].join("\n");
}

const questFlavorTool: Anthropic.Messages.Tool = {
  name: QUEST_FLAVOR_TOOL_NAME,
  description: "Vraca personalizovan naslov i opis za bonus quest namenjen ovom igracu.",
  input_schema: {
    type: "object",
    properties: {
      title: { type: "string", description: "Kratak, motivacioni naslov questa (do par reci)." },
      description: { type: "string", description: "Jedna do dve recenice - personalizovana poruka igracu." },
    },
    required: ["title", "description"],
  },
};

function buildItemFlavorSystemPrompt(): string {
  return [
    "Ti si trener u RISESOLO, gamifikovanoj fitnes aplikaciji.",
    "Igrac je upravo dostigao nov nivo i time otkljucao redak, personalizovan kolekcionarski predmet (trofej) u svom Inventory-ju.",
    "Sastavljas kratak, jedinstven naziv i opis tog trofeja, bas za ovog igraca.",
    `Odgovor MORAS vratiti pozivom alata "${ITEM_FLAVOR_TOOL_NAME}".`,
    "Naziv je kratak (do par reci, kao naziv predmeta u igri), opis je jedna do dve recenice koje slave upravo dostignuti nivo i pominju igracevo trenutno stanje (rang/streak/najjaci stat).",
    "Nikad ne pominji konkretne brojeve setova/ponavljanja/nagrade - ovo je kolekcionarski trofej, ne novi zadatak.",
  ].join(" ");
}

function buildItemFlavorUserPrompt(prompt: GenerateItemFlavorPrompt): string {
  const strongestStat = Object.entries(prompt.stats).reduce((strongest, [key, value]) =>
    value > strongest[1] ? [key, value] : strongest,
  );
  return [
    `Upravo dostignut nivo: ${prompt.levelRequirement}`,
    `Trenutni nivo: ${prompt.level}`,
    `Rang: ${prompt.rank}`,
    `Trenutni niz dana (streak): ${prompt.currentStreak}`,
    `Stat-ovi: snaga=${prompt.stats.strength}, agilnost=${prompt.stats.agility}, izdrzljivost=${prompt.stats.endurance}, vitalnost=${prompt.stats.vitality}, inteligencija=${prompt.stats.intelligence}`,
    `Najjaci stat: ${strongestStat[0]}`,
  ].join("\n");
}

const itemFlavorTool: Anthropic.Messages.Tool = {
  name: ITEM_FLAVOR_TOOL_NAME,
  description: "Vraca personalizovan naziv i opis kolekcionarskog trofeja namenjenog ovom igracu.",
  input_schema: {
    type: "object",
    properties: {
      name: { type: "string", description: "Kratak, jedinstven naziv trofeja (do par reci)." },
      description: { type: "string", description: "Jedna do dve recenice - personalizovan opis trofeja." },
    },
    required: ["name", "description"],
  },
};

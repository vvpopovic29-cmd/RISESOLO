import { Injectable, Logger, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Anthropic from "@anthropic-ai/sdk";
import { aiTrainingPlanSchema, formatZodError, type AiTrainingPlanOutput } from "@risesolo/validation";
import type { CandidateExercise } from "@risesolo/domain";
import type { ApiEnv } from "../config/env";

const MODEL = "claude-sonnet-5";
const MAX_TOKENS = 4096;
const TOOL_NAME = "return_training_plan";

export interface GenerateTrainingPlanPrompt {
  daysPerWeek: number;
  goal?: string;
  trainingType: string | null;
  experienceLevel: string | null;
  candidates: readonly CandidateExercise[];
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

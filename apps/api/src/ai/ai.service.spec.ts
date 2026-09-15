import { ServiceUnavailableException } from "@nestjs/common";
import type { ConfigService } from "@nestjs/config";
import type { ApiEnv } from "../config/env";
import { AiService } from "./ai.service";

const mockCreate = jest.fn();

jest.mock("@anthropic-ai/sdk", () => jest.fn().mockImplementation(() => ({ messages: { create: mockCreate } })));

function makeConfigService(apiKey: string | undefined): ConfigService<ApiEnv, true> {
  return { get: () => apiKey } as unknown as ConfigService<ApiEnv, true>;
}

const basePrompt = {
  daysPerWeek: 3,
  trainingType: null,
  experienceLevel: null,
  candidates: [],
};

describe("AiService", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("nije 'configured' i baca 503 bez poziva Anthropic-a kada ANTHROPIC_API_KEY nije podesen", async () => {
    const service = new AiService(makeConfigService(undefined));
    expect(service.isConfigured).toBe(false);

    await expect(service.generateTrainingPlan(basePrompt)).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("parsira validan tool_use odgovor u AiTrainingPlanOutput", async () => {
    mockCreate.mockResolvedValue({
      content: [
        {
          type: "tool_use",
          name: "return_training_plan",
          input: {
            title: "Full body 3x nedeljno",
            summary: "Balansiran plan za pocetnike.",
            days: [
              {
                day: 1,
                focus: "Full body",
                exercises: [{ exerciseSlug: "chest-wall-push-up", sets: 3, reps: "8-12" }],
              },
            ],
          },
        },
      ],
    });

    const service = new AiService(makeConfigService("test-key"));
    expect(service.isConfigured).toBe(true);

    const result = await service.generateTrainingPlan({
      ...basePrompt,
      candidates: [
        {
          slug: "chest-wall-push-up",
          name: "Wall Push-Up",
          category: "CHEST",
          type: "CALISTHENICS",
          difficulty: "BEGINNER",
          movementPattern: "push",
        },
      ],
    });

    expect(result.title).toBe("Full body 3x nedeljno");
    expect(result.days).toHaveLength(1);
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        tool_choice: { type: "tool", name: "return_training_plan" },
      }),
    );
  });

  it("baca 503 ako AI odgovor ne sadrzi tool_use blok", async () => {
    mockCreate.mockResolvedValue({ content: [{ type: "text", text: "izvini, ne mogu" }] });

    const service = new AiService(makeConfigService("test-key"));
    await expect(service.generateTrainingPlan(basePrompt)).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it("baca 503 ako AI izlaz ne prolazi Zod semu (npr. nedostaje 'days')", async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: "tool_use", name: "return_training_plan", input: { title: "x" } }],
    });

    const service = new AiService(makeConfigService("test-key"));
    await expect(service.generateTrainingPlan(basePrompt)).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it("baca 503 ako Anthropic SDK poziv izbaci gresku", async () => {
    mockCreate.mockRejectedValue(new Error("network error"));

    const service = new AiService(makeConfigService("test-key"));
    await expect(service.generateTrainingPlan(basePrompt)).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});

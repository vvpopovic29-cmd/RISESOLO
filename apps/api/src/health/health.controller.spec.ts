import { Test, type TestingModule } from "@nestjs/testing";
import { healthResponseSchema } from "@risesolo/validation";
import { HealthController } from "./health.controller";

describe("HealthController", () => {
  let controller: HealthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
    }).compile();

    controller = module.get(HealthController);
  });

  it("vraca odgovor koji zadovoljava deljenu health-check semu", () => {
    const result = controller.check();
    expect(() => healthResponseSchema.parse(result)).not.toThrow();
    expect(result.status).toBe("ok");
  });

  it("uptimeSeconds je nenegativan broj", () => {
    const result = controller.check();
    expect(result.uptimeSeconds).toBeGreaterThanOrEqual(0);
  });
});

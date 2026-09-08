import { Controller, Get } from "@nestjs/common";
import type { HealthResponse } from "@risesolo/validation";

@Controller("health")
export class HealthController {
  @Get()
  check(): HealthResponse {
    return {
      status: "ok",
      uptimeSeconds: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  }
}

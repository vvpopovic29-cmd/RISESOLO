import { NestFactory } from "@nestjs/core";
import { ConfigService } from "@nestjs/config";
import { AppModule } from "./app.module";
import type { ApiEnv } from "./config/env";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService<ApiEnv, true>);

  app.enableCors();

  const port = configService.get("PORT", { infer: true });
  await app.listen(port);
  console.log(`RISESOLO API osluškuje na portu ${port}`);
}

void bootstrap();

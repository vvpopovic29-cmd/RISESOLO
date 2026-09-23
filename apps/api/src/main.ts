import helmet from "helmet";
import { HttpAdapterHost, NestFactory } from "@nestjs/core";
import { ConfigService } from "@nestjs/config";
import { SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "./app.module";
import { resolveCorsOrigin } from "./common/cors";
import { SentryExceptionFilter } from "./common/filters/sentry-exception.filter";
import { initSentry } from "./common/sentry";
import type { ApiEnv } from "./config/env";
import { buildOpenApiDocument } from "./openapi/document";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService<ApiEnv, true>);

  initSentry(configService.get("SENTRY_DSN", { infer: true }), configService.get("NODE_ENV", { infer: true }));
  app.useGlobalFilters(new SentryExceptionFilter(app.get(HttpAdapterHost).httpAdapter));

  app.use(helmet());
  app.enableCors({ origin: resolveCorsOrigin(configService.get("CORS_ORIGIN", { infer: true })) });

  // Swagger UI otkriva ceo API contract (uklj. ANTHROPIC_API_KEY/RevenueCat gate-ovane
  // rute) - namerno dostupan van produkcije, da ne širi attack surface na live serveru.
  if (configService.get("NODE_ENV", { infer: true }) !== "production") {
    SwaggerModule.setup("docs", app, buildOpenApiDocument());
  }

  const port = configService.get("PORT", { infer: true });
  await app.listen(port);
  console.log(`RISESOLO API osluškuje na portu ${port}`);
}

void bootstrap();

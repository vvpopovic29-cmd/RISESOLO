import { HttpAdapterHost, NestFactory } from "@nestjs/core";
import { ConfigService } from "@nestjs/config";
import { AppModule } from "./app.module";
import { SentryExceptionFilter } from "./common/filters/sentry-exception.filter";
import { initSentry } from "./common/sentry";
import type { ApiEnv } from "./config/env";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService<ApiEnv, true>);

  initSentry(configService.get("SENTRY_DSN", { infer: true }), configService.get("NODE_ENV", { infer: true }));
  app.useGlobalFilters(new SentryExceptionFilter(app.get(HttpAdapterHost).httpAdapter));

  app.enableCors();

  const port = configService.get("PORT", { infer: true });
  await app.listen(port);
  console.log(`RISESOLO API osluškuje na portu ${port}`);
}

void bootstrap();

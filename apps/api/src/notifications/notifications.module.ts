import { BullModule } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { isTestEnvironment } from "../common/throttle";
import { NotificationsController } from "./notifications.controller";
import { NotificationsService } from "./notifications.service";
import { PushNotificationsProcessor } from "./push-notifications.processor";
import { PUSH_NOTIFICATIONS_QUEUE } from "./push-notifications.queue";

/**
 * `@Processor` (WorkerHost) pokrece STVARAN BullMQ worker sa blokirajucom
 * Redis konekcijom cim NestJS instancira provider - u e2e paketu SVAKI od
 * 31 test fajla podize ceo AppModule (Test.createTestingModule + app.init),
 * pa bi svaki od njih otvorio sopstveni live worker protiv istog Redis
 * kontejnera. Lokalno to prolazi (mala konkurentnost), ali na CI-u (vise
 * paralelnih Jest worker-a, ogranicen runner) je izazivalo test paket da
 * visi desetinama minuta bez ikakve greske - vidi common/throttle.ts za
 * isti "u testovima pojednostavi infra" princip (TEST_THROTTLE_LIMIT).
 * Red (`BullModule.registerQueue`) ostaje registrovan u testovima - samo
 * aktivni worker se preskace, `NotificationsService.pushQueue.add()` i dalje
 * radi normalno protiv pravog Redis-a.
 */
@Module({
  imports: [
    AuthModule,
    BullModule.registerQueue({
      name: PUSH_NOTIFICATIONS_QUEUE,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: "exponential", delay: 2000 },
        removeOnComplete: true,
        removeOnFail: 100,
      },
    }),
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService, ...(isTestEnvironment() ? [] : [PushNotificationsProcessor])],
  exports: [NotificationsService],
})
export class NotificationsModule {}

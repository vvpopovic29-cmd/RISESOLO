import { BullModule } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { NotificationsController } from "./notifications.controller";
import { NotificationsService } from "./notifications.service";
import { PushNotificationsProcessor } from "./push-notifications.processor";
import { PUSH_NOTIFICATIONS_QUEUE } from "./push-notifications.queue";

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
  providers: [NotificationsService, PushNotificationsProcessor],
  exports: [NotificationsService],
})
export class NotificationsModule {}

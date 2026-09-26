import { OnWorkerEvent, Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import type { Job } from "bullmq";
import type { ExpoPushMessage } from "./push-notifications.queue";
import { PUSH_NOTIFICATIONS_QUEUE } from "./push-notifications.queue";

const EXPO_PUSH_API_URL = "https://exp.host/--/api/v2/push/send";

/**
 * BullMQ radnik koji stvarno salje Expo push poruke - vidi
 * NotificationsService.sendExpoPush koji samo stavlja job u red. Za razliku
 * od stare fire-and-forget implementacije, ovde se greska NAMERNO baca dalje
 * (ne guta) da bi BullMQ ponovio pokusaj (retry/backoff podeseni u
 * NotificationsModule preko `defaultJobOptions`) - `onFailed` samo loguje
 * upozorenje POSLE poslednjeg neuspelog pokusaja, ne obara worker proces.
 */
@Processor(PUSH_NOTIFICATIONS_QUEUE)
export class PushNotificationsProcessor extends WorkerHost {
  private readonly logger = new Logger(PushNotificationsProcessor.name);

  async process(job: Job<ExpoPushMessage[]>): Promise<void> {
    const response = await fetch(EXPO_PUSH_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(job.data),
    });
    if (!response.ok) {
      throw new Error(`Expo push API vratio status ${response.status}`);
    }
  }

  @OnWorkerEvent("failed")
  onFailed(job: Job<ExpoPushMessage[]> | undefined, error: Error): void {
    if (!job || job.attemptsMade < (job.opts.attempts ?? 1)) {
      return;
    }
    this.logger.warn(`Slanje push notifikacije nije uspelo nakon svih pokusaja: ${error.message}`);
  }
}

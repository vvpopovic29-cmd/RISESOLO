import { InjectQueue } from "@nestjs/bullmq";
import { Injectable, Logger } from "@nestjs/common";
import type { RegisterPushTokenRequest } from "@risesolo/validation";
import type { Queue } from "bullmq";
import { PrismaService } from "../prisma/prisma.service";
import type { ExpoPushMessage } from "./push-notifications.queue";
import { PUSH_NOTIFICATIONS_QUEUE } from "./push-notifications.queue";

export interface PushNotificationContent {
  title: string;
  body: string;
  /** Opciono - mobile klijent koristi ovo da odluci gde da navigira na tap (vidi apps/mobile/src/notifications). */
  data?: Record<string, string>;
}

/**
 * Push notifikacije preko Expo push servisa (https://exp.host) - besplatan,
 * ne zahteva sopstvene FCM/APNs kredencijale za slanje (EAS upravlja tim
 * delom kada se pravi standalone build - vidi README "Push Notifications").
 * Stvarno slanje je izmesteno u BullMQ red (vidi
 * push-notifications.processor.ts) - ovaj servis samo stavlja poruke u red,
 * sto omogucava automatski retry pri privremenom Expo/mreznom kvaru.
 *
 * Namerno best-effort na nivou stavljanja u red: pozivaoci koriste
 * `.catch(() => undefined)` i zovu OVO POSLE glavne transakcije, nikad
 * unutar nje (poziv ka Redis-u unutar `$transaction` bi drzao konekciju
 * otvorenu bez potrebe i ne sme da izazove rollback XP-a).
 */
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(PUSH_NOTIFICATIONS_QUEUE) private readonly pushQueue: Queue<ExpoPushMessage[]>,
  ) {}

  /**
   * `token` je globalno unique (jedan fizicki uredjaj) - `upsert` prebacuje
   * vlasnistvo na trenutnog korisnika ako se neko drugi ranije ulogovao na
   * istom uredjaju (deljeni telefon, prodat/resetovan uredjaj i sl.).
   */
  async registerToken(userId: string, dto: RegisterPushTokenRequest): Promise<void> {
    await this.prisma.pushToken.upsert({
      where: { token: dto.token },
      create: { userId, token: dto.token, platform: dto.platform },
      update: { userId, platform: dto.platform },
    });
  }

  /** Ownership provera preko `userId` u WHERE - korisnik ne moze obrisati tudji token. */
  async unregisterToken(userId: string, token: string): Promise<void> {
    await this.prisma.pushToken.deleteMany({ where: { userId, token } });
  }

  async sendToUser(userId: string, notification: PushNotificationContent): Promise<void> {
    await this.sendToUsers([userId], notification);
  }

  async sendToUsers(userIds: string[], notification: PushNotificationContent): Promise<void> {
    if (userIds.length === 0) {
      return;
    }
    const tokens = await this.prisma.pushToken.findMany({
      where: { userId: { in: userIds } },
      select: { token: true },
    });
    if (tokens.length === 0) {
      return;
    }
    await this.sendExpoPush(tokens.map((row) => ({ to: row.token, ...notification })));
  }

  private async sendExpoPush(messages: ExpoPushMessage[]): Promise<void> {
    try {
      await this.pushQueue.add("send", messages);
    } catch (error) {
      this.logger.warn(`Stavljanje push notifikacije u red nije uspelo: ${error instanceof Error ? error.message : error}`);
    }
  }
}

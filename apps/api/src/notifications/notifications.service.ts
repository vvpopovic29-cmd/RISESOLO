import { Injectable, Logger } from "@nestjs/common";
import type { RegisterPushTokenRequest } from "@risesolo/validation";
import { PrismaService } from "../prisma/prisma.service";

const EXPO_PUSH_API_URL = "https://exp.host/--/api/v2/push/send";

export interface PushNotificationContent {
  title: string;
  body: string;
  /** Opciono - mobile klijent koristi ovo da odluci gde da navigira na tap (vidi apps/mobile/src/notifications). */
  data?: Record<string, string>;
}

interface ExpoPushMessage extends PushNotificationContent {
  to: string;
}

/**
 * Push notifikacije preko Expo push servisa (https://exp.host) - besplatan,
 * ne zahteva sopstvene FCM/APNs kredencijale za slanje (EAS upravlja tim
 * delom kada se pravi standalone build - vidi README "Push Notifications").
 *
 * Namerno best-effort: mrezni poziv ka Expo-u NIKAD ne sme da obori
 * glavni request (npr. zavrsetak treninga) - pozivaoci koriste
 * `.catch(() => undefined)` i zovu OVO POSLE glavne transakcije, nikad
 * unutar nje (spoljni mrezni poziv unutar `$transaction` bi drzao
 * konekciju otvorenu bez potrebe i ne sme da izazove rollback XP-a).
 */
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly prisma: PrismaService) {}

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
      await fetch(EXPO_PUSH_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(messages),
      });
    } catch (error) {
      this.logger.warn(`Slanje push notifikacije nije uspelo: ${error instanceof Error ? error.message : error}`);
    }
  }
}

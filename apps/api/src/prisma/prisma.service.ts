import type { OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { Injectable, Logger } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";

/**
 * Jedina tacka pristupa bazi. Svi servisi koji citaju/pisu podatke prime
 * ovaj servis kroz DI umesto da sami instanciraju `PrismaClient` - to drzi
 * konekciju kao singleton i omogucava mockovanje u testovima.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit(): Promise<void> {
    await this.$connect();
    this.logger.log("Prisma konekcija uspostavljena");
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}

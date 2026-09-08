import { Injectable, type OnModuleDestroy, type OnModuleInit } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";

/**
 * Tanka obavijena oko generisanog Prisma klijenta - povezuje se pri
 * pokretanju modula i zatvara konekciju pri gasenju (fail-fast +
 * cist shutdown, u skladu sa ostatkom bootstrap-a u main.ts).
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}

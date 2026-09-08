import { Global, Module } from "@nestjs/common";
import { PrismaService } from "./prisma.service";

/**
 * Global modul - PrismaService je dostupan svim feature modulima bez
 * eksplicitnog importa (isti obrazac kao ConfigModule.forRoot({isGlobal}}).
 */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}

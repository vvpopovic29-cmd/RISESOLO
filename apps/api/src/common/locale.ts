import { DEFAULT_LOCALE, isLocale, type Locale } from "@risesolo/domain";
import type { Prisma } from "@prisma/client";
import type { PrismaService } from "../prisma/prisma.service";

type Db = PrismaService | Prisma.TransactionClient;

/**
 * Cita korisnikov jezik iz Profile.locale (postavlja se pri onboardingu ili
 * u Settings ekranu - vidi PlayersService.updateLocale). Podrazumeva
 * DEFAULT_LOCALE ako profil jos ne postoji (npr. poziv izmedju registracije
 * i onboardinga) ili sadrzi nevalidnu vrednost (odbrana od rucne izmene baze).
 */
export async function resolveLocale(db: Db, userId: string): Promise<Locale> {
  const profile = await db.profile.findUnique({ where: { userId }, select: { locale: true } });
  return isLocale(profile?.locale) ? profile.locale : DEFAULT_LOCALE;
}

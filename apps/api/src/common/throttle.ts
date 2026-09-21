/**
 * Rate limiting je bezbednosna mera (brute-force/spam zastita), ne poslovno
 * pravilo - zato limiti u testovima (NODE_ENV=test, automatski postavljeno
 * od strane Jest-a osim ako je vec eksplicitno drugacije) moraju biti
 * prakticno neograniceni. e2e paket pravi stotine zahteva (npr. registraciju
 * korisnika) u kratkom vremenskom prozoru u okviru jednog test procesa -
 * bez ovoga bi throttling izazivao lazne 429 greske nepovezane sa stvarnim
 * ponasanjem produkcije. `@Throttle()` dekoratori citaju ovu vrednost pri
 * ucitavanju modula (isti proces, isti `process.env` kao i ThrottlerModule
 * factory ispod), pa je bezbedno da bude obican modulski konstant.
 */
export function isTestEnvironment(): boolean {
  return process.env.NODE_ENV === "test";
}

export const TEST_THROTTLE_LIMIT = 1_000_000;

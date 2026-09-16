import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { Screen } from "../../src/ui/Screen";

/**
 * PLACEHOLDER tekst - Apple/Google zahtevaju vidljive Terms/Privacy linkove
 * na paywall-u (vidi app/paywall.tsx), ali stvaran pravni tekst mora da
 * napise/pregleda pravnik pre produkcije (isti princip kao seed-data
 * fitness-content review - vidi apps/api/prisma/seed-data/README.md).
 */
export default function TermsOfUseScreen() {
  return (
    <Screen>
      <Pressable onPress={() => router.back()} testID="terms-back">
        <Text className="text-accent">{"< Nazad"}</Text>
      </Pressable>

      <Text className="text-2xl font-bold text-neutral-50 dark:text-neutral-1000">Uslovi koriscenja</Text>
      <Text className="text-xs text-neutral-500 dark:text-neutral-600">
        Poslednje azurirano: [popuniti pre objave] - ovo je placeholder tekst, potrebna pravna revizija pre produkcije.
      </Text>

      <View className="gap-4">
        <Section title="1. Prihvatanje uslova">
          Koriscenjem RISESOLO aplikacije prihvatas ove Uslove koriscenja. Ako se ne slazes, ne koristi aplikaciju.
        </Section>
        <Section title="2. Pretplate">
          RISESOLO Pro je pretplata koja se naplacuje mesecno ili godisnje preko App Store-a (iOS) ili Google Play-a
          (Android). Pretplata se AUTOMATSKI OBNAVLJA po ceni vazecoj u trenutku obnove, osim ako je ne otkazes
          najmanje 24 sata pre isteka tekuceg perioda. Naplata za obnovu se vrsi u poslednjih 24 sata tekuceg
          perioda. Placanjem preko App Store/Google Play naloga, saglasan/na si sa njihovim uslovima placanja.
        </Section>
        <Section title="3. Otkazivanje">
          Pretplatu mozes otkazati u bilo kom trenutku preko podesavanja svog App Store ili Google Play naloga -
          RISESOLO nema pristup tvojim platnim podacima niti moze direktno da izvrsi otkazivanje umesto tebe.
          Otkazivanje sprecava buducu naplatu, ali ne vraca novac za tekuci vec placeni period.
        </Section>
        <Section title="4. Sadrzaj i odgovornost">
          Trening i ishrana preporuke u aplikaciji su informativnog karaktera i ne zamenjuju savet lekara ili
          licenciranog trenera. Koristis aplikaciju na sopstvenu odgovornost.
        </Section>
        <Section title="5. Izmene">
          Zadrzavamo pravo da izmenimo ove uslove; nastavak koriscenja aplikacije nakon izmene predstavlja
          prihvatanje novih uslova.
        </Section>
        <Section title="6. Kontakt">
          Pitanja u vezi sa ovim uslovima: [popuniti kontakt email pre objave].
        </Section>
      </View>
    </Screen>
  );
}

function Section({ title, children }: { title: string; children: string }) {
  return (
    <View className="gap-1.5">
      <Text className="text-sm font-semibold text-neutral-50 dark:text-neutral-1000">{title}</Text>
      <Text className="text-sm text-neutral-400 dark:text-neutral-700">{children}</Text>
    </View>
  );
}

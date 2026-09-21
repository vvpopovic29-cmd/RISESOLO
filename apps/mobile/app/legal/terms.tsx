import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { Screen } from "../../src/ui/Screen";

/**
 * RISESOLO aplikaciju razvija i odrzava Vukasin Popovic, individualni
 * developer sa sedistem u Republici Srbiji. Tekst je stvaran (nije
 * placeholder), ali pravnu reviziju pre veceg skaliranja i dalje
 * preporucujemo.
 */
export default function TermsOfUseScreen() {
  return (
    <Screen>
      <Pressable onPress={() => router.back()} testID="terms-back">
        <Text className="text-accent">{"< Nazad"}</Text>
      </Pressable>

      <Text className="text-2xl font-bold text-neutral-50 dark:text-neutral-1000">Uslovi koriscenja</Text>
      <Text className="text-xs text-neutral-500 dark:text-neutral-600">Poslednje azurirano: 21. septembar 2026.</Text>

      <View className="gap-4">
        <Section title="0. Pruzalac usluge">
          RISESOLO aplikaciju razvija i odrzava Vukasin Popovic, individualni developer sa sedistem u Republici
          Srbiji. Kontakt: vvpopovic29@gmail.com.
        </Section>
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
        <Section title="6. Merodavno pravo i nadleznost">
          Ovi uslovi se tumace u skladu sa zakonima Republike Srbije. Eventualni sporovi resavaju se pred nadleznim
          sudom u Republici Srbiji, osim ako obavezujuce lokalno pravo tvoje jurisdikcije (npr. za potrosace u EU)
          ne propisuje drugacije.
        </Section>
        <Section title="7. Kontakt">Pitanja u vezi sa ovim uslovima: vvpopovic29@gmail.com.</Section>
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

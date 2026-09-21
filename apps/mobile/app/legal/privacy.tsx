import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { Screen } from "../../src/ui/Screen";

/**
 * Kontrolor podataka je Vukasin Popovic, individualni developer sa sedistem
 * u Republici Srbiji. Tekst je stvaran (nije placeholder), ali pravnu
 * reviziju pre veceg skaliranja (posebno obrade EU korisnika u vecem obimu)
 * i dalje preporucujemo.
 */
export default function PrivacyPolicyScreen() {
  return (
    <Screen>
      <Pressable onPress={() => router.back()} testID="privacy-back">
        <Text className="text-accent">{"< Nazad"}</Text>
      </Pressable>

      <Text className="text-2xl font-bold text-neutral-50 dark:text-neutral-1000">Politika privatnosti</Text>
      <Text className="text-xs text-neutral-500 dark:text-neutral-600">Poslednje azurirano: 21. septembar 2026.</Text>

      <View className="gap-4">
        <Section title="0. Kontrolor podataka">
          Kontrolor tvojih licnih podataka je Vukasin Popovic, individualni developer sa sedistem u Republici
          Srbiji. Za sva pitanja u vezi sa privatnoscu pisi na vvpopovic29@gmail.com.
        </Section>
        <Section title="1. Podaci koje prikupljamo">
          Email adresa i korisnicko ime (registracija), podaci o treninzima/ishrani koje unosis, i podaci o
          pretplati (status, tip paketa) koje nam RevenueCat prosledjuje nakon kupovine preko App Store-a/Google
          Play-a. Ne prikupljamo podatke o placnim karticama - to obradjuje iskljucivo Apple/Google.
        </Section>
        <Section title="2. Kako koristimo podatke">
          Za funkcionisanje aplikacije (cuvanje progresa, generisanje AI trening planova, otkljucavanje pretplacenog
          sadrzaja) i za odrzavanje/unapredjenje servisa. Ne prodajemo tvoje podatke trecim licima.
        </Section>
        <Section title="3. Treće strane">
          Koristimo RevenueCat za upravljanje pretplatama i Anthropic (Claude API) za generisanje AI trening
          planova. Ovi servisi obradjuju samo podatke neophodne za svoju funkciju (RevenueCat: identifikator naloga
          i status pretplate; Anthropic: parametri za generisanje plana, bez licnih identifikatora).
        </Section>
        <Section title="4. Cuvanje i brisanje podataka">
          Podaci se cuvaju dok je nalog aktivan. Brisanje naloga mozes zatraziti slanjem zahteva na
          vvpopovic29@gmail.com - podaci se trajno brisu najkasnije 30 dana nakon potvrdjenog zahteva.
        </Section>
        <Section title="5. Tvoja prava">
          U zavisnosti od jurisdikcije (npr. GDPR u EU, CCPA u Kaliforniji), imas pravo na pristup, ispravku i
          brisanje svojih podataka, kao i na prigovor na obradu. Ova prava ostvaruje se slanjem zahteva na
          vvpopovic29@gmail.com.
        </Section>
        <Section title="6. Merodavno pravo">
          Obrada podataka se prevashodno rukovodi zakonima Republike Srbije, uz postovanje GDPR-a za korisnike iz
          EU i CCPA za korisnike iz Kalifornije, u meri u kojoj se ti propisi primenjuju.
        </Section>
        <Section title="7. Kontakt">Pitanja u vezi sa privatnoscu: vvpopovic29@gmail.com.</Section>
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

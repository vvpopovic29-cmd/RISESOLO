import { Modal, Pressable, Text, View } from "react-native";
import { useReduceMotion } from "../accessibility/use-reduce-motion";

export interface LevelUpScreenProps {
  readonly visible: boolean;
  /** Nivo PRE ovog treninga - backend racuna, UI samo prikazuje (Faza 7). */
  readonly previousLevel: number;
  readonly newLevel: number;
  /** `CompletionOutcome.statPointsAwarded` iz Completion Engine-a (Faza 6/7). */
  readonly statPointsAwarded: number;
  readonly onContinue: () => void;
}

function formatLevel(level: number): string {
  return String(level).padStart(2, "0");
}

/**
 * "System" ekran (Faza 7 - LEVEL UP) koji se prikazuje kada backend vrati
 * `levelUp: true` iz Completion Engine-a. Cisto prezentacioni komponent -
 * ne racuna nista sam, samo prikazuje sta mu je backend vec izracunao
 * (previousLevel/newLevel/statPointsAwarded) - "UI samo prikazuje dogadjaj,
 * backend odlucuje da li se Level Up desio".
 */
export function LevelUpScreen({
  visible,
  previousLevel,
  newLevel,
  statPointsAwarded,
  onContinue,
}: LevelUpScreenProps) {
  const reduceMotion = useReduceMotion();

  if (!visible) return null;

  return (
    <Modal
      visible
      transparent
      animationType={reduceMotion ? "none" : "fade"}
      onRequestClose={onContinue}
    >
      <View
        testID="level-up-screen"
        className="flex-1 items-center justify-center bg-neutral-50/90 px-6"
      >
        <View className="w-full max-w-sm items-center gap-4 rounded-lg border-2 border-accent bg-neutral-100 px-8 py-10">
          <Text className="text-2xl font-bold tracking-widest text-accent">LEVEL UP</Text>

          <Text className="text-4xl font-bold text-neutral-1000">
            {formatLevel(previousLevel)} → {formatLevel(newLevel)}
          </Text>

          {statPointsAwarded > 0 ? (
            <Text className="text-base font-semibold tracking-wide text-reward">
              + {statPointsAwarded} STAT {statPointsAwarded === 1 ? "POINT" : "POINTS"}
            </Text>
          ) : null}

          <Pressable
            onPress={onContinue}
            className="mt-2 rounded-md border border-accent px-6 py-2"
          >
            <Text className="font-semibold tracking-wide text-accent">CONTINUE</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

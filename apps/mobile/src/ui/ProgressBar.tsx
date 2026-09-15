import { View } from "react-native";

/** `progress` je razlomak u [0, 1] - vrednost dolazi iskljucivo sa servera (@risesolo/domain calculateProgress). */
export function ProgressBar({
  progress,
  colorClassName = "bg-accent",
  testID,
}: {
  progress: number;
  colorClassName?: string;
  testID?: string;
}) {
  const clamped = Math.max(0, Math.min(1, progress));

  return (
    <View className="h-2.5 w-full overflow-hidden rounded-full bg-neutral-800 dark:bg-neutral-300">
      <View testID={testID} className={`h-full rounded-full ${colorClassName}`} style={{ width: `${clamped * 100}%` }} />
    </View>
  );
}

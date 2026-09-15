import { ActivityIndicator, Pressable, Text } from "react-native";

type Variant = "primary" | "secondary" | "danger";

const VARIANT_CLASSES: Record<Variant, string> = {
  primary: "bg-accent",
  secondary: "border border-neutral-700 dark:border-neutral-400",
  danger: "bg-danger",
};

const VARIANT_TEXT_CLASSES: Record<Variant, string> = {
  primary: "text-neutral-50",
  secondary: "text-neutral-50 dark:text-neutral-1000",
  danger: "text-neutral-1000",
};

export function Button({
  label,
  onPress,
  variant = "primary",
  loading = false,
  disabled = false,
  testID,
}: {
  label: string;
  onPress: () => void;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  testID?: string;
}) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={isDisabled}
      className={`items-center justify-center rounded-md px-4 py-3 ${VARIANT_CLASSES[variant]} ${isDisabled ? "opacity-50" : ""}`}
    >
      {loading ? (
        <ActivityIndicator color={variant === "secondary" ? "#83848F" : "#0A0A0F"} />
      ) : (
        <Text className={`text-base font-semibold ${VARIANT_TEXT_CLASSES[variant]}`}>{label}</Text>
      )}
    </Pressable>
  );
}

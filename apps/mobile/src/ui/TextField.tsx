import { Text, TextInput, View, type TextInputProps } from "react-native";

export function TextField({
  label,
  error,
  ...inputProps
}: TextInputProps & { label: string; error?: string }) {
  return (
    <View className="gap-1.5">
      <Text className="text-sm font-medium text-neutral-400 dark:text-neutral-700">{label}</Text>
      <TextInput
        {...inputProps}
        placeholderTextColor="#5B5D6B"
        className={`rounded-md border px-3 py-2.5 text-base text-neutral-50 dark:text-neutral-1000 ${
          error ? "border-danger" : "border-neutral-700 dark:border-neutral-400"
        }`}
      />
      {error ? <Text className="text-xs text-danger">{error}</Text> : null}
    </View>
  );
}

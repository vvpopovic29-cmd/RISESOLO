import { Pressable, Text, View } from "react-native";

export function ChoiceGroup<TValue extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: ReadonlyArray<{ value: TValue; label: string }>;
  value: TValue | undefined;
  onChange: (value: TValue) => void;
}) {
  return (
    <View className="gap-1.5">
      <Text className="text-sm font-medium text-neutral-400 dark:text-neutral-700">{label}</Text>
      <View className="flex-row flex-wrap gap-2">
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <Pressable
              key={option.value}
              onPress={() => onChange(option.value)}
              className={`rounded-full border px-3.5 py-2 ${
                selected ? "border-accent bg-accent/20" : "border-neutral-700 dark:border-neutral-400"
              }`}
            >
              <Text
                className={
                  selected ? "text-accent font-semibold" : "text-neutral-400 dark:text-neutral-700"
                }
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

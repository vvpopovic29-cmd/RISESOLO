import { Text, View } from "react-native";
import { Button } from "./Button";

export function ErrorState({ message, onRetry, testID }: { message: string; onRetry: () => void; testID?: string }) {
  return (
    <View testID={testID} className="items-center gap-3 py-6">
      <Text className="text-center text-danger">{message}</Text>
      <Button label="Pokusaj ponovo" onPress={onRetry} variant="secondary" />
    </View>
  );
}

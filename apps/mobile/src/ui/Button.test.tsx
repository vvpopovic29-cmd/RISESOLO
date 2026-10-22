import { fireEvent, render } from "@testing-library/react-native";
import { Button } from "./Button";

describe("Button", () => {
  it("poziva onPress na klik", async () => {
    const onPress = jest.fn();
    const { getByText } = await render(<Button label="Sacuvaj" onPress={onPress} />);

    fireEvent.press(getByText("Sacuvaj"));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("ne poziva onPress kada je disabled", async () => {
    const onPress = jest.fn();
    const { getByTestId } = await render(<Button label="Sacuvaj" onPress={onPress} disabled testID="btn" />);

    fireEvent.press(getByTestId("btn"));

    expect(onPress).not.toHaveBeenCalled();
  });

  it("u loading stanju sakriva labelu i blokira dupli klik", async () => {
    const onPress = jest.fn();
    const { queryByText, getByTestId } = await render(<Button label="Sacuvaj" onPress={onPress} loading testID="btn" />);

    expect(queryByText("Sacuvaj")).toBeNull();
    fireEvent.press(getByTestId("btn"));
    expect(onPress).not.toHaveBeenCalled();
  });
});

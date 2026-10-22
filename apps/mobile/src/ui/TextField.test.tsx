import { fireEvent, render } from "@testing-library/react-native";
import { TextField } from "./TextField";

describe("TextField", () => {
  it("prikazuje labelu i prosledjuje unos kroz onChangeText", async () => {
    const onChangeText = jest.fn();
    const { getByText, getByTestId } = await render(<TextField label="Email" testID="email" onChangeText={onChangeText} />);

    expect(getByText("Email")).toBeTruthy();
    fireEvent.changeText(getByTestId("email"), "a@b.rs");

    expect(onChangeText).toHaveBeenCalledWith("a@b.rs");
  });

  it("prikazuje poruku o gresci samo kada je error zadat", async () => {
    const { queryByText, rerender } = await render(<TextField label="Email" />);
    expect(queryByText("Neispravan email")).toBeNull();

    await rerender(<TextField label="Email" error="Neispravan email" />);

    expect(queryByText("Neispravan email")).toBeTruthy();
  });
});

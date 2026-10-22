import { fireEvent, render } from "@testing-library/react-native";
import { ErrorState } from "./ErrorState";

describe("ErrorState", () => {
  it("prikazuje poruku i podrazumevani retry label", async () => {
    const { getByText } = await render(<ErrorState message="Nema mreze" onRetry={jest.fn()} />);

    expect(getByText("Nema mreze")).toBeTruthy();
    expect(getByText("Pokusaj ponovo")).toBeTruthy();
  });

  it("poziva onRetry i podrzava custom retry label", async () => {
    const onRetry = jest.fn();
    const { getByText } = await render(<ErrorState message="Greska" onRetry={onRetry} retryLabel="Retry" />);

    fireEvent.press(getByText("Retry"));

    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});

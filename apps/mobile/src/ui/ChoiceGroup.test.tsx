import { fireEvent, render } from "@testing-library/react-native";
import { ChoiceGroup } from "./ChoiceGroup";

const OPTIONS = [
  { value: "A", label: "Opcija A" },
  { value: "B", label: "Opcija B" },
] as const;

describe("ChoiceGroup", () => {
  it("poziva onChange sa vrednoscu kliknute opcije", async () => {
    const onChange = jest.fn();
    const { getByText } = await render(<ChoiceGroup label="Test" options={OPTIONS} value={undefined} onChange={onChange} />);

    fireEvent.press(getByText("Opcija B"));

    expect(onChange).toHaveBeenCalledWith("B");
  });

  it("prikazuje sve opcije i naslov", async () => {
    const { getByText } = await render(<ChoiceGroup label="Nivo" options={OPTIONS} value="A" onChange={jest.fn()} />);

    expect(getByText("Nivo")).toBeTruthy();
    expect(getByText("Opcija A")).toBeTruthy();
    expect(getByText("Opcija B")).toBeTruthy();
  });
});

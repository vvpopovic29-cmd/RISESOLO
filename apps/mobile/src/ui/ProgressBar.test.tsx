import { render } from "@testing-library/react-native";
import { ProgressBar } from "./ProgressBar";

function widthOf(getByTestId: (id: string) => { props: { style?: { width?: string | number } } }, testID: string) {
  return getByTestId(testID).props.style?.width;
}

describe("ProgressBar", () => {
  it("prevodi progress u sirinu u procentima", async () => {
    const { getByTestId } = await render(<ProgressBar progress={0.375} testID="bar" />);
    expect(widthOf(getByTestId, "bar")).toBe("37.5%");
  });

  it("klampuje vrednosti ispod 0 na 0%", async () => {
    const { getByTestId } = await render(<ProgressBar progress={-0.5} testID="bar" />);
    expect(widthOf(getByTestId, "bar")).toBe("0%");
  });

  it("klampuje vrednosti iznad 1 na 100%", async () => {
    const { getByTestId } = await render(<ProgressBar progress={1.5} testID="bar" />);
    expect(widthOf(getByTestId, "bar")).toBe("100%");
  });
});

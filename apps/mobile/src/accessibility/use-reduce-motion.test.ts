import { act, renderHook, waitFor } from "@testing-library/react-native";
import { AccessibilityInfo } from "react-native";
import { useReduceMotion } from "./use-reduce-motion";

describe("useReduceMotion", () => {
  it("vraca false dok se OS podesavanje ne ucita, pa se azurira na stvarnu vrednost", async () => {
    jest.spyOn(AccessibilityInfo, "isReduceMotionEnabled").mockResolvedValue(true);
    const { result } = await renderHook(() => useReduceMotion());

    await waitFor(() => expect(result.current).toBe(true));
  });

  it("azurira se kada OS emituje reduceMotionChanged", async () => {
    jest.spyOn(AccessibilityInfo, "isReduceMotionEnabled").mockResolvedValue(false);
    let changeHandler: ((enabled: boolean) => void) | undefined;
    (jest.spyOn(AccessibilityInfo, "addEventListener") as jest.Mock).mockImplementation(
      (event: string, handler: (enabled: boolean) => void) => {
        if (event === "reduceMotionChanged") changeHandler = handler;
        return { remove: jest.fn() };
      },
    );

    const { result } = await renderHook(() => useReduceMotion());
    await waitFor(() => expect(result.current).toBe(false));

    await act(async () => changeHandler?.(true));
    expect(result.current).toBe(true);
  });
});

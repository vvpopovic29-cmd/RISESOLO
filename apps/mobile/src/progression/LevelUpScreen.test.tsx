import { fireEvent, render, screen } from "@testing-library/react-native";
import { LevelUpScreen } from "./LevelUpScreen";

describe("LevelUpScreen", () => {
  it("ne prikazuje nista kada visible=false", async () => {
    await render(
      <LevelUpScreen
        visible={false}
        previousLevel={5}
        newLevel={6}
        statPointsAwarded={3}
        onContinue={jest.fn()}
      />,
    );
    expect(screen.queryByTestId("level-up-screen")).toBeNull();
  });

  it("prikazuje prelaz previousLevel -> newLevel i dodeljene stat poene", async () => {
    await render(
      <LevelUpScreen
        visible
        previousLevel={5}
        newLevel={6}
        statPointsAwarded={3}
        onContinue={jest.fn()}
      />,
    );
    expect(screen.getByTestId("level-up-screen")).toBeTruthy();
    expect(screen.getByText("LEVEL UP")).toBeTruthy();
    expect(screen.getByText("05 → 06")).toBeTruthy();
    expect(screen.getByText("+ 3 STAT POINTS")).toBeTruthy();
  });

  it("koristi jedninu (POINT) kada je dodeljen tacno 1 poen", async () => {
    await render(
      <LevelUpScreen
        visible
        previousLevel={1}
        newLevel={2}
        statPointsAwarded={1}
        onContinue={jest.fn()}
      />,
    );
    expect(screen.getByText("+ 1 STAT POINT")).toBeTruthy();
  });

  it("ne prikazuje stat poene liniju kada je statPointsAwarded 0", async () => {
    await render(
      <LevelUpScreen
        visible
        previousLevel={5}
        newLevel={5}
        statPointsAwarded={0}
        onContinue={jest.fn()}
      />,
    );
    expect(screen.queryByText(/STAT POINT/)).toBeNull();
  });

  it("poziva onContinue kada se dodirne CONTINUE dugme", async () => {
    const onContinue = jest.fn();
    await render(
      <LevelUpScreen
        visible
        previousLevel={5}
        newLevel={6}
        statPointsAwarded={3}
        onContinue={onContinue}
      />,
    );
    fireEvent.press(screen.getByText("CONTINUE"));
    expect(onContinue).toHaveBeenCalledTimes(1);
  });
});

import {
  INITIAL_PLAYER_STATE,
  STAT_POINTS_PER_LEVEL,
  allocateStatPoint,
  applyRewards,
  type PlayerGameState,
} from "./player-progression";

describe("applyRewards", () => {
  it("dodaje XP i gold bez level-up-a kada nagrada ne dostize prag", () => {
    const result = applyRewards(INITIAL_PLAYER_STATE, { xp: 50, gold: 10 });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.state.totalXp).toBe(50);
    expect(result.value.state.gold).toBe(10);
    expect(result.value.leveledUp).toBe(false);
    expect(result.value.levelsGained).toBe(0);
    expect(result.value.state.unallocatedStatPoints).toBe(0);
    expect(result.value.previousRank).toBe("E");
    expect(result.value.newRank).toBe("E");
  });

  it("prijavljuje level-up i dodeljuje poene statistike kada se predje prag", () => {
    const result = applyRewards(INITIAL_PLAYER_STATE, { xp: 100, gold: 0 });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.leveledUp).toBe(true);
    expect(result.value.levelsGained).toBe(1);
    expect(result.value.state.unallocatedStatPoints).toBe(STAT_POINTS_PER_LEVEL);
  });

  it("moze preskociti vise nivoa odjednom i prijaviti promenu ranga", () => {
    // totalXpForLevel(10) = 100+150+...+500 = 2700; ovo prebacuje iz nivoa 1 (E) u nivo 10 (D)
    const result = applyRewards(INITIAL_PLAYER_STATE, { xp: 2700, gold: 0 });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.levelsGained).toBe(9);
    expect(result.value.previousRank).toBe("E");
    expect(result.value.newRank).toBe("D");
    expect(result.value.state.unallocatedStatPoints).toBe(9 * STAT_POINTS_PER_LEVEL);
  });

  it("odbija negativnu ili necelobrojnu nagradu", () => {
    expect(applyRewards(INITIAL_PLAYER_STATE, { xp: -1, gold: 0 }).ok).toBe(false);
    expect(applyRewards(INITIAL_PLAYER_STATE, { xp: 1.5, gold: 0 }).ok).toBe(false);
    expect(applyRewards(INITIAL_PLAYER_STATE, { xp: 0, gold: -5 }).ok).toBe(false);
  });

  it("ne mutira ulazno stanje", () => {
    const before: PlayerGameState = { ...INITIAL_PLAYER_STATE };
    applyRewards(INITIAL_PLAYER_STATE, { xp: 100, gold: 10 });
    expect(INITIAL_PLAYER_STATE).toEqual(before);
  });
});

describe("allocateStatPoint", () => {
  const stateWithPoints: PlayerGameState = {
    ...INITIAL_PLAYER_STATE,
    unallocatedStatPoints: 5,
  };

  it("prenosi poene iz unallocated u izabranu statistiku", () => {
    const result = allocateStatPoint(stateWithPoints, "strength", 3);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.unallocatedStatPoints).toBe(2);
    expect(result.value.stats.strength).toBe(3);
  });

  it("odbija dodelu vecu od raspolozivih poena", () => {
    const result = allocateStatPoint(stateWithPoints, "agility", 6);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toEqual({
      type: "insufficient_stat_points",
      available: 5,
      requested: 6,
    });
  });

  it("odbija nula ili negativan broj poena", () => {
    expect(allocateStatPoint(stateWithPoints, "vitality", 0).ok).toBe(false);
    expect(allocateStatPoint(stateWithPoints, "vitality", -1).ok).toBe(false);
  });
});

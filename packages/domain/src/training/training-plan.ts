export type SplitType = "push_pull_legs" | "upper_lower" | "full_body";

export type DayFocus = "push" | "pull" | "legs" | "upper" | "lower" | "full_body" | "rest";

/** Redosled fokusa po treningu, u ciklusu, za svaki tip splita. */
const SPLIT_TEMPLATES: Record<SplitType, readonly DayFocus[]> = {
  push_pull_legs: ["push", "pull", "legs"],
  upper_lower: ["upper", "lower"],
  full_body: ["full_body"],
};

/**
 * Generise raspored za 7 dana (ponedeljak..nedelja) za dati split i broj
 * trening dana nedeljno. Trening dani su ravnomerno rasporedjeni preko
 * nedelje (Bresenham-stil raspodela) umesto da se zbiju na pocetak - tako
 * `daysPerWeek=3` daje npr. sredu/petak/nedelju, ne pon/uto/sre. Fokus
 * rotira kroz `SPLIT_TEMPLATES[splitType]` u ciklusu (npr. Push/Pull/Legs
 * se ponavlja ako ima vise trening dana nego stavki u template-u).
 */
export function generateWeeklySchedule(splitType: SplitType, daysPerWeek: number): DayFocus[] {
  if (!Number.isInteger(daysPerWeek) || daysPerWeek < 1 || daysPerWeek > 7) {
    throw new RangeError(`daysPerWeek mora biti ceo broj izmedju 1 i 7, dobijeno: ${daysPerWeek}`);
  }

  const template = SPLIT_TEMPLATES[splitType];
  const schedule: DayFocus[] = [];
  let trainingIndex = 0;

  for (let day = 0; day < 7; day++) {
    const shouldTrain =
      Math.floor(((day + 1) * daysPerWeek) / 7) > Math.floor((day * daysPerWeek) / 7);

    if (shouldTrain) {
      const focus = template[trainingIndex % template.length];
      schedule.push(focus ?? "full_body");
      trainingIndex++;
    } else {
      schedule.push("rest");
    }
  }

  return schedule;
}

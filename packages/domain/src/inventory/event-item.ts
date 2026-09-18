/**
 * Event Items - cetvrti izvor u Inventory sistemu. Za razliku od Workshop
 * Item-a (nivo+coins gate, uvek dostupan), Event Item se prisvaja BESPLATNO
 * (samo POST akcija, bez cene) ali SAMO dok je tekuci datum unutar godisnjeg
 * kalendarskog prozora dogadjaja - prozor se ponavlja svake godine (mesec+dan,
 * ne konkretna godina), isti princip kao sezonski dogadjaji u igrama. Van
 * prozora, predmet se NE moze prisvojiti (ali vec prisvojeni ostaje trajno u
 * vlasnistvu - isti princip kao svi ostali Inventory izvori).
 */

export const EVENT_ITEM_IDS = [
  "NEW_YEAR_RESOLUTION",
  "SPRING_AWAKENING",
  "SUMMER_SHRED",
  "AUTUMN_HARVEST",
  "WINTER_WARRIOR",
] as const;
export type EventItemId = (typeof EVENT_ITEM_IDS)[number];

export interface MonthDay {
  /** 1-12 */
  month: number;
  /** 1-31 */
  day: number;
}

export interface EventItemDefinition {
  id: EventItemId;
  /** Pocetak godisnjeg prozora (inclusive). */
  start: MonthDay;
  /** Kraj godisnjeg prozora (inclusive). Namerno bez prelaza preko granice godine (31.12 -> 1.1) za sve trenutne dogadjaje - poredjenje je prosto (month, day) bez wrap-around logike. */
  end: MonthDay;
}

export const EVENT_ITEMS: readonly EventItemDefinition[] = [
  { id: "NEW_YEAR_RESOLUTION", start: { month: 1, day: 1 }, end: { month: 1, day: 15 } },
  { id: "SPRING_AWAKENING", start: { month: 3, day: 20 }, end: { month: 4, day: 5 } },
  { id: "SUMMER_SHRED", start: { month: 6, day: 1 }, end: { month: 6, day: 30 } },
  { id: "AUTUMN_HARVEST", start: { month: 9, day: 1 }, end: { month: 9, day: 30 } },
  { id: "WINTER_WARRIOR", start: { month: 12, day: 1 }, end: { month: 12, day: 31 } },
];

export function getEventItem(id: string): EventItemDefinition | undefined {
  return EVENT_ITEMS.find((item) => item.id === id);
}

function monthDayOf(date: Date): MonthDay {
  return { month: date.getUTCMonth() + 1, day: date.getUTCDate() };
}

function isAtOrAfter(a: MonthDay, b: MonthDay): boolean {
  return a.month > b.month || (a.month === b.month && a.day >= b.day);
}

function isAtOrBefore(a: MonthDay, b: MonthDay): boolean {
  return a.month < b.month || (a.month === b.month && a.day <= b.day);
}

/** Da li je tekuci datum (UTC) unutar godisnjeg prozora dogadjaja (inclusive na oba kraja, bez wrap-around preko granice godine). */
export function isEventActive(definition: Pick<EventItemDefinition, "start" | "end">, now: Date): boolean {
  const today = monthDayOf(now);
  return isAtOrAfter(today, definition.start) && isAtOrBefore(today, definition.end);
}

/** Ne moze prisvojiti nesto sto vec ima, niti van aktivnog prozora dogadjaja. */
export function canClaimEventItem(
  definition: Pick<EventItemDefinition, "start" | "end">,
  now: Date,
  alreadyOwned: boolean,
): boolean {
  return !alreadyOwned && isEventActive(definition, now);
}

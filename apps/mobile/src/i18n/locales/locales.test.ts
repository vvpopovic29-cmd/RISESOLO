import en from "./en";
import sr from "./sr";

type Flat = Record<string, string>;

function flatten(messages: Record<string, unknown>): Flat {
  const result: Flat = {};
  for (const [namespace, fields] of Object.entries(messages)) {
    for (const [field, value] of Object.entries(fields as Record<string, unknown>)) {
      result[`${namespace}.${field}`] = value as string;
    }
  }
  return result;
}

const enFlat = flatten(en);
const srFlat = flatten(sr);

const placeholders = (text: string): string[] => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1] as string).sort();

describe("i18n paritet en/sr", () => {
  it("oba jezika imaju iste kljuceve", () => {
    expect(Object.keys(srFlat).sort()).toEqual(Object.keys(enFlat).sort());
  });

  it("nijedan prevod nije prazan ni ostavljen kao TODO", () => {
    for (const [key, text] of [...Object.entries(enFlat), ...Object.entries(srFlat)]) {
      expect({ key, empty: typeof text !== "string" || text.trim() === "" }).toEqual({ key, empty: false });
      expect(text).not.toMatch(/TODO|FIXME/);
    }
  });

  it("isti placeholderi ({coins}, {days}...) postoje u oba jezika za svaki kljuc", () => {
    for (const key of Object.keys(enFlat)) {
      expect({ key, vars: placeholders(srFlat[key] as string) }).toEqual({ key, vars: placeholders(enFlat[key] as string) });
    }
  });
});

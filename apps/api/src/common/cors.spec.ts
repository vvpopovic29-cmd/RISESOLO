import { resolveCorsOrigin } from "./cors";

describe("resolveCorsOrigin", () => {
  it("dozvoljava sve origin-e kad CORS_ORIGIN nije podesen", () => {
    expect(resolveCorsOrigin(undefined)).toBe(true);
  });

  it("parsira zarezom-odvojenu listu origin-a", () => {
    expect(resolveCorsOrigin("https://app.risesolo.com,https://admin.risesolo.com")).toEqual([
      "https://app.risesolo.com",
      "https://admin.risesolo.com",
    ]);
  });

  it("trimuje razmake i preskace prazne stavke", () => {
    expect(resolveCorsOrigin(" https://app.risesolo.com , , https://admin.risesolo.com ")).toEqual([
      "https://app.risesolo.com",
      "https://admin.risesolo.com",
    ]);
  });

  it("jedan origin se vraca kao lista sa jednim elementom", () => {
    expect(resolveCorsOrigin("https://app.risesolo.com")).toEqual(["https://app.risesolo.com"]);
  });
});

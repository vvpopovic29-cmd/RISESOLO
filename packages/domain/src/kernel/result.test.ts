import { err, ok } from "./result";

describe("Result", () => {
  it("ok() proizvodi uspesan rezultat sa vrednoscu", () => {
    const result = ok(42);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toBe(42);
    }
  });

  it("err() proizvodi neuspesan rezultat sa greskom", () => {
    const result = err("nesto nije u redu");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("nesto nije u redu");
    }
  });
});

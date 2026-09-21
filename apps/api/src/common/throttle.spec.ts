import { isTestEnvironment } from "./throttle";

describe("isTestEnvironment", () => {
  const originalNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
  });

  it("vraca true kada je NODE_ENV=test", () => {
    process.env.NODE_ENV = "test";
    expect(isTestEnvironment()).toBe(true);
  });

  it("vraca false za development/production", () => {
    process.env.NODE_ENV = "development";
    expect(isTestEnvironment()).toBe(false);

    process.env.NODE_ENV = "production";
    expect(isTestEnvironment()).toBe(false);
  });
});

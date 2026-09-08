/** @type {import('jest').Config} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  rootDir: "src",
  testMatch: ["**/*.test.ts"],
  collectCoverageFrom: ["**/*.ts", "!**/*.test.ts"],
};

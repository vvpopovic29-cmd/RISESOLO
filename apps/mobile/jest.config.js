/** @type {import('jest').Config} */
module.exports = {
  preset: "jest-expo",
  setupFiles: ["./jest.setup.js"],
  // Prvi render RN komponente (hladan babel/nativewind transform) zna da pređe podrazumevanih 5s na sporom CI runneru.
  testTimeout: 20000,
};

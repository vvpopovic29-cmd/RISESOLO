import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import { secureStorage } from "./secure-storage";

jest.mock("expo-secure-store", () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

describe("secureStorage", () => {
  const originalOS = Platform.OS;

  afterEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(Platform, "OS", { value: originalOS, configurable: true });
  });

  it("na native platformi (ios/android) delegira na expo-secure-store", async () => {
    Object.defineProperty(Platform, "OS", { value: "ios", configurable: true });

    await secureStorage.setItem("k", "v");
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith("k", "v");

    await secureStorage.getItem("k");
    expect(SecureStore.getItemAsync).toHaveBeenCalledWith("k");

    await secureStorage.deleteItem("k");
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith("k");
  });

  it("na webu koristi localStorage umesto expo-secure-store (koji tamo nije implementiran)", async () => {
    Object.defineProperty(Platform, "OS", { value: "web", configurable: true });
    const store = new Map<string, string>();
    (globalThis as { localStorage?: unknown }).localStorage = {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => store.set(key, value),
      removeItem: (key: string) => store.delete(key),
    };

    await secureStorage.setItem("token", "abc");
    expect(await secureStorage.getItem("token")).toBe("abc");
    expect(SecureStore.setItemAsync).not.toHaveBeenCalled();

    await secureStorage.deleteItem("token");
    expect(await secureStorage.getItem("token")).toBeNull();

    delete (globalThis as { localStorage?: unknown }).localStorage;
  });
});

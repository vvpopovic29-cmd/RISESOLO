import type { ReactNode } from "react";
import { renderHook, waitFor } from "@testing-library/react-native";
import { AuthProvider, useAuth } from "./AuthProvider";
import { supabase } from "./supabase-client";

jest.mock("./supabase-client", () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
      onAuthStateChange: jest.fn(),
      signInWithPassword: jest.fn(),
      signUp: jest.fn(),
      signOut: jest.fn(),
    },
  },
}));

const mockedSupabaseAuth = supabase.auth as jest.Mocked<typeof supabase.auth>;

function wrapper({ children }: { children: ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}

describe("AuthProvider", () => {
  beforeEach(() => {
    mockedSupabaseAuth.getSession.mockResolvedValue({
      data: { session: null },
      error: null,
    } as never);
    mockedSupabaseAuth.onAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: jest.fn() } },
    } as never);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("ucitava sesiju pri startu (bez aktivne sesije -> session je null)", async () => {
    const { result } = await renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.session).toBeNull();
    expect(result.current.getAccessToken()).toBeNull();
  });

  it("signInWithPassword delegira supabase.auth.signInWithPassword i vraca error: null na uspeh", async () => {
    mockedSupabaseAuth.signInWithPassword.mockResolvedValue({ data: {}, error: null } as never);

    const { result } = await renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    const outcome = await result.current.signInWithPassword("a@b.com", "lozinka123");

    expect(mockedSupabaseAuth.signInWithPassword).toHaveBeenCalledWith({
      email: "a@b.com",
      password: "lozinka123",
    });
    expect(outcome.error).toBeNull();
  });

  it("signInWithPassword vraca poruku greske kada Supabase odbije prijavu", async () => {
    mockedSupabaseAuth.signInWithPassword.mockResolvedValue({
      data: {},
      error: { message: "Invalid login credentials" },
    } as never);

    const { result } = await renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    const outcome = await result.current.signInWithPassword("a@b.com", "pogresna");

    expect(outcome.error).toBe("Invalid login credentials");
  });

  it("signOut delegira supabase.auth.signOut", async () => {
    mockedSupabaseAuth.signOut.mockResolvedValue({ error: null } as never);

    const { result } = await renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    await result.current.signOut();

    expect(mockedSupabaseAuth.signOut).toHaveBeenCalled();
  });
});

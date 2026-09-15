import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { ApiClient } from "@risesolo/api-client";
import type { AuthResponse, AuthUser, LoginRequest, RegisterRequest } from "@risesolo/validation";
import { useApiClient } from "../api/use-api-client";
import { secureStorage } from "./secure-storage";

const TOKEN_KEY = "risesolo.accessToken";
const USER_KEY = "risesolo.user";

export type AuthState =
  | { status: "loading" }
  | { status: "signedOut" }
  | { status: "signedIn"; user: AuthUser };

export interface AuthContextValue {
  state: AuthState;
  apiClient: ApiClient;
  login: (dto: LoginRequest) => Promise<void>;
  register: (dto: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Persistuje JWT preko `expo-secure-store` (OS keychain/keystore - ne
 * AsyncStorage, jer je token osetljiv podatak) i drzi ga u ref-u da
 * `ApiClient.getAccessToken()` uvek vidi trenutnu vrednost bez rerender-a
 * potrosaca koji ne zavise direktno od tokena.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: "loading" });
  const tokenRef = useRef<string | null>(null);
  const apiClient = useApiClient(() => tokenRef.current);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [token, userJson] = await Promise.all([
          secureStorage.getItem(TOKEN_KEY),
          secureStorage.getItem(USER_KEY),
        ]);
        if (cancelled) return;
        if (token && userJson) {
          tokenRef.current = token;
          setState({ status: "signedIn", user: JSON.parse(userJson) as AuthUser });
        } else {
          setState({ status: "signedOut" });
        }
      } catch {
        setState({ status: "signedOut" });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const persistSession = useCallback(async (response: AuthResponse) => {
    tokenRef.current = response.accessToken;
    await Promise.all([
      secureStorage.setItem(TOKEN_KEY, response.accessToken),
      secureStorage.setItem(USER_KEY, JSON.stringify(response.user)),
    ]);
    setState({ status: "signedIn", user: response.user });
  }, []);

  const login = useCallback(
    async (dto: LoginRequest) => {
      const response = await apiClient.auth.login(dto);
      await persistSession(response);
    },
    [apiClient, persistSession],
  );

  const register = useCallback(
    async (dto: RegisterRequest) => {
      const response = await apiClient.auth.register(dto);
      await persistSession(response);
    },
    [apiClient, persistSession],
  );

  const logout = useCallback(async () => {
    tokenRef.current = null;
    await Promise.all([secureStorage.deleteItem(TOKEN_KEY), secureStorage.deleteItem(USER_KEY)]);
    setState({ status: "signedOut" });
  }, []);

  return (
    <AuthContext.Provider value={{ state, apiClient, login, register, logout }}>{children}</AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth() mora biti pozvan unutar <AuthProvider>");
  }
  return context;
}

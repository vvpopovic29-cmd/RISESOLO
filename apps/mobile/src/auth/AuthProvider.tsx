import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./supabase-client";

export interface AuthResult {
  error: string | null;
}

export interface AuthContextValue {
  session: Session | null;
  loading: boolean;
  signInWithPassword: (email: string, password: string) => Promise<AuthResult>;
  signUpWithPassword: (email: string, password: string) => Promise<AuthResult>;
  signOut: () => Promise<void>;
  getAccessToken: () => string | null;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Drzi Supabase Auth sesiju u React kontekstu i izlaze `getAccessToken` koji
 * `useApiClient` prosledjuje `@risesolo/api-client` - to je jedini nacin na
 * koji token ulazi u API pozive (nikad se rucno ne prosledjuje kroz props).
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const sessionRef = useRef<Session | null>(session);

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  // Stabilna referenca (ne zavisi od `session` state-a direktno, cita ref) -
  // useApiClient() memoizuje ApiClient na [getAccessToken], pa bi nova
  // referenca na svaku promenu sesije (npr. tihi token refresh na svakih
  // ~sat vremena) izazvala nepotreban remount/refetch svih ekrana koji
  // koriste useApiClient (PlayerStatusCard, DailyQuestCard).
  const getAccessToken = useCallback(() => sessionRef.current?.access_token ?? null, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      loading,
      async signInWithPassword(email, password) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        return { error: error?.message ?? null };
      },
      async signUpWithPassword(email, password) {
        const { error } = await supabase.auth.signUp({ email, password });
        return { error: error?.message ?? null };
      },
      async signOut() {
        await supabase.auth.signOut();
      },
      getAccessToken,
    }),
    [session, loading, getAccessToken],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth mora biti pozvan unutar AuthProvider-a");
  }
  return context;
}

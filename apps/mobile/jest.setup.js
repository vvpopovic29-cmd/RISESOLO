process.env.EXPO_PUBLIC_API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000";
process.env.EXPO_PUBLIC_SUPABASE_URL =
  process.env.EXPO_PUBLIC_SUPABASE_URL ?? "https://test.supabase.co";
process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "test-anon-key";

// React 18+ zahteva eksplicitnu potvrdu da test okruzenje podrzava
// konkurentni act() (inace baca "not configured to support act" upozorenja
// za state update-e koji se desavaju u mikrotaskovima van render() poziva).
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

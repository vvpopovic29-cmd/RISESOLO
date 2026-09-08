process.env.EXPO_PUBLIC_API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000";

// React 18+ zahteva eksplicitnu potvrdu da test okruzenje podrzava
// konkurentni act() (inace baca "not configured to support act" upozorenja
// za state update-e koji se desavaju u mikrotaskovima van render() poziva).
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

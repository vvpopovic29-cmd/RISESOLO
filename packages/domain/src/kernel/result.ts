/**
 * Diskriminovana unija za eksplicitno modelovanje uspeha/greske bez
 * oslanjanja na exceptions kroz domain/application granice.
 */
export type Result<TValue, TError = Error> =
  { readonly ok: true; readonly value: TValue } | { readonly ok: false; readonly error: TError };

export function ok<TValue>(value: TValue): Result<TValue, never> {
  return { ok: true, value };
}

export function err<TError>(error: TError): Result<never, TError> {
  return { ok: false, error };
}

/**
 * Nominalni (branded) tip - sprecava mesanje razlicitih ID-jeva ili vrednosti
 * koje dele isti primitivni tip (npr. `UserId` i `WorkoutId` ne smeju biti
 * medjusobno zamenljivi iako su oba `string`).
 */
export type Brand<TValue, TBrand extends string> = TValue & { readonly __brand: TBrand };

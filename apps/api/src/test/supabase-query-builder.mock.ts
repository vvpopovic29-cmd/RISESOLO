/**
 * Deljeni test double za Supabase-ov chainable query builder
 * (`.from(...).select().eq()....maybeSingle()/single()` ili direktno
 * await-ovan kao thenable za liste). Koriste ga *.service.spec.ts
 * testovi u modules/* da simuliraju Postgrest odgovore bez prave mreze.
 */
export interface SupabaseResult<T> {
  data: T | null;
  error: { message: string } | null;
}

export interface ChainableQueryBuilderMock {
  select: jest.Mock;
  update: jest.Mock;
  insert: jest.Mock;
  eq: jest.Mock;
  gte: jest.Mock;
  lt: jest.Mock;
  order: jest.Mock;
  returns: jest.Mock;
  maybeSingle: jest.Mock;
  single: jest.Mock;
  then: (
    resolve: (value: SupabaseResult<unknown>) => unknown,
    reject?: (reason: unknown) => unknown,
  ) => Promise<unknown>;
}

export function createChainableMock(result: SupabaseResult<unknown>): ChainableQueryBuilderMock {
  const builder: ChainableQueryBuilderMock = {
    select: jest.fn(),
    update: jest.fn(),
    insert: jest.fn(),
    eq: jest.fn(),
    gte: jest.fn(),
    lt: jest.fn(),
    order: jest.fn(),
    returns: jest.fn(),
    maybeSingle: jest.fn(() => Promise.resolve(result)),
    single: jest.fn(() => Promise.resolve(result)),
    then: (resolve, reject) => Promise.resolve(result).then(resolve, reject),
  };
  builder.select.mockReturnValue(builder);
  builder.update.mockReturnValue(builder);
  builder.insert.mockReturnValue(builder);
  builder.eq.mockReturnValue(builder);
  builder.gte.mockReturnValue(builder);
  builder.lt.mockReturnValue(builder);
  builder.order.mockReturnValue(builder);
  builder.returns.mockReturnValue(builder);
  return builder;
}

import type { ExecutionContext } from "@nestjs/common";
import { ThrottlerException, ThrottlerGuard } from "@nestjs/throttler";
import { ResilientThrottlerGuard } from "./resilient-throttler.guard";

function makeContext(): ExecutionContext {
  return {} as ExecutionContext;
}

function makeGuard(): ResilientThrottlerGuard {
  return new ResilientThrottlerGuard({} as never, {} as never, {} as never);
}

describe("ResilientThrottlerGuard", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("propušta zahtev kada osnovni guard baci gresku koja nije ThrottlerException (fail-open)", async () => {
    jest.spyOn(ThrottlerGuard.prototype, "canActivate").mockRejectedValue(new Error("redis down"));

    await expect(makeGuard().canActivate(makeContext())).resolves.toBe(true);
  });

  it("propagira ThrottlerException (stvarno premasen limit ostaje blokiran)", async () => {
    const exception = new ThrottlerException();
    jest.spyOn(ThrottlerGuard.prototype, "canActivate").mockRejectedValue(exception);

    await expect(makeGuard().canActivate(makeContext())).rejects.toBe(exception);
  });

  it("vraca rezultat osnovnog guard-a kada nema greske", async () => {
    jest.spyOn(ThrottlerGuard.prototype, "canActivate").mockResolvedValue(true);

    await expect(makeGuard().canActivate(makeContext())).resolves.toBe(true);
  });
});

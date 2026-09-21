import { BadRequestException, InternalServerErrorException } from "@nestjs/common";
import type { ArgumentsHost } from "@nestjs/common";
import { BaseExceptionFilter } from "@nestjs/core";
import * as sentry from "../sentry";
import { SentryExceptionFilter } from "./sentry-exception.filter";

describe("SentryExceptionFilter", () => {
  let filter: SentryExceptionFilter;
  let captureExceptionSpy: jest.SpyInstance;
  let baseCatchSpy: jest.SpyInstance;
  const host = {} as ArgumentsHost;

  beforeEach(() => {
    filter = new SentryExceptionFilter(undefined);
    captureExceptionSpy = jest.spyOn(sentry, "captureException").mockImplementation(() => undefined);
    baseCatchSpy = jest.spyOn(BaseExceptionFilter.prototype, "catch").mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("prijavljuje Sentry-ju izuzetak koji NIJE HttpException (neocekivana greska)", () => {
    const error = new Error("neocekivana greska");
    filter.catch(error, host);
    expect(captureExceptionSpy).toHaveBeenCalledWith(error);
    expect(baseCatchSpy).toHaveBeenCalledWith(error, host);
  });

  it("prijavljuje Sentry-ju 5xx HttpException", () => {
    const error = new InternalServerErrorException("baza je pukla");
    filter.catch(error, host);
    expect(captureExceptionSpy).toHaveBeenCalledWith(error);
  });

  it("NE prijavljuje 4xx HttpException (ocekivana greska, normalan tok kontrole)", () => {
    const error = new BadRequestException("nevalidan unos");
    filter.catch(error, host);
    expect(captureExceptionSpy).not.toHaveBeenCalled();
    expect(baseCatchSpy).toHaveBeenCalledWith(error, host);
  });
});

import type { Job } from "bullmq";
import { PushNotificationsProcessor } from "./push-notifications.processor";
import type { ExpoPushMessage } from "./push-notifications.queue";

function makeJob(data: ExpoPushMessage[], overrides: Partial<Job<ExpoPushMessage[]>> = {}): Job<ExpoPushMessage[]> {
  return { data, attemptsMade: 1, opts: { attempts: 3 }, ...overrides } as unknown as Job<ExpoPushMessage[]>;
}

describe("PushNotificationsProcessor", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  describe("process", () => {
    it("salje POST na Expo push API sa job.data kao telom zahteva", async () => {
      const fetchMock = jest.fn().mockResolvedValue({ ok: true });
      global.fetch = fetchMock as unknown as typeof fetch;
      const processor = new PushNotificationsProcessor();
      const messages: ExpoPushMessage[] = [{ to: "tok-1", title: "T", body: "B" }];

      await processor.process(makeJob(messages));

      expect(fetchMock).toHaveBeenCalledWith(
        "https://exp.host/--/api/v2/push/send",
        expect.objectContaining({ method: "POST", body: JSON.stringify(messages) }),
      );
    });

    it("baca gresku kada Expo API vrati ne-ok status (da bi BullMQ ponovio posao)", async () => {
      global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 500 }) as unknown as typeof fetch;
      const processor = new PushNotificationsProcessor();

      await expect(processor.process(makeJob([{ to: "tok-1", title: "T", body: "B" }]))).rejects.toThrow();
    });

    it("baca gresku na gore kada mrezni poziv odbije (da bi BullMQ ponovio posao)", async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error("network down")) as unknown as typeof fetch;
      const processor = new PushNotificationsProcessor();

      await expect(processor.process(makeJob([{ to: "tok-1", title: "T", body: "B" }]))).rejects.toThrow(
        "network down",
      );
    });
  });

  describe("onFailed", () => {
    it("ne loguje nista ako job jos ima preostalih pokusaja", () => {
      const processor = new PushNotificationsProcessor();
      const warnSpy = jest.spyOn((processor as unknown as { logger: { warn: jest.Mock } }).logger, "warn");

      processor.onFailed(makeJob([], { attemptsMade: 1, opts: { attempts: 3 } }), new Error("x"));

      expect(warnSpy).not.toHaveBeenCalled();
    });

    it("loguje upozorenje kada su svi pokusaji iskorisceni", () => {
      const processor = new PushNotificationsProcessor();
      const warnSpy = jest.spyOn((processor as unknown as { logger: { warn: jest.Mock } }).logger, "warn");

      processor.onFailed(makeJob([], { attemptsMade: 3, opts: { attempts: 3 } }), new Error("i dalje ne radi"));

      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("i dalje ne radi"));
    });

    it("ne baca gresku kada job nije definisan", () => {
      const processor = new PushNotificationsProcessor();

      expect(() => processor.onFailed(undefined, new Error("x"))).not.toThrow();
    });
  });
});

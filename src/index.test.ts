import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { mockDeep } from "vitest-mock-extended";
import { unstable_dev } from "wrangler";
import type { UnstableDevWorker } from "wrangler";

vi.mock("./prismaClientService", async (importOriginal) => {
  const mod = await importOriginal<typeof import("./prismaClientService")>();
  return {
    ...mod,
    prismaClientService: mockDeep(mod.prismaClientService),
  };
});

describe("Worker", () => {
  let worker: UnstableDevWorker;

  beforeAll(async () => {
    worker = await unstable_dev("src/index.ts", {
      experimental: { disableExperimentalWarning: true },
    });
  });

  afterAll(async () => {
    await worker.stop();
  });

  it("should return 404 on /", async () => {
    const resp = await worker.fetch();

    if (resp) {
      const text = await resp.text();
      expect(text).toMatchInlineSnapshot(
        `"{"status":404,"error":"Not Found"}"`
      );
    }
  });

  it(`should call handleSlack when request header "x-slack-signature" is present`, async () => {
    const resp = await worker.fetch("/", {
      headers: {
        "x-slack-signature": "test",
      },
    });
    if (resp) {
      const text = await resp.text();
      expect(text).toMatchInlineSnapshot(`"Invalid signature"`);
    }
  });
});

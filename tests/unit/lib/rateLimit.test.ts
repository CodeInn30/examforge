import { describe, it, expect, vi, beforeEach } from "vitest";

// Isolate the module so the in-memory Map is fresh for each test
beforeEach(() => {
  vi.resetModules();
});

async function getRateLimit() {
  // Redis is undefined in unit tests — forces in-memory path
  vi.doMock("@/lib/redis", () => ({ redis: null }));
  vi.doMock("@/lib/cacheKeys", () => ({ CacheKeys: { rate: (k: string) => `rate:${k}` } }));
  const mod = await import("@/lib/rateLimit");
  return mod.rateLimit;
}

describe("rateLimit (in-memory fallback)", () => {
  it("allows first request and returns correct remaining count", async () => {
    const rateLimit = await getRateLimit();
    const result = await rateLimit("test-key-1", 5, 60_000);
    expect(result.success).toBe(true);
    expect(result.remaining).toBe(4);
  });

  it("blocks request when limit is exceeded", async () => {
    const rateLimit = await getRateLimit();
    const key = "test-key-2";
    for (let i = 0; i < 3; i++) await rateLimit(key, 3, 60_000);
    const result = await rateLimit(key, 3, 60_000);
    expect(result.success).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it("tracks separate keys independently", async () => {
    const rateLimit = await getRateLimit();
    await rateLimit("key-a", 2, 60_000);
    await rateLimit("key-a", 2, 60_000);
    const blocked = await rateLimit("key-a", 2, 60_000);
    const other   = await rateLimit("key-b", 2, 60_000);
    expect(blocked.success).toBe(false);
    expect(other.success).toBe(true);
  });

  it("resets after the window expires", async () => {
    vi.useFakeTimers();
    const rateLimit = await getRateLimit();
    const key = "test-key-reset";

    await rateLimit(key, 1, 1_000);
    const blocked = await rateLimit(key, 1, 1_000);
    expect(blocked.success).toBe(false);

    vi.advanceTimersByTime(1_001);

    const reset = await rateLimit(key, 1, 1_000);
    expect(reset.success).toBe(true);
    vi.useRealTimers();
  });

  it("allows maxRequests exactly, blocks on maxRequests + 1", async () => {
    const rateLimit = await getRateLimit();
    const key = "test-key-exact";
    const max = 10;

    const results = await Promise.all(
      Array.from({ length: max }, () => rateLimit(key, max, 60_000))
    );
    expect(results.every((r) => r.success)).toBe(true);

    const over = await rateLimit(key, max, 60_000);
    expect(over.success).toBe(false);
  });
});

describe("getClientIp", () => {
  it("returns first IP from X-Forwarded-For", async () => {
    vi.doMock("@/lib/redis", () => ({ redis: null }));
    vi.doMock("@/lib/cacheKeys", () => ({ CacheKeys: { rate: (k: string) => k } }));
    const { getClientIp } = await import("@/lib/rateLimit");

    const req = new Request("http://localhost", {
      headers: { "x-forwarded-for": "203.0.113.1, 10.0.0.1" },
    });
    expect(getClientIp(req)).toBe("203.0.113.1");
  });

  it('returns "unknown" when header is absent', async () => {
    vi.doMock("@/lib/redis", () => ({ redis: null }));
    vi.doMock("@/lib/cacheKeys", () => ({ CacheKeys: { rate: (k: string) => k } }));
    const { getClientIp } = await import("@/lib/rateLimit");

    const req = new Request("http://localhost");
    expect(getClientIp(req)).toBe("unknown");
  });
});

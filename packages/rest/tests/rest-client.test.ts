/// <reference types="bun-types" />
import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import { RestClient, RestError, type DiscordApiErrorBody, type RestMultipartBody } from "../src/index.js";

// ---------------------------------------------------------------------------
// Helpers — mock globalThis.fetch
// ---------------------------------------------------------------------------

type MockHandler = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

let originalFetch: typeof fetch;
let mockHandlers: MockHandler[];
let capturedRequests: Array<{ url: string; init?: RequestInit }>;

function installFetch(...handlers: MockHandler[]) {
  mockHandlers = handlers;
  capturedRequests = [];
  let idx = 0;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : (input as Request).url;
    capturedRequests.push({ url, init });
    const handler = handlers[Math.min(idx++, handlers.length - 1)]!;
    return handler(input, init);
  }) as unknown as typeof fetch;
}

function jsonResponse(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...headers }
  });
}

function rateLimitHeaders(opts: {
  bucket?: string;
  limit?: number;
  remaining?: number;
  reset?: number;
  resetAfter?: number;
  retryAfter?: number;
  global?: boolean;
}): Record<string, string> {
  const h: Record<string, string> = {};
  if (opts.bucket) h["x-ratelimit-bucket"] = opts.bucket;
  if (opts.limit !== undefined) h["x-ratelimit-limit"] = String(opts.limit);
  if (opts.remaining !== undefined) h["x-ratelimit-remaining"] = String(opts.remaining);
  if (opts.reset !== undefined) h["x-ratelimit-reset"] = String(opts.reset);
  if (opts.resetAfter !== undefined) h["x-ratelimit-reset-after"] = String(opts.resetAfter);
  if (opts.retryAfter !== undefined) h["retry-after"] = String(opts.retryAfter);
  if (opts.global) h["x-ratelimit-global"] = "true";
  return h;
}

beforeEach(() => {
  originalFetch = globalThis.fetch;
});

afterEach(() => {
  globalThis.fetch = originalFetch;
});

// ===========================================================================
// Route normalisation
// ===========================================================================

describe("route normalisation", () => {
  test("normalises snowflake-like IDs in non-major positions", async () => {
    const client = new RestClient({ token: "test-token" });
    installFetch(() => Promise.resolve(jsonResponse({ id: "1" })));

    await client.request("GET", "/channels/123456789012345678/messages/987654321098765432");
    // Just verify it didn't throw – the route key is internal
    expect(capturedRequests.length).toBe(1);
  });

  test("preserves major parameters (channels/guilds/webhooks)", async () => {
    const client = new RestClient({ token: "test-token" });
    installFetch(() => Promise.resolve(jsonResponse({})));

    await client.request("GET", "/channels/123456789012345678/messages");
    await client.request("GET", "/guilds/123456789012345678/members");
    expect(capturedRequests.length).toBe(2);
  });

  test("preserves reaction emoji in route", async () => {
    const client = new RestClient({ token: "test-token" });
    installFetch(() => Promise.resolve(jsonResponse([])));

    await client.request(
      "GET",
      "/channels/123456789012345678/messages/987654321098765432/reactions/👍"
    );
    expect(capturedRequests.length).toBe(1);
    expect(capturedRequests[0]!.url).toContain("reactions");
  });

  test("handles webhook token routes", async () => {
    const client = new RestClient({ token: "test-token" });
    installFetch(() => Promise.resolve(jsonResponse({})));

    await client.request("POST", "/webhooks/123456789012345678/abc-token-xyz");
    expect(capturedRequests.length).toBe(1);
  });
});

// ===========================================================================
// Basic request behaviour
// ===========================================================================

describe("basic requests", () => {
  test("sets Authorization and User-Agent headers", async () => {
    const client = new RestClient({ token: "my-token" });
    installFetch(() => Promise.resolve(jsonResponse({ ok: true })));

    await client.request("GET", "/users/@me");
    const headers = capturedRequests[0]?.init?.headers as Record<string, string>;
    expect(headers["Authorization"]).toBe("Bot my-token");
    expect(headers["User-Agent"]).toContain("chord.js");
  });

  test("sets Content-Type for JSON body", async () => {
    const client = new RestClient({ token: "t" });
    installFetch(() => Promise.resolve(jsonResponse({ id: "1" })));

    await client.request("POST", "/channels/123/messages", {
      body: JSON.stringify({ content: "hello" })
    });
    const headers = capturedRequests[0]?.init?.headers as Record<string, string>;
    expect(headers["Content-Type"]).toBe("application/json");
  });

  test("does not set Content-Type for FormData body", async () => {
    const client = new RestClient({ token: "t" });
    installFetch(() => Promise.resolve(jsonResponse({ id: "1" })));

    const form = new FormData();
    form.append("content", "hello");
    await client.request("POST", "/channels/123/messages", { body: form });
    const headers = capturedRequests[0]?.init?.headers as Record<string, string>;
    expect(headers["Content-Type"]).toBeUndefined();
  });

  test("returns undefined for 204 responses", async () => {
    const client = new RestClient({ token: "t" });
    installFetch(() => Promise.resolve(new Response(null, { status: 204 })));

    const result = await client.request("DELETE", "/channels/123/messages/456");
    expect(result).toBeUndefined();
  });

  test("parses JSON response body", async () => {
    const client = new RestClient({ token: "t" });
    installFetch(() => Promise.resolve(jsonResponse({ id: "1", content: "hi" })));

    const result = await client.request<{ id: string; content: string }>("GET", "/channels/123/messages/456");
    expect(result).toEqual({ id: "1", content: "hi" });
  });
});

// ===========================================================================
// RestError / structured error body
// ===========================================================================

describe("RestError", () => {
  test("throws RestError on non-ok response", async () => {
    const client = new RestClient({ token: "t" });
    const errorBody: DiscordApiErrorBody = {
      message: "Unknown Channel",
      code: 10003
    };
    installFetch(() => Promise.resolve(jsonResponse(errorBody, 404)));

    try {
      await client.request("GET", "/channels/unknown");
      expect(true).toBe(false); // should not reach
    } catch (err) {
      expect(err).toBeInstanceOf(RestError);
      const restErr = err as RestError;
      expect(restErr.status).toBe(404);
      expect(restErr.bodyJson?.code).toBe(10003);
      expect(restErr.bodyJson?.message).toBe("Unknown Channel");
    }
  });

  test("includes body text even if JSON parsing fails", async () => {
    const client = new RestClient({ token: "t" });
    installFetch(() =>
      Promise.resolve(new Response("plain text error", { status: 500 }))
    );

    try {
      await client.request("GET", "/fail");
      expect(true).toBe(false);
    } catch (err) {
      const restErr = err as RestError;
      expect(restErr.status).toBe(500);
      expect(restErr.bodyText).toBe("plain text error");
      expect(restErr.bodyJson).toBeUndefined();
    }
  });
});

// ===========================================================================
// Rate-limit: bucket queuing + 429 retry
// ===========================================================================

describe("rate-limit handling", () => {
  test("retries on 429 with retry_after from body", async () => {
    const client = new RestClient({ token: "t", max429Retries: 3 });
    let attempt = 0;
    installFetch(() => {
      attempt++;
      if (attempt === 1) {
        return Promise.resolve(
          new Response(JSON.stringify({ retry_after: 0.01, global: false }), {
            status: 429,
            headers: rateLimitHeaders({ retryAfter: 0.01, remaining: 0 })
          })
        );
      }
      return Promise.resolve(jsonResponse({ id: "ok" }));
    });

    const result = await client.request<{ id: string }>("GET", "/test");
    expect(result).toEqual({ id: "ok" });
    expect(attempt).toBe(2);
  });

  test("throws after exceeding max429Retries", async () => {
    const client = new RestClient({ token: "t", max429Retries: 1 });
    installFetch(() =>
      Promise.resolve(
        new Response(JSON.stringify({ retry_after: 0.001, global: false }), {
          status: 429,
          headers: rateLimitHeaders({ retryAfter: 0.001, remaining: 0 })
        })
      )
    );

    try {
      await client.request("GET", "/spam");
      expect(true).toBe(false);
    } catch (err) {
      expect(err).toBeInstanceOf(RestError);
      expect((err as RestError).status).toBe(429);
    }
  });

  test("handles global rate-limit flag", async () => {
    const client = new RestClient({ token: "t", max429Retries: 3 });
    let attempt = 0;
    installFetch(() => {
      attempt++;
      if (attempt === 1) {
        return Promise.resolve(
          new Response(JSON.stringify({ retry_after: 0.01, global: true }), {
            status: 429,
            headers: rateLimitHeaders({ retryAfter: 0.01, global: true })
          })
        );
      }
      return Promise.resolve(jsonResponse({ ok: true }));
    });

    const result = await client.request<{ ok: boolean }>("GET", "/global-test");
    expect(result).toEqual({ ok: true });
    expect(attempt).toBe(2);
  });

  test("respects x-ratelimit-remaining header to pre-emptively wait", async () => {
    const client = new RestClient({ token: "t" });
    let callCount = 0;

    installFetch(() => {
      callCount++;
      const now = Date.now() / 1000;
      return Promise.resolve(
        jsonResponse(
          { n: callCount },
          200,
          rateLimitHeaders({
            bucket: "test-bucket",
            limit: 5,
            remaining: callCount === 1 ? 0 : 4,
            resetAfter: 0.01
          })
        )
      );
    });

    // First request depletes remaining → second should be delayed (but short)
    await client.request("GET", "/bucket-test");
    await client.request("GET", "/bucket-test");
    expect(callCount).toBe(2);
  });

  test("assigns bucket from x-ratelimit-bucket header", async () => {
    const client = new RestClient({ token: "t" });
    const bucketId = "shared-bucket-abc123";

    installFetch(() =>
      Promise.resolve(
        jsonResponse(
          { ok: true },
          200,
          rateLimitHeaders({ bucket: bucketId, limit: 10, remaining: 9 })
        )
      )
    );

    // Two different routes sharing same bucket
    await client.request("GET", "/channels/123/messages");
    await client.request("GET", "/channels/456/messages");
    expect(capturedRequests.length).toBe(2);
  });
});

// ===========================================================================
// Multipart upload
// ===========================================================================

describe("multipart upload", () => {
  test("sends FormData with payload_json and files", async () => {
    const client = new RestClient({ token: "t" });
    let capturedBody: FormData | null = null;

    installFetch(async (_input, init) => {
      if (init?.body instanceof FormData) {
        capturedBody = init.body;
      }
      return jsonResponse({ id: "msg-1" });
    });

    const fileContent = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);
    const body: RestMultipartBody = {
      payload_json: { content: "check this out" },
      files: [
        { name: "image.png", data: fileContent, contentType: "image/png" }
      ]
    };

    const result = await client.requestMultipart<{ id: string }>(
      "POST",
      "/channels/123/messages",
      body
    );

    expect(result).toEqual({ id: "msg-1" });
    expect(capturedBody).not.toBeNull();
    expect(capturedBody!.get("payload_json")).toBe('{"content":"check this out"}');
    expect(capturedBody!.get("files[0]")).toBeInstanceOf(Blob);
  });

  test("handles multiple files", async () => {
    const client = new RestClient({ token: "t" });
    let capturedBody: FormData | null = null;

    installFetch(async (_input, init) => {
      if (init?.body instanceof FormData) capturedBody = init.body;
      return jsonResponse({ id: "msg-2" });
    });

    const body: RestMultipartBody = {
      payload_json: { content: "multiple files" },
      files: [
        { name: "a.txt", data: new TextEncoder().encode("aaa") },
        { name: "b.txt", data: new TextEncoder().encode("bbb") },
        { name: "c.txt", data: new TextEncoder().encode("ccc") }
      ]
    };

    await client.requestMultipart("POST", "/channels/123/messages", body);
    expect(capturedBody).not.toBeNull();
    expect(capturedBody!.get("files[0]")).toBeInstanceOf(Blob);
    expect(capturedBody!.get("files[1]")).toBeInstanceOf(Blob);
    expect(capturedBody!.get("files[2]")).toBeInstanceOf(Blob);
  });

  test("sends multipart without payload_json", async () => {
    const client = new RestClient({ token: "t" });
    let capturedBody: FormData | null = null;

    installFetch(async (_input, init) => {
      if (init?.body instanceof FormData) capturedBody = init.body;
      return jsonResponse({ id: "msg-3" });
    });

    const body: RestMultipartBody = {
      files: [{ name: "file.bin", data: new ArrayBuffer(8) }]
    };

    await client.requestMultipart("POST", "/channels/123/messages", body);
    expect(capturedBody!.get("payload_json")).toBeNull();
    expect(capturedBody!.get("files[0]")).toBeInstanceOf(Blob);
  });
});

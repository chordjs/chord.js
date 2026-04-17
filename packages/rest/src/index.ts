import { sleep } from "@chordjs/utils";

export interface RestClientOptions {
  token: string;
  baseUrl?: string;
  userAgent?: string;
  max429Retries?: number;
}

export type RestFileData = Blob | File | ArrayBuffer | Uint8Array;

export interface RestFile {
  name: string;
  data: RestFileData;
  contentType?: string;
}

export interface RestMultipartBody {
  payload_json?: unknown;
  files: RestFile[];
}

export interface DiscordApiErrorBody {
  message?: string;
  code?: number;
  errors?: unknown;
  retry_after?: number;
  global?: boolean;
}

type RatelimitInfo = {
  bucketId?: string;
  limit?: number;
  remaining?: number;
  resetAtMs?: number;
  resetAfterMs?: number;
  isGlobal?: boolean;
  retryAfterMs?: number;
};

export class RestError extends Error {
  public readonly status: number;
  public readonly bodyText: string;
  public readonly bodyJson?: DiscordApiErrorBody;

  constructor(message: string, status: number, bodyText: string, bodyJson?: DiscordApiErrorBody) {
    super(message);
    this.name = "RestError";
    this.status = status;
    this.bodyText = bodyText;
    this.bodyJson = bodyJson;
  }
}

class RatelimitBucket {
  remaining: number | null = null;
  resetAtMs: number | null = null;
  queue: Promise<void> = Promise.resolve();

  schedule<T>(fn: () => Promise<T>): Promise<T> {
    const run = async () => fn();
    const chained = this.queue.then(run, run);
    this.queue = chained.then(
      () => undefined,
      () => undefined
    );
    return chained;
  }

  async waitIfNeeded(): Promise<void> {
    if (this.remaining !== null && this.remaining <= 0 && this.resetAtMs !== null) {
      const delay = this.resetAtMs - Date.now();
      if (delay > 0) await sleep(delay);
    }
  }
}

export class RestClient {
  public readonly token: string;
  public readonly baseUrl: string;
  public readonly userAgent: string;
  public readonly max429Retries: number;

  #globalResetAtMs: number | null = null;
  #globalQueue: Promise<void> = Promise.resolve();
  readonly #bucketsById = new Map<string, RatelimitBucket>();
  readonly #bucketIdByRoute = new Map<string, string>();
  readonly #bucketsByRoute = new Map<string, RatelimitBucket>();

  constructor(options: RestClientOptions) {
    this.token = options.token;
    this.baseUrl = options.baseUrl ?? "https://discord.com/api/v10";
    this.userAgent = options.userAgent ?? "chord.js (https://github.com/chord-js/chord.js, 0.0.0)";
    this.max429Retries = options.max429Retries ?? 5;
  }

  async request<T = unknown>(method: string, path: string, init: RequestInit = {}): Promise<T> {
    const url = new URL(path.replace(/^\//, ""), this.baseUrl.endsWith("/") ? this.baseUrl : `${this.baseUrl}/`);
    const routeKey = this.#routeKey(method, url.pathname);
    const bucket = this.#bucketForRoute(routeKey);

    return bucket.schedule(async () => {
      return this.#scheduleGlobal(async () => {
        for (let attempt = 0; ; attempt++) {
          await this.#waitForGlobal();
          await bucket.waitIfNeeded();

          const res = await fetch(url, {
            ...init,
            method,
            headers: {
              "Authorization": `Bot ${this.token}`,
              "User-Agent": this.userAgent,
              ...(this.#shouldSetJsonContentType(init.body) ? { "Content-Type": "application/json" } : null),
              ...(init.headers ?? {})
            }
          });

          const info = this.#parseRatelimitHeaders(res.headers);
          this.#applyRatelimitInfo(routeKey, bucket, info);

          if (res.status === 429) {
            const bodyJson = (await this.#tryJson<DiscordApiErrorBody>(res.clone())) ?? undefined;
            const bodyRetryMs =
              typeof bodyJson?.retry_after === "number" && Number.isFinite(bodyJson.retry_after)
                ? Math.max(0, bodyJson.retry_after * 1000)
                : undefined;
            const isGlobal = bodyJson?.global === true || info.isGlobal === true;
            const retryAfterMs = bodyRetryMs ?? info.retryAfterMs ?? info.resetAfterMs ?? 1000;

            if (attempt >= this.max429Retries) {
              const bodyText = await res.text().catch(() => "");
              throw new RestError(
                `REST rate-limited too many times: ${method} ${url.pathname}`,
                res.status,
                bodyText,
                bodyJson
              );
            }

            if (isGlobal) {
              this.#globalResetAtMs = Date.now() + retryAfterMs;
            } else {
              bucket.remaining = 0;
              bucket.resetAtMs = Date.now() + retryAfterMs;
            }
            await sleep(retryAfterMs);
            continue; // retry within the same schedule slot
          }

          if (!res.ok) {
            const bodyText = await res.text().catch(() => "");
            const bodyJson = this.#tryParseJson<DiscordApiErrorBody>(bodyText);
            throw new RestError(`REST request failed: ${method} ${url.pathname}`, res.status, bodyText, bodyJson);
          }

          if (res.status === 204) return undefined as T;
          return (await res.json()) as T;
        }
      });
    });
  }

  get<T = unknown>(path: string, init?: Omit<RequestInit, "method">): Promise<T> {
    return this.request<T>("GET", path, init);
  }

  post<T = unknown>(path: string, init?: Omit<RequestInit, "method">): Promise<T> {
    return this.request<T>("POST", path, init);
  }

  put<T = unknown>(path: string, init?: Omit<RequestInit, "method">): Promise<T> {
    return this.request<T>("PUT", path, init);
  }

  patch<T = unknown>(path: string, init?: Omit<RequestInit, "method">): Promise<T> {
    return this.request<T>("PATCH", path, init);
  }

  delete<T = unknown>(path: string, init?: Omit<RequestInit, "method">): Promise<T> {
    return this.request<T>("DELETE", path, init);
  }

  async requestMultipart<T = unknown>(
    method: string,
    path: string,
    body: RestMultipartBody,
    init: Omit<RequestInit, "body" | "method"> = {}
  ): Promise<T> {
    const form = new FormData();
    if (body.payload_json !== undefined) {
      form.append("payload_json", JSON.stringify(body.payload_json));
    }

    body.files.forEach((file, idx) => {
      const value = this.#toBlob(file.data, file.contentType);
      form.append(`files[${idx}]`, value, file.name);
    });

    return this.request<T>(method, path, {
      ...init,
      body: form
    });
  }

  #routeKey(method: string, pathname: string): string {
    const normalized = this.#normalizeRoute(pathname);
    return `${method.toUpperCase()} ${normalized}`;
  }

  #normalizeRoute(pathname: string): string {
    const parts = pathname.replace(/^\//, "").split("/").filter(Boolean);
    const majorKeys = new Set(["channels", "guilds", "webhooks", "interactions"]);

    const out: string[] = [];
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]!;
      const prev = parts[i - 1];
      const next = parts[i + 1];

      // Preserve reaction emoji segment as-is to avoid bucket collisions.
      if (prev === "reactions") {
        out.push(part);
        continue;
      }

      // Keep webhook/interactions token pair segments untouched.
      if ((prev === "webhooks" || prev === "interactions") && typeof part === "string") {
        out.push(part);
        continue;
      }

      if (typeof prev === "string" && majorKeys.has(prev)) {
        out.push(part);
        continue;
      }

      // Replace snowflake-like IDs with :id
      if (/^\d{16,20}$/.test(part)) {
        out.push(":id");
        continue;
      }

      // Route special-case: /channels/:id/messages/:id/reactions/:emoji/(...)
      // Keep :emoji as-is (already handled above), normalize message id.
      if (prev === "messages" && next === "reactions" && /^\d{16,20}$/.test(part)) {
        out.push(":id");
        continue;
      }

      out.push(part);
    }

    return `/${out.join("/")}`;
  }

  #bucketForRoute(routeKey: string): RatelimitBucket {
    const bucketId = this.#bucketIdByRoute.get(routeKey);
    if (!bucketId) {
      const existing = this.#bucketsByRoute.get(routeKey);
      if (existing) return existing;
      const created = new RatelimitBucket();
      this.#bucketsByRoute.set(routeKey, created);
      return created;
    }
    const existing = this.#bucketsById.get(bucketId);
    if (existing) return existing;
    const created = new RatelimitBucket();
    this.#bucketsById.set(bucketId, created);
    return created;
  }

  #applyRatelimitInfo(routeKey: string, bucket: RatelimitBucket, info: RatelimitInfo): void {
    if (info.bucketId) {
      this.#bucketIdByRoute.set(routeKey, info.bucketId);
      const canonical = this.#bucketsById.get(info.bucketId) ?? bucket;
      this.#bucketsById.set(info.bucketId, canonical);
      this.#bucketsByRoute.set(routeKey, canonical);
    }

    if (typeof info.remaining === "number") bucket.remaining = info.remaining;
    if (typeof info.resetAtMs === "number") bucket.resetAtMs = info.resetAtMs;
    if (typeof info.resetAfterMs === "number") bucket.resetAtMs = Date.now() + info.resetAfterMs;

    if (info.isGlobal && typeof info.resetAfterMs === "number") {
      this.#globalResetAtMs = Date.now() + info.resetAfterMs;
    }
  }

  async #waitForGlobal(): Promise<void> {
    if (this.#globalResetAtMs === null) return;
    const delay = this.#globalResetAtMs - Date.now();
    if (delay > 0) await sleep(delay);
  }

  #scheduleGlobal<T>(task: () => Promise<T>): Promise<T> {
    const run = async () => task();
    const chained = this.#globalQueue.then(run, run);
    this.#globalQueue = chained.then(
      () => undefined,
      () => undefined
    );
    return chained;
  }

  #parseRatelimitHeaders(headers: Headers): RatelimitInfo {
    const bucketId = headers.get("x-ratelimit-bucket") ?? undefined;
    const limitRaw = headers.get("x-ratelimit-limit");
    const remainingRaw = headers.get("x-ratelimit-remaining");
    const resetRaw = headers.get("x-ratelimit-reset");
    const resetAfterRaw = headers.get("x-ratelimit-reset-after");
    const retryAfterRaw = headers.get("retry-after");
    const isGlobal = headers.get("x-ratelimit-global") === "true";

    const limit = limitRaw !== null ? Number(limitRaw) : undefined;
    const remaining = remainingRaw !== null ? Number(remainingRaw) : undefined;
    const resetEpoch = resetRaw !== null ? Number(resetRaw) : undefined; // seconds (float)
    const resetAfterSec = resetAfterRaw !== null ? Number(resetAfterRaw) : undefined;
    const retryAfterSec = retryAfterRaw !== null ? Number(retryAfterRaw) : undefined;

    return {
      bucketId,
      limit: typeof limit === "number" && Number.isFinite(limit) ? limit : undefined,
      remaining: Number.isFinite(remaining) ? remaining : undefined,
      resetAtMs:
        typeof resetEpoch === "number" && Number.isFinite(resetEpoch) ? Math.max(0, resetEpoch * 1000) : undefined,
      resetAfterMs:
        typeof resetAfterSec === "number" && Number.isFinite(resetAfterSec) ? Math.max(0, resetAfterSec * 1000) : undefined,
      isGlobal,
      retryAfterMs:
        typeof retryAfterSec === "number" && Number.isFinite(retryAfterSec) ? Math.max(0, retryAfterSec * 1000) : undefined
    };
  }

  async #tryJson<T>(res: Response): Promise<T | null> {
    try {
      return (await res.json()) as T;
    } catch {
      return null;
    }
  }

  #tryParseJson<T>(text: string): T | undefined {
    if (!text) return undefined;
    try {
      return JSON.parse(text) as T;
    } catch {
      return undefined;
    }
  }

  #shouldSetJsonContentType(body: RequestInit["body"] | null | undefined): boolean {
    if (!body) return false;
    if (typeof FormData !== "undefined" && body instanceof FormData) return false;
    if (typeof URLSearchParams !== "undefined" && body instanceof URLSearchParams) return false;
    if (typeof Blob !== "undefined" && body instanceof Blob) return false;
    if (typeof ArrayBuffer !== "undefined" && body instanceof ArrayBuffer) return false;
    return true;
  }

  #toBlob(data: RestFileData, contentType?: string): Blob {
    if (typeof Blob !== "undefined" && data instanceof Blob) return data;
    if (typeof File !== "undefined" && data instanceof File) return data;
    if (typeof ArrayBuffer !== "undefined" && data instanceof ArrayBuffer) {
      return new Blob([data], contentType ? { type: contentType } : undefined);
    }
    if (data instanceof Uint8Array) {
      const arrayBuffer = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer;
      return new Blob([arrayBuffer], contentType ? { type: contentType } : undefined);
    }
    return new Blob([data], contentType ? { type: contentType } : undefined);
  }
}

export interface RateLimitErrorOptions {
  status?: number;
  retryAfterMs?: number;
  url?: string;
  rawMessage?: string;
}

export class RateLimitError extends Error {
  public readonly status: number;
  public readonly retryAfterMs: number;
  public readonly url?: string;
  public readonly rawMessage?: string;
  public readonly isRateLimit = true;

  constructor(message: string, options: RateLimitErrorOptions = {}) {
    super(message);
    this.name = 'RateLimitError';
    this.status = options.status ?? 429;
    this.retryAfterMs = options.retryAfterMs ?? 3000;
    this.url = options.url;
    this.rawMessage = options.rawMessage;
  }
}

export function isRateLimitError(err: unknown): boolean {
  if (!err) return false;
  if (err instanceof RateLimitError) return true;
  if (typeof err === 'object' && 'isRateLimit' in err && (err as { isRateLimit?: boolean }).isRateLimit) {
    return true;
  }
  const msg = err instanceof Error ? err.message : String(err);
  return /rate\s*exceeded|too\s*many\s*requests|\b429\b|quota\s*exceeded/i.test(msg);
}

export function parseRetryAfterMs(headerValue: string | null | undefined, nowMs = Date.now()): number {
  if (!headerValue) return 0;
  const trimmed = headerValue.trim();
  const seconds = Number(trimmed);
  if (Number.isFinite(seconds) && seconds >= 0) {
    return Math.round(seconds * 1000);
  }
  const dateMs = Date.parse(trimmed);
  if (!Number.isNaN(dateMs)) {
    return Math.max(0, dateMs - nowMs);
  }
  return 0;
}

export function computeBackoffDelayMs(
  attempt: number,
  baseDelayMs = 600,
  maxDelayMs = 15000,
  retryAfterMs = 0,
  jitterFactor = 0.2
): number {
  const exp = Math.min(maxDelayMs, baseDelayMs * Math.pow(2, Math.max(0, attempt)));
  const jitter = exp * jitterFactor * Math.random();
  return Math.min(maxDelayMs, Math.max(retryAfterMs, Math.round(exp + jitter)));
}

export function getFriendlyNetworkErrorMessage(err: unknown): string {
  if (isRateLimitError(err)) {
    return "Santa's workshop servers are briefly busy. Please wait a moment and try again.";
  }
  return 'Could not load part of the holiday maze right now. Please check your connection and try again.';
}

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

export interface SafeRequestClientOptions {
  minIntervalMs?: number;
  maxRetries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  defaultCacheTtlMs?: number;
}

export class SafeRequestClient {
  private inFlight = new Map<string, Promise<unknown>>();
  private cache = new Map<string, CacheEntry<unknown>>();
  private lastRequestTime = new Map<string, number>();
  private rateLimitUntil = new Map<string, number>();

  private readonly minIntervalMs: number;
  private readonly maxRetries: number;
  private readonly baseDelayMs: number;
  private readonly maxDelayMs: number;
  private readonly defaultCacheTtlMs: number;

  constructor(options: SafeRequestClientOptions = {}) {
    this.minIntervalMs = options.minIntervalMs ?? 250;
    this.maxRetries = options.maxRetries ?? 3;
    this.baseDelayMs = options.baseDelayMs ?? 600;
    this.maxDelayMs = options.maxDelayMs ?? 15000;
    this.defaultCacheTtlMs = options.defaultCacheTtlMs ?? 30000;
  }

  public getCooldownRemainingMs(key = '__global__'): number {
    const until = Math.max(
      this.rateLimitUntil.get(key) ?? 0,
      this.rateLimitUntil.get('__global__') ?? 0
    );
    return Math.max(0, until - Date.now());
  }

  public clearCache(key?: string) {
    if (key) {
      this.cache.delete(key);
      this.rateLimitUntil.delete(key);
    } else {
      this.cache.clear();
      this.rateLimitUntil.clear();
    }
  }

  public async run<T>(
    key: string,
    executor: () => Promise<T>,
    opts: {
      cacheTtlMs?: number;
      bypassCache?: boolean;
      maxRetries?: number;
    } = {}
  ): Promise<T> {
    const ttl = opts.cacheTtlMs ?? this.defaultCacheTtlMs;

    if (!opts.bypassCache && ttl > 0) {
      const cached = this.cache.get(key) as CacheEntry<T> | undefined;
      if (cached && cached.expiresAt > Date.now()) {
        return cached.value;
      }
      if (cached) {
        this.cache.delete(key);
      }
    }

    const existing = this.inFlight.get(key) as Promise<T> | undefined;
    if (existing) {
      return existing;
    }

    const cooldownMs = this.getCooldownRemainingMs(key);
    if (cooldownMs > 0) {
      throw new RateLimitError(getFriendlyNetworkErrorMessage(new RateLimitError('cooldown')), {
        status: 429,
        retryAfterMs: cooldownMs,
        url: key,
        rawMessage: `Client cooldown active (${cooldownMs}ms remaining)`,
      });
    }

    const maxAttempts = (opts.maxRetries ?? this.maxRetries) + 1;

    const promise = (async () => {
      // Basic per-key throttle spacing
      const lastTs = this.lastRequestTime.get(key) ?? 0;
      const sinceLast = Date.now() - lastTs;
      if (sinceLast < this.minIntervalMs) {
        await delay(this.minIntervalMs - sinceLast);
      }

      let lastErr: unknown;
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        this.lastRequestTime.set(key, Date.now());
        try {
          const result = await executor();
          if (ttl > 0) {
            this.cache.set(key, { value: result, expiresAt: Date.now() + ttl });
          }
          return result;
        } catch (err) {
          lastErr = err;
          const rateLimited = isRateLimitError(err);
          const retryAfterMs =
            err instanceof RateLimitError ? err.retryAfterMs : rateLimited ? 2000 : 0;

          if (rateLimited) {
            const backoff = computeBackoffDelayMs(
              attempt,
              this.baseDelayMs,
              this.maxDelayMs,
              retryAfterMs
            );
            this.rateLimitUntil.set(key, Date.now() + backoff);
            console.warn('[NetworkGuard] Rate limit detected:', {
              key,
              attempt: attempt + 1,
              maxAttempts,
              retryInMs: backoff,
              raw: err instanceof Error ? err.message : String(err),
            });
            if (attempt + 1 >= maxAttempts) {
              throw err instanceof RateLimitError
                ? err
                : new RateLimitError(getFriendlyNetworkErrorMessage(err), {
                    status: 429,
                    retryAfterMs: backoff,
                    url: key,
                    rawMessage: err instanceof Error ? err.message : String(err),
                  });
            }
            await delay(backoff);
            continue;
          }

          if (attempt + 1 >= maxAttempts) {
            throw err;
          }
          const backoff = computeBackoffDelayMs(attempt, this.baseDelayMs, this.maxDelayMs, 0);
          await delay(backoff);
        }
      }

      throw lastErr;
    })().finally(() => {
      this.inFlight.delete(key);
    });

    this.inFlight.set(key, promise);
    return promise;
  }
}

export async function safeFetchJson<T>(
  url: string,
  init?: RequestInit,
  client: SafeRequestClient = sharedRequestClient,
  cacheTtlMs = 30000
): Promise<T> {
  const method = (init?.method ?? 'GET').toUpperCase();
  const key = `${method}:${url}`;
  return client.run(
    key,
    async () => {
      const response = await fetch(url, init);
      if (response.status === 429) {
        const retryAfterMs = parseRetryAfterMs(response.headers.get('Retry-After')) || 3000;
        const bodyText = await response.text().catch(() => 'Rate exceeded');
        throw new RateLimitError(getFriendlyNetworkErrorMessage({ isRateLimit: true }), {
          status: 429,
          retryAfterMs,
          url,
          rawMessage: bodyText.slice(0, 200),
        });
      }
      if (!response.ok) {
        const bodyText = await response.text().catch(() => response.statusText);
        if (/rate\s*exceeded|too\s*many\s*requests/i.test(bodyText)) {
          throw new RateLimitError(getFriendlyNetworkErrorMessage({ isRateLimit: true }), {
            status: response.status,
            retryAfterMs: parseRetryAfterMs(response.headers.get('Retry-After')) || 3000,
            url,
            rawMessage: bodyText.slice(0, 200),
          });
        }
        throw new Error(`HTTP ${response.status} from ${url}`);
      }
      return (await response.json()) as T;
    },
    {
      cacheTtlMs: method === 'GET' ? cacheTtlMs : 0,
      bypassCache: method !== 'GET',
    }
  );
}

export function loadModuleWithRetry<T>(
  moduleKey: string,
  importer: () => Promise<T>,
  maxRetries = 2
): Promise<T> {
  return sharedRequestClient.run(
    `module:${moduleKey}`,
    async () => {
      try {
        return await importer();
      } catch (err) {
        if (isRateLimitError(err)) {
          throw new RateLimitError(getFriendlyNetworkErrorMessage(err), {
            status: 429,
            retryAfterMs: 2500,
            url: moduleKey,
            rawMessage: err instanceof Error ? err.message : String(err),
          });
        }
        throw err;
      }
    },
    {
      cacheTtlMs: 60 * 60 * 1000,
      maxRetries,
    }
  );
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const sharedRequestClient = new SafeRequestClient();

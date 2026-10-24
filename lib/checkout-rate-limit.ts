import { createHash } from "node:crypto";
import { isIP } from "node:net";

export const CHECKOUT_RATE_LIMIT_WINDOW_SECONDS = 60;
export const CHECKOUT_RATE_LIMIT_MAX_REQUESTS = 5;

export type CheckoutRateLimitResult =
  | { allowed: true }
  | { allowed: false; retryAfterSeconds: number }
  | { allowed: false; unavailable: true };

const RATE_LIMIT_SCRIPT = [
  "local count = redis.call('INCR', KEYS[1])",
  "if count == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]) end",
  "local ttl = redis.call('TTL', KEYS[1])",
  "return {count, ttl}",
].join("\n");

/** Shared atomic Upstash limiter. Fails closed; never falls back to process memory. */
export async function checkCheckoutRateLimit(request: Request): Promise<CheckoutRateLimitResult> {
  const rawUrl = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!rawUrl || !token) return { allowed: false, unavailable: true };

  let endpoint: URL;
  try {
    endpoint = new URL(rawUrl);
    if (endpoint.protocol !== "https:" || endpoint.username || endpoint.password) {
      return { allowed: false, unavailable: true };
    }
  } catch {
    return { allowed: false, unavailable: true };
  }

  // Use the platform-provided single-IP header; do not trust arbitrary X-Forwarded-For chains.
  const clientIp = request.headers.get("x-real-ip")?.trim();
  // Do not put all clients into one shared bucket if the trusted platform IP header is missing or malformed.
  if (!clientIp || isIP(clientIp) === 0) return { allowed: false, unavailable: true };
  const fingerprint = createHash("sha256").update(clientIp).digest("hex");
  const key = "checkout:rate:" + fingerprint;

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
      body: JSON.stringify(["EVAL", RATE_LIMIT_SCRIPT, "1", key, String(CHECKOUT_RATE_LIMIT_WINDOW_SECONDS)]),
      cache: "no-store",
    });
    if (!response.ok) return { allowed: false, unavailable: true };
    const payload: unknown = await response.json();
    if (!payload || typeof payload !== "object" || !("result" in payload)) {
      return { allowed: false, unavailable: true };
    }
    const result = (payload as { result?: unknown }).result;
    if (!Array.isArray(result) || result.length < 2) return { allowed: false, unavailable: true };
    const count = Number(result[0]);
    const ttl = Number(result[1]);
    if (!Number.isFinite(count) || !Number.isFinite(ttl) || count < 1) {
      return { allowed: false, unavailable: true };
    }
    if (count <= CHECKOUT_RATE_LIMIT_MAX_REQUESTS) return { allowed: true };
    return { allowed: false, retryAfterSeconds: Math.max(1, ttl) };
  } catch {
    return { allowed: false, unavailable: true };
  }
}

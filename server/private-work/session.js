import { createHash, createHmac, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);
const HASH_PREFIX = "scrypt";
const HASH_N = 16_384;
const HASH_R = 8;
const HASH_P = 1;
const HASH_BYTES = 64;
const HASH_MAX_MEMORY = 64 * 1024 * 1024;

function safeEqual(left, right) {
  const leftBuffer = Buffer.isBuffer(left) ? left : Buffer.from(left);
  const rightBuffer = Buffer.isBuffer(right) ? right : Buffer.from(right);
  if (leftBuffer.length !== rightBuffer.length) return false;
  return timingSafeEqual(leftBuffer, rightBuffer);
}

function parsePasswordHash(value) {
  const [prefix, rawN, rawR, rawP, salt, digest, ...extra] = String(value).split("$");
  if (extra.length || prefix !== HASH_PREFIX) return undefined;

  const N = Number(rawN);
  const r = Number(rawR);
  const p = Number(rawP);
  if (N !== HASH_N || r !== HASH_R || p !== HASH_P || !salt || !digest) return undefined;

  try {
    const saltBuffer = Buffer.from(salt, "base64url");
    const digestBuffer = Buffer.from(digest, "base64url");
    if (saltBuffer.length < 16 || digestBuffer.length !== HASH_BYTES) return undefined;
    return { N, r, p, salt: saltBuffer, digest: digestBuffer };
  } catch {
    return undefined;
  }
}

export async function createPasswordHash(password, salt = randomBytes(16)) {
  if (typeof password !== "string" || password.length < 16 || password.length > 512) {
    throw new Error("The password must be between 16 and 512 characters.");
  }

  const derived = await scrypt(password, salt, HASH_BYTES, {
    N: HASH_N,
    r: HASH_R,
    p: HASH_P,
    maxmem: HASH_MAX_MEMORY
  });

  return [HASH_PREFIX, HASH_N, HASH_R, HASH_P, salt.toString("base64url"), derived.toString("base64url")].join("$");
}

export async function verifyPassword(config, password) {
  const parsed = parsePasswordHash(config.passwordHash);
  if (!parsed || typeof password !== "string" || password.length > 512) return false;

  const derived = await scrypt(password, parsed.salt, parsed.digest.length, {
    N: parsed.N,
    r: parsed.r,
    p: parsed.p,
    maxmem: HASH_MAX_MEMORY
  });

  return safeEqual(derived, parsed.digest);
}

export function passwordFingerprint(passwordHash) {
  return createHash("sha256").update(String(passwordHash)).digest("hex");
}

function signPayload(secret, payload) {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export function createSessionValue(config, now = Math.floor(Date.now() / 1_000)) {
  const payload = Buffer.from(
    JSON.stringify({
      v: 1,
      iat: now,
      exp: now + config.sessionTtlSeconds,
      p: passwordFingerprint(config.passwordHash)
    })
  ).toString("base64url");

  return `v1.${payload}.${signPayload(config.sessionSecret, payload)}`;
}

export function verifySessionValue(config, value, now = Math.floor(Date.now() / 1_000)) {
  const [version, encodedPayload, signature, ...extra] = String(value).split(".");
  if (extra.length || version !== "v1" || !encodedPayload || !signature) return false;

  const expectedSignature = signPayload(config.sessionSecret, encodedPayload);
  if (!safeEqual(signature, expectedSignature)) return false;

  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8"));
    if (
      payload?.v !== 1 ||
      !Number.isInteger(payload.iat) ||
      !Number.isInteger(payload.exp) ||
      typeof payload.p !== "string"
    ) {
      return false;
    }

    return (
      payload.iat <= now &&
      payload.exp > now &&
      payload.exp - payload.iat <= config.sessionTtlSeconds &&
      safeEqual(payload.p, passwordFingerprint(config.passwordHash))
    );
  } catch {
    return false;
  }
}

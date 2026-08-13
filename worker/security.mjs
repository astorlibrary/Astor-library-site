export const PREVIEW_SLIDES = 3;
export const LIBRARY_PAGE_SIZE = 50;
export const LIBRARY_RECENT_LIMIT = 20;

const RECOVERY_WINDOW_SECONDS = 15 * 60;
const RECENT_AUTH_WINDOW_SECONDS = 15 * 60;
export const RECOVERY_CAPABILITY_TTL_SECONDS = 15 * 60;
const RESOURCE_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const LIBRARY_CURSOR_PATTERN = /^[A-Za-z0-9_-]{1,512}$/;
const PKCE_FLOW_ID_PATTERN = /^[a-zA-Z0-9_-]{8,64}$/;
const EMAIL_TOKEN_HASH_PATTERN = /^[a-zA-Z0-9_-]{16,256}$/;
const EMAIL_TOKEN_TYPES = new Set(['email', 'recovery', 'email_change']);
const RECOVERY_CAPABILITY_USER_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const RECOVERY_CAPABILITY_SIGNATURE_PATTERN = /^[A-Za-z0-9_-]{43}$/;
const POSTGRES_TIMESTAMP_PATTERN = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,6})?(?:Z|([+-])(\d{2}):(\d{2}))$/;

function base64UrlEncode(bytes) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64UrlDecode(value) {
  try {
    const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
    const binary = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '='));
    return Uint8Array.from(binary, character => character.charCodeAt(0));
  } catch {
    return null;
  }
}

function recoveryCapabilitySecret(value) {
  if (typeof value !== 'string' || value.length > 4_096) return null;
  const bytes = new TextEncoder().encode(value);
  return bytes.byteLength >= 32 ? bytes : null;
}

function recoveryCapabilityTime(value) {
  const seconds = value == null ? Math.floor(Date.now() / 1_000) : value;
  return Number.isSafeInteger(seconds) && seconds >= 0 ? seconds : null;
}

async function recoveryCapabilityKey(secret, usages) {
  const bytes = recoveryCapabilitySecret(secret);
  if (!bytes) return null;
  return crypto.subtle.importKey('raw', bytes, { name: 'HMAC', hash: 'SHA-256' }, false, usages);
}

function isValidPostgresTimestamp(value) {
  if (typeof value !== 'string') return false;
  const match = value.match(POSTGRES_TIMESTAMP_PATTERN);
  if (!match) return false;
  const [year, month, day, hour, minute, second, offsetSign, offsetHour, offsetMinute] = match.slice(1);
  const numbers = [year, month, day, hour, minute, second, offsetHour || '0', offsetMinute || '0'].map(Number);
  const [yearNumber, monthNumber, dayNumber, hourNumber, minuteNumber, secondNumber, offsetHourNumber, offsetMinuteNumber] = numbers;
  if (yearNumber < 2000 || yearNumber > 2200 || monthNumber < 1 || monthNumber > 12 ||
      hourNumber > 23 || minuteNumber > 59 || secondNumber > 59) return false;
  const daysInMonth = new Date(Date.UTC(yearNumber, monthNumber, 0)).getUTCDate();
  if (dayNumber < 1 || dayNumber > daysInMonth) return false;
  if (offsetSign && (offsetHourNumber > 14 || offsetMinuteNumber > 59 ||
      (offsetHourNumber === 14 && offsetMinuteNumber !== 0))) return false;
  return true;
}

function hasRecentMethod(claims, methods, windowSeconds) {
  const now = Math.floor(Date.now() / 1000);
  return Array.isArray(claims?.amr) && claims.amr.some(entry =>
    methods.has(entry?.method) &&
    Number.isFinite(Number(entry.timestamp)) &&
    Number(entry.timestamp) >= now - windowSeconds &&
    Number(entry.timestamp) <= now + 60
  );
}

export function hasRecentRecovery(claims) {
  return hasRecentMethod(claims, new Set(['recovery']), RECOVERY_WINDOW_SECONDS);
}

export function hasRecentAuthentication(claims) {
  return hasRecentMethod(claims, new Set(['password', 'recovery']), RECENT_AUTH_WINDOW_SECONDS);
}

export function isSafeResourceId(value) {
  return typeof value === 'string' &&
    value.length >= 1 &&
    value.length <= 128 &&
    RESOURCE_ID_PATTERN.test(value);
}

export function isValidLastSlide(value) {
  return value == null || (Number.isSafeInteger(value) && value >= 1 && value <= 250);
}

export function normalisePkceFlowId(value) {
  if (value == null) return null;
  return typeof value === 'string' && PKCE_FLOW_ID_PATTERN.test(value) ? value : false;
}

export function normaliseEmailTokenHash(value) {
  return typeof value === 'string' && EMAIL_TOKEN_HASH_PATTERN.test(value) ? value : false;
}

export function normaliseEmailTokenType(value) {
  return typeof value === 'string' && EMAIL_TOKEN_TYPES.has(value) ? value : false;
}

export function isValidRecoveryCapabilitySecret(value) {
  return recoveryCapabilitySecret(value) !== null;
}

export async function createRecoveryCapability(userId, secret, nowSeconds) {
  const now = recoveryCapabilityTime(nowSeconds);
  if (now === null || typeof userId !== 'string' || !RECOVERY_CAPABILITY_USER_PATTERN.test(userId)) return null;
  const key = await recoveryCapabilityKey(secret, ['sign']);
  if (!key) return null;

  const expiresAt = now + RECOVERY_CAPABILITY_TTL_SECONDS;
  const payload = `v1.${userId}.${expiresAt}`;
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
  return `${payload}.${base64UrlEncode(new Uint8Array(signature))}`;
}

export async function verifyRecoveryCapability(value, userId, secret, nowSeconds) {
  const now = recoveryCapabilityTime(nowSeconds);
  if (now === null || typeof value !== 'string' || value.length > 512 ||
      typeof userId !== 'string' || !RECOVERY_CAPABILITY_USER_PATTERN.test(userId)) return false;

  const parts = value.split('.');
  if (parts.length !== 4 || parts[0] !== 'v1' || parts[1] !== userId ||
      !/^\d{1,12}$/.test(parts[2]) || !RECOVERY_CAPABILITY_SIGNATURE_PATTERN.test(parts[3])) return false;
  const expiresAt = Number(parts[2]);
  if (!Number.isSafeInteger(expiresAt) || expiresAt <= now ||
      expiresAt > now + RECOVERY_CAPABILITY_TTL_SECONDS) return false;

  const signature = base64UrlDecode(parts[3]);
  const key = await recoveryCapabilityKey(secret, ['verify']);
  if (!signature || !key) return false;
  return crypto.subtle.verify(
    'HMAC',
    key,
    signature,
    new TextEncoder().encode(parts.slice(0, 3).join('.'))
  );
}

export function encodeLibraryCursor(savedAt, resourceId) {
  if (!isSafeResourceId(resourceId)) return null;
  if (!isValidPostgresTimestamp(savedAt)) return null;
  return btoa(JSON.stringify([savedAt, resourceId]))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

export function parseLibraryCursor(value) {
  if (value == null || value === '') return null;
  if (typeof value !== 'string' || !LIBRARY_CURSOR_PATTERN.test(value)) return false;
  try {
    const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
    const decoded = JSON.parse(atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '=')));
    if (!Array.isArray(decoded) || decoded.length !== 2 || !isSafeResourceId(decoded[1])) return false;
    if (!isValidPostgresTimestamp(decoded[0])) return false;
    return { savedAt: decoded[0], resourceId: decoded[1] };
  } catch {
    return false;
  }
}

export const PREVIEW_SLIDES = 3;
export const LIBRARY_PAGE_SIZE = 50;
export const LIBRARY_RECENT_LIMIT = 20;

const RECOVERY_WINDOW_SECONDS = 15 * 60;
const RECENT_AUTH_WINDOW_SECONDS = 15 * 60;
const RESOURCE_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const LIBRARY_CURSOR_PATTERN = /^[A-Za-z0-9_-]{1,512}$/;
const POSTGRES_TIMESTAMP_PATTERN = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,6})?(?:Z|([+-])(\d{2}):(\d{2}))$/;

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

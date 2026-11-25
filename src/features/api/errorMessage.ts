export const NETWORK_ERROR_MESSAGE = "Can't reach the server. Check your connection and try again.";
export const TIMEOUT_ERROR_MESSAGE = 'The request took too long. Please try again.';
const MAX_LENGTH = 300;

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

export function isNetworkError(err: unknown): boolean {
  return isRecord(err) && err.status === 'FETCH_ERROR';
}

export function isTimeoutError(err: unknown): boolean {
  return isRecord(err) && err.status === 'TIMEOUT_ERROR';
}

/** Plain, markup-free, length-capped text; null when unusable. */
function safeText(s: unknown): string | null {
  if (typeof s !== 'string') return null;
  const text = s.trim();
  if (!text || /[<>]/.test(text)) return null;
  return text.length > MAX_LENGTH ? `${text.slice(0, MAX_LENGTH).trimEnd()}…` : text;
}

function fieldErrors(v: unknown): string | null {
  if (!Array.isArray(v)) return null;
  const parts = v.flatMap((e) => {
    if (!isRecord(e)) return [];
    const message = safeText(e.message);
    if (!message) return [];
    const field = safeText(e.field);
    return [field ? `${field}: ${message}` : message];
  });
  return parts.length ? safeText(parts.join(', ')) : null;
}

/**
 * Turns an RTK Query error into text safe to show in a toast.
 * `fallback` is the caller's already-translated generic message.
 */
export function apiErrorMessage(err: unknown, fallback: string): string {
  if (!isRecord(err)) return fallback;
  if (isNetworkError(err)) return NETWORK_ERROR_MESSAGE;
  if (isTimeoutError(err)) return TIMEOUT_ERROR_MESSAGE;
  if (err.status === 'PARSING_ERROR') return fallback;
  if (typeof err.status === 'number') {
    if (isRecord(err.data) && !Array.isArray(err.data)) {
      const text = safeText(err.data.error) ?? safeText(err.data.message) ?? fieldErrors(err.data.error);
      if (text) return text;
      // A present-but-unsafe server string must not be replaced by a bare status code.
      if (typeof err.data.error === 'string' || typeof err.data.message === 'string') return fallback;
    }
    return `${err.status}`;
  }
  return fallback;
}

/** "<prefix> <server reason>" — just the prefix when there is no reason to add. */
export function failureMessage(prefix: string, err: unknown): string {
  const reason = apiErrorMessage(err, '');
  return reason ? `${prefix} ${reason}` : prefix;
}

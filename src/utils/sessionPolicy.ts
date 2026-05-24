export type SessionExpiryReason = 'idle' | 'max_age';

export type SessionPolicyState = {
  expired: boolean;
  reason?: SessionExpiryReason;
  msUntilExpiry: number;
};

type SessionPolicyMeta = {
  userId: string;
  startedAt: number;
  lastActivityAt: number;
};

const SESSION_POLICY_KEY_PREFIX = 'turuturustars.sessionPolicy.';

const parsePositiveNumber = (value: unknown, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export const SESSION_IDLE_TIMEOUT_MS =
  parsePositiveNumber(import.meta.env.VITE_SESSION_IDLE_MINUTES, 30) * 60 * 1000;
export const SESSION_MAX_AGE_MS =
  parsePositiveNumber(import.meta.env.VITE_SESSION_MAX_HOURS, 12) * 60 * 60 * 1000;
export const SESSION_ACTIVITY_THROTTLE_MS = 60 * 1000;

const storageAvailable = () => typeof window !== 'undefined' && Boolean(window.localStorage);
const sessionPolicyKey = (userId: string) => `${SESSION_POLICY_KEY_PREFIX}${userId}`;

const freshMeta = (userId: string, now = Date.now()): SessionPolicyMeta => ({
  userId,
  startedAt: now,
  lastActivityAt: now,
});

const readMeta = (userId: string): SessionPolicyMeta | null => {
  if (!storageAvailable()) return null;

  try {
    const raw = window.localStorage.getItem(sessionPolicyKey(userId));
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<SessionPolicyMeta>;
    if (
      parsed.userId !== userId ||
      typeof parsed.startedAt !== 'number' ||
      typeof parsed.lastActivityAt !== 'number'
    ) {
      return null;
    }

    return parsed as SessionPolicyMeta;
  } catch {
    return null;
  }
};

const writeMeta = (meta: SessionPolicyMeta) => {
  if (!storageAvailable()) return;

  try {
    window.localStorage.setItem(sessionPolicyKey(meta.userId), JSON.stringify(meta));
  } catch {
    // Storage can fail in private browsing or quota-limited environments.
  }
};

const stateFromMeta = (meta: SessionPolicyMeta, now = Date.now()): SessionPolicyState => {
  const idleExpiryAt = meta.lastActivityAt + SESSION_IDLE_TIMEOUT_MS;
  const maxExpiryAt = meta.startedAt + SESSION_MAX_AGE_MS;
  const expiryAt = Math.min(idleExpiryAt, maxExpiryAt);

  if (now >= expiryAt) {
    return {
      expired: true,
      reason: idleExpiryAt <= maxExpiryAt ? 'idle' : 'max_age',
      msUntilExpiry: 0,
    };
  }

  return {
    expired: false,
    msUntilExpiry: expiryAt - now,
  };
};

export const ensureSessionPolicy = (
  userId: string,
  options: { reset?: boolean } = {},
  now = Date.now()
): SessionPolicyState => {
  const existing = options.reset ? null : readMeta(userId);
  const meta = existing ?? freshMeta(userId, now);

  if (!existing || options.reset) {
    writeMeta(meta);
  }

  return stateFromMeta(meta, now);
};

export const getSessionPolicyState = (userId: string, now = Date.now()): SessionPolicyState => {
  const meta = readMeta(userId);
  return meta ? stateFromMeta(meta, now) : ensureSessionPolicy(userId, {}, now);
};

export const touchSessionActivity = (userId: string, now = Date.now()): SessionPolicyState => {
  const meta = readMeta(userId) ?? freshMeta(userId, now);
  const currentState = stateFromMeta(meta, now);

  if (currentState.expired) {
    return currentState;
  }

  const nextMeta = { ...meta, lastActivityAt: now };
  writeMeta(nextMeta);
  return stateFromMeta(nextMeta, now);
};

export const startNewSessionPolicy = (userId: string) => ensureSessionPolicy(userId, { reset: true });

export const clearSessionPolicy = (userId: string) => {
  if (!storageAvailable()) return;

  try {
    window.localStorage.removeItem(sessionPolicyKey(userId));
  } catch {
    // Ignore storage failures during logout.
  }
};

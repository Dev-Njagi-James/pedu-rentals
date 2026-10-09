export type VisitorSegment = "new" | "returning" | "frequent" | "signed-in";

export type VisitorProfile = {
  segment: VisitorSegment;
  /** Number of distinct browser sessions observed on this device. */
  visitCount: number;
  firstSeenAt: string | null;
  lastSeenAt: string | null;
  shouldShowOnboarding: boolean;
};

type StoredVisitor = {
  version: 1;
  visitCount: number;
  firstSeenAt: string;
  lastSeenAt: string;
};

const VISITOR_KEY = "pedu:visitor:v1";
const SESSION_KEY = "pedu:visitor:counted-this-session:v1";
const ONBOARDING_KEY = "pedu:onboarding:completed:v1";
const FREQUENT_VISIT_THRESHOLD = 3;

function readStoredVisitor(): StoredVisitor | null {
  try {
    const raw = window.localStorage.getItem(VISITOR_KEY);
    if (!raw) return null;

    const value = JSON.parse(raw) as Partial<StoredVisitor>;
    if (
      value.version !== 1 ||
      typeof value.visitCount !== "number" ||
      typeof value.firstSeenAt !== "string" ||
      typeof value.lastSeenAt !== "string"
    ) {
      return null;
    }

    return value as StoredVisitor;
  } catch {
    // Storage can be disabled or unavailable (e.g. some private browsing modes).
    return null;
  }
}

function hasCountedThisSession(): boolean {
  try {
    return window.sessionStorage.getItem(SESSION_KEY) === "1";
  } catch {
    return false;
  }
}

function markCountedThisSession(): void {
  try {
    window.sessionStorage.setItem(SESSION_KEY, "1");
  } catch {
    // Best effort only; do not block the visitor experience if storage is unavailable.
  }
}

function saveVisitor(visitor: StoredVisitor): void {
  try {
    window.localStorage.setItem(VISITOR_KEY, JSON.stringify(visitor));
  } catch {
    // Best effort only; the component still works without persistent storage.
  }
}

function isOnboardingComplete(): boolean {
  try {
    return window.localStorage.getItem(ONBOARDING_KEY) === "1";
  } catch {
    return false;
  }
}

/**
 * Return a coarse visitor segment. Anonymous visit counts live only in this
 * browser's localStorage and are incremented once per browser tab session.
 * Signed-in status must come from the app's real authentication provider.
 */
export function getVisitorProfile(isAuthenticated: boolean): VisitorProfile {
  if (typeof window === "undefined") {
    return {
      segment: isAuthenticated ? "signed-in" : "new",
      visitCount: 0,
      firstSeenAt: null,
      lastSeenAt: null,
      shouldShowOnboarding: false,
    };
  }

  if (isAuthenticated) {
    return {
      segment: "signed-in",
      visitCount: 0,
      firstSeenAt: null,
      lastSeenAt: null,
      shouldShowOnboarding: false,
    };
  }

  const now = new Date().toISOString();
  const stored = readStoredVisitor();
  const countedThisSession = hasCountedThisSession();

  const visitor: StoredVisitor = stored
    ? {
        ...stored,
        visitCount: stored.visitCount + (countedThisSession ? 0 : 1),
        lastSeenAt: countedThisSession ? stored.lastSeenAt : now,
      }
    : {
        version: 1,
        visitCount: 1,
        firstSeenAt: now,
        lastSeenAt: now,
      };

  saveVisitor(visitor);
  markCountedThisSession();

  const segment: VisitorSegment =
    visitor.visitCount >= FREQUENT_VISIT_THRESHOLD
      ? "frequent"
      : visitor.visitCount > 1
        ? "returning"
        : "new";

  return {
    segment,
    visitCount: visitor.visitCount,
    firstSeenAt: visitor.firstSeenAt,
    lastSeenAt: visitor.lastSeenAt,
    shouldShowOnboarding: segment === "new" && !isOnboardingComplete(),
  };
}

export function markOnboardingComplete(): void {
  try {
    window.localStorage.setItem(ONBOARDING_KEY, "1");
  } catch {
    // The modal can still close for this page view if storage is unavailable.
  }
}

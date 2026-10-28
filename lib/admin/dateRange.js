const EAT_MS = 3 * 3600 * 1000;
export const MAX_SPAN_DAYS = 366;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const toUtc = (s) => new Date(`${s}T00:00:00Z`);
const fmt = (d) => d.toISOString().slice(0, 10);

export const todayEAT = () => fmt(new Date(Date.now() + EAT_MS));

export const addDays = (s, n) => {
  const d = toUtc(s);
  d.setUTCDate(d.getUTCDate() + n);
  return fmt(d);
};

const isRealDate = (s) => DATE_RE.test(s || "") && fmt(toUtc(s)) === s;

// Resolves ?from=&to= (YYYY-MM-DD, EAT). Falls back to legacy ?days=N.
// Returns { error } or { from, to, dates, startIso, endIso (exclusive) }.
export function parseRange(searchParams) {
  const today = todayEAT();
  let from = searchParams.get("from");
  let to = searchParams.get("to");

  if (!from && !to) {
    const days = Number(searchParams.get("days") ?? 30);
    if (!Number.isInteger(days) || days < 1 || days > MAX_SPAN_DAYS) {
      return { error: "Invalid days" };
    }
    to = today;
    from = addDays(today, -(days - 1));
  }

  if (!isRealDate(from) || !isRealDate(to)) {
    return { error: "from and to must be valid YYYY-MM-DD dates" };
  }
  if (from > to) return { error: "from must not be after to" };
  if (to > today) return { error: "to must not be in the future" };

  const span = (toUtc(to) - toUtc(from)) / 86400000 + 1;
  if (span > MAX_SPAN_DAYS) {
    return { error: `Range cannot exceed ${MAX_SPAN_DAYS} days` };
  }

  return {
    from,
    to,
    dates: Array.from({ length: span }, (_, i) => addDays(from, i)),
    startIso: new Date(`${from}T00:00:00+03:00`).toISOString(),
    endIso: new Date(`${addDays(to, 1)}T00:00:00+03:00`).toISOString(),
  };
}

// lib/admin/monthRange.js
// Month-range helpers for the admin overview pickers. Pure functions, safe on client.

import { todayEAT } from "@/lib/admin/dateRange";

export const FIRST_MONTH = "2026-05"; // first selectable month
export const MAX_MONTHS = 12; // 12 months <= 366 days, matches parseRange cap

const NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export const currentMonthKey = () => todayEAT().slice(0, 7);

// ["2026-05", ..., current month in EAT]
export function monthList() {
  const end = currentMonthKey();
  const out = [];
  let [y, m] = FIRST_MONTH.split("-").map(Number);
  for (;;) {
    const key = `${y}-${String(m).padStart(2, "0")}`;
    out.push(key);
    if (key >= end) break;
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
  return out;
}

export const monthLabel = (key) => {
  const [y, m] = key.split("-").map(Number);
  return `${NAMES[m - 1]} ${y}`;
};

// "2026-10-05" -> "05 Oct" (or "05 Oct 2026")
export const formatDay = (s, withYear = false) => {
  const [y, m, d] = String(s).split("-");
  return `${d} ${NAMES[Number(m) - 1]}${withYear ? ` ${y}` : ""}`;
};

// Start month + end month -> { from, to } day dates for the API routes.
// `to` is clamped to today (EAT) so the current month never reaches into the future.
export function monthsToRange(startKey, endKey) {
  const [y, m] = endKey.split("-").map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const endDate = `${endKey}-${String(last).padStart(2, "0")}`;
  const today = todayEAT();
  return {
    from: `${startKey}-01`,
    to: endDate > today ? today : endDate,
  };
}

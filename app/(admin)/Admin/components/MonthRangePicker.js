"use client";

import styles from "../css/MonthRangePicker.module.css";
import { monthLabel, MAX_MONTHS } from "@/lib/admin/monthRange";

// months: ["2026-05", ...]   value: { start: "2026-05", end: "2026-10" }
export default function MonthRangePicker({
  label = "Range",
  months,
  value,
  onChange,
}) {
  const startIdx = Math.max(months.indexOf(value.start), 0);
  const endIdx = Math.max(months.indexOf(value.end), 0);
  const cap = MAX_MONTHS - 1;

  const setStart = (i) => {
    let e = endIdx;
    if (i > e) e = i;
    if (e - i > cap) e = i + cap;
    onChange({ start: months[i], end: months[e] });
  };

  const setEnd = (i) => {
    let s = startIdx;
    if (i < s) s = i;
    if (i - s > cap) s = i - cap;
    onChange({ start: months[s], end: months[i] });
  };

  return (
    <div className={styles.rangePill}>
      <span className={styles.rangeLabel}>{label}:</span>
      <select
        className={styles.rangeSelect}
        value={startIdx}
        aria-label={`${label} start month`}
        onChange={(e) => setStart(Number(e.target.value))}>
        {months.map((k, i) => (
          <option key={k} value={i}>
            {monthLabel(k)}
          </option>
        ))}
      </select>
      <span className={styles.rangeArrow}>→</span>
      <select
        className={styles.rangeSelect}
        value={endIdx}
        aria-label={`${label} end month`}
        onChange={(e) => setEnd(Number(e.target.value))}>
        {months.map((k, i) => (
          <option key={k} value={i} disabled={i < startIdx}>
            {monthLabel(k)}
          </option>
        ))}
      </select>
    </div>
  );
}

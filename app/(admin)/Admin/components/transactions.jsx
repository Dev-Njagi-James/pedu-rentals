"use client";

import { useEffect, useMemo, useState } from "react";
import MonthRangePicker from "./MonthRangePicker"; // adjust path to where it actually lives
import {
  getAdminCache,
  setAdminCache,
  isAdminCacheFresh,
} from "@/lib/cache/adminCache";
import {
  monthList,
  currentMonthKey,
  monthsToRange,
} from "@/lib/admin/monthRange";
import styles from "../css/transaction.module.css"; // use your original path and filename

const CACHE_KEY = "transactions";
const TX_TTL_MS = 60 * 1000;
const EAT_MS = 3 * 3600 * 1000;

export default function TransactionsDashboard() {
  const cachedTx = getAdminCache(CACHE_KEY)?.data;
  const [summary, setSummary] = useState(cachedTx?.summary ?? null);
  const [series, setSeries] = useState(cachedTx?.series ?? []);
  const [projection, setProjection] = useState(cachedTx?.projection ?? 0);
  const [transactions, setTransactions] = useState(
    cachedTx?.transactions ?? [],
  );
  const [mtd, setMtd] = useState(cachedTx?.mtd ?? null);
  const [loading, setLoading] = useState(!cachedTx);

  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [rangeStart, setRangeStart] = useState(null);
  const [rangeEnd, setRangeEnd] = useState(null);
  const [activeBar, setActiveBar] = useState(null);
  const [exporting, setExporting] = useState(false);

  const [exportRange, setExportRange] = useState({
    start: currentMonthKey(),
    end: currentMonthKey(),
  });
  const exportMonths = useMemo(() => monthList(), []);
  const [tableRange, setTableRange] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const apply = (d) => {
      setSummary(d.summary);
      setSeries(d.series);
      setProjection(d.projection);
      setTransactions(d.transactions);
      setMtd(d.mtd);
    };

    const entry = getAdminCache(CACHE_KEY);
    if (entry && isAdminCacheFresh(entry, TX_TTL_MS)) return;
    const silent = !!entry;

    (async () => {
      if (!silent) setLoading(true);
      try {
        const [summaryRes, monthlyRes] = await Promise.all([
          fetch("/api/v1/admin/transactions/summary"),
          fetch("/api/v1/admin/transactions/monthly"),
        ]);
        if (!summaryRes.ok || !monthlyRes.ok) throw new Error("Fetch failed");
        const [s, m] = await Promise.all([
          summaryRes.json(),
          monthlyRes.json(),
        ]);

        const next = {
          summary: s,
          series: m.series || [],
          projection: m.nextMonthProjection || 0,
          transactions: m.transactions || [],
          mtd: m.monthToDate || null,
        };
        setAdminCache(CACHE_KEY, next);
        if (!cancelled) apply(next);
      } catch (err) {
        console.error("Failed loading transaction dashboard data:", err);
      } finally {
        if (!cancelled && !silent) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (activeBar === null) return;
    const close = (e) => {
      if (!e.target.closest(`.${styles.barSlot}`)) setActiveBar(null);
    };
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [activeBar]);

  const filteredTransactions = useMemo(() => {
    const r = tableRange
      ? monthsToRange(tableRange.start, tableRange.end)
      : null;

    return transactions.filter((tx) => {
      if (r) {
        if (!tx.date) return false;
        const day = new Date(new Date(tx.date).getTime() + EAT_MS)
          .toISOString()
          .slice(0, 10);
        if (day < r.from || day > r.to) return false;
      }

      const matchesSearch =
        tx.reference.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tx.customerLister.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tx.description.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory =
        categoryFilter === "all" ||
        tx.category.toLowerCase().replace(/\s+/g, "") === categoryFilter;

      const matchesStatus =
        statusFilter === "all" || tx.status.toLowerCase() === statusFilter;

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [transactions, searchQuery, categoryFilter, statusFilter, tableRange]);

  const currentKey = new Date(Date.now() + 3 * 3600 * 1000)
    .toISOString()
    .slice(0, 7);

  const labelOf = (key, withYear = false) => {
    const [y, m] = key.split("-").map(Number);
    const mon = new Date(y, m - 1, 1).toLocaleString("en-US", {
      month: "short",
    });
    return withYear ? `${mon} ${y}` : mon;
  };

  // Continuous month list from first data month to current month; gaps filled with 0.
  const months = useMemo(() => {
    if (series.length === 0) return [];
    const byKey = Object.fromEntries(series.map((s) => [s.month, s.revenue]));
    const last = series[series.length - 1].month;
    const endKey = last > currentKey ? last : currentKey;

    const out = [];
    let [y, m] = series[0].month.split("-").map(Number);
    for (;;) {
      const key = `${y}-${String(m).padStart(2, "0")}`;
      out.push({ key, revenue: byKey[key] ?? 0 });
      if (key >= endKey) break;
      m += 1;
      if (m > 12) {
        m = 1;
        y += 1;
      }
    }
    return out;
  }, [series, currentKey]);

  const startIdx = rangeStart ?? 0;
  const endIdx = rangeEnd ?? Math.max(months.length - 1, 0);

  const chart = useMemo(() => {
    const visible = months
      .map((s, i) => ({ ...s, idx: i }))
      .filter((s) => s.idx >= startIdx && s.idx <= endIdx);

    const rawMax = Math.max(...visible.map((s) => s.revenue), 1);
    const mag = Math.pow(10, Math.floor(Math.log10(rawMax)));
    const step = mag / 2;
    const niceMax = Math.ceil(rawMax / step) * step;
    const ticks = [0.25, 0.5, 0.75, 1].map((f) => niceMax * f);

    const growths = [];
    for (let i = 1; i < visible.length; i++) {
      const prev = visible[i - 1].revenue;
      if (prev > 0) growths.push((visible[i].revenue - prev) / prev);
    }
    const avgGrowth = growths.length
      ? (growths.reduce((a, b) => a + b, 0) / growths.length) * 100
      : 0;

    return { visible, niceMax, ticks, avgGrowth };
  }, [months, startIdx, endIdx]);

  const formatAxis = (v) =>
    v >= 1e6
      ? `${+(v / 1e6).toFixed(1)}M`
      : v >= 1e3
        ? `${Math.round(v / 1e3)}K`
        : `${Math.round(v)}`;

  const handleExport = async () => {
    const { from, to } = monthsToRange(exportRange.start, exportRange.end);
    const p = new URLSearchParams({ from, to });
    setExporting(true);
    try {
      const res = await fetch(`/api/v1/admin/transactions/export?${p}`);
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({}));
        throw new Error(error || `Export failed (${res.status})`);
      }
      const name =
        res.headers
          .get("Content-Disposition")
          ?.match(/filename="(.+?)"/)?.[1] || "transactions.xlsx";
      const url = URL.createObjectURL(await res.blob());
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert(err.message);
    } finally {
      setExporting(false);
    }
  };

  const formatKES = (val) =>
    `KES ${(val || 0).toLocaleString("en-KE", { minimumFractionDigits: 0 })}`;

  const mtdTotal = mtd?.total || 0;
  const monthPct = mtd ? (mtd.dayOfMonth / mtd.daysInMonth) * 100 : 0;
  const listerPct = mtdTotal ? (mtd.listers / mtdTotal) * 100 : 0;
  const userPct = mtdTotal ? 100 - listerPct : 0;

  return (
    <div className={styles.container}>
      {/* HEADER */}
      <div className={styles.headerFlex}>
        <div>
          <h1 className={styles.title}>Transactions</h1>
          <p className={styles.subtitle}>
            Real-time financial activity across lister plans & 24-hour access
            payments.
          </p>
        </div>
        <div
          style={{
            display: "flex",
            gap: "0.75rem",
            alignItems: "center",
            flexWrap: "wrap",
          }}>
          <MonthRangePicker
            label="Export"
            months={exportMonths}
            value={exportRange}
            onChange={setExportRange}
          />
          <button onClick={handleExport} className={styles.exportBtn}>
            <svg
              className={styles.mono}
              width="16"
              height="16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
            {exporting ? "Exporting..." : "Export"}
          </button>
        </div>
      </div>

      {/* 1. TOP METRIC CARDS */}
      <div className={styles.cardGrid}>
        {/* Card 1 */}
        <div className={styles.card}>
          <div>
            <div className={styles.cardTop}>
              <span className={styles.cardLabel}>Total Revenue</span>
              <span className={styles.badgeEmerald}>System Total</span>
            </div>
            <div className={styles.cardValue}>
              {formatKES(summary?.systemTotal)}
            </div>
          </div>
          <div className={styles.cardFooter}>
            Total{" "}
            <span className={styles.mono}>
              {summary?.totalTransactions || 0}
            </span>{" "}
            completed transactions
          </div>
        </div>

        {/* Card 2 */}
        <div className={styles.card}>
          <div>
            <div className={styles.cardTop}>
              <span className={styles.cardLabel}>Paid by Listers</span>
              <span className={styles.badgeBlue}>Subscriptions</span>
            </div>
            <div className={styles.cardValue}>
              {formatKES(summary?.paidByListers)}
            </div>
          </div>
          <div className={styles.cardFooter}>
            <div
              style={{
                width: "100%",
                backgroundColor: "#f1f5f9",
                borderRadius: "9999px",
                height: "6px",
              }}>
              <div
                style={{
                  backgroundColor: "#2563eb",
                  height: "6px",
                  borderRadius: "9999px",
                  width: `${summary?.systemTotal ? (summary.paidByListers / summary.systemTotal) * 100 : 0}%`,
                }}
              />
            </div>
          </div>
        </div>

        {/* Card 3 */}
        <div className={styles.card}>
          <div>
            <div className={styles.cardTop}>
              <span className={styles.cardLabel}>Paid by Users</span>
              <span className={styles.badgeIndigo}>24h Access</span>
            </div>
            <div className={styles.cardValue}>
              {formatKES(summary?.paidByUsers)}
            </div>
          </div>
          <div className={styles.cardFooter}>
            <div
              style={{
                width: "100%",
                backgroundColor: "#f1f5f9",
                borderRadius: "9999px",
                height: "6px",
              }}>
              <div
                style={{
                  backgroundColor: "#4f46e5",
                  height: "6px",
                  borderRadius: "9999px",
                  width: `${summary?.systemTotal ? (summary.paidByUsers / summary.systemTotal) * 100 : 0}%`,
                }}
              />
            </div>
          </div>
        </div>

        {/* Card 4 */}
        <div className={styles.card}>
          <div>
            <div className={styles.cardTop}>
              <span className={styles.cardLabel}>Net Earnings</span>
              <span className={styles.badgeEmerald}>Gross Balance</span>
            </div>
            <div className={styles.cardValue} style={{ color: "#059669" }}>
              {formatKES(summary?.systemTotal)}
            </div>
          </div>
          <div className={styles.cardFooter}>Net payout ready</div>
        </div>
      </div>

      {/* 2. CHARTS SECTION */}
      <div className={styles.sectionGrid}>
        <div className={styles.chartCard}>
          <div className={styles.chartHeader}>
            <div>
              <h2 className={styles.chartTitle}>Monthly Revenue Breakdown</h2>
              <p className={styles.chartSubtitle}>
                Historical transaction throughput (KSh)
              </p>
            </div>

            <div className={styles.rangePill}>
              <span className={styles.rangeLabel}>Range:</span>
              <select
                className={styles.rangeSelect}
                value={startIdx}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setRangeStart(v);
                  if (v > endIdx) setRangeEnd(v);
                }}>
                {months.map((s, i) => (
                  <option key={s.key} value={i} disabled={i > endIdx}>
                    {labelOf(s.key, true)}
                  </option>
                ))}
              </select>
              <span className={styles.rangeArrow}>→</span>
              <select
                className={styles.rangeSelect}
                value={endIdx}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setRangeEnd(v);
                  if (v < startIdx) setRangeStart(v);
                }}>
                {months.map((s, i) => (
                  <option key={s.key} value={i} disabled={i < startIdx}>
                    {labelOf(s.key, true)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {months.length === 0 ? (
            <div className={styles.chartEmpty}>
              No monthly data collected yet.
            </div>
          ) : (
            <>
              <div className={styles.plot}>
                {chart.ticks.map((t) => (
                  <div
                    key={t}
                    className={styles.gridLine}
                    style={{ bottom: `${(t / chart.niceMax) * 100}%` }}>
                    <span className={styles.gridLabel}>{formatAxis(t)}</span>
                  </div>
                ))}
                <div className={styles.bars}>
                  {chart.visible.map((item) => {
                    const isCurrent = item.key === currentKey;
                    const h = Math.max((item.revenue / chart.niceMax) * 100, 2);
                    const isActive = activeBar === item.key;
                    return (
                      <div
                        key={item.key}
                        className={styles.barSlot}
                        onMouseEnter={() => setActiveBar(item.key)}
                        onMouseLeave={() => setActiveBar(null)}
                        onClick={() =>
                          setActiveBar((prev) =>
                            prev === item.key ? null : item.key,
                          )
                        }>
                        <div
                          className={`${isCurrent ? styles.barCurrent : styles.barPast} ${
                            isActive ? styles.barActive : ""
                          }`}
                          style={{ height: `${h}%` }}>
                          {isActive && (
                            <span className={styles.tooltip}>
                              KSh {item.revenue.toLocaleString("en-KE")}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className={styles.xAxis}>
                {chart.visible.map((item) => (
                  <span
                    key={item.key}
                    className={
                      item.key === currentKey
                        ? styles.xLabelCurrent
                        : styles.xLabel
                    }>
                    {labelOf(item.key)}
                  </span>
                ))}
              </div>

              <div className={styles.chartFooter}>
                <div className={styles.chartLegend}>
                  <div className={styles.legendItem}>
                    <span className={styles.dotLight} />
                    <span>Completed Payments</span>
                  </div>
                  <div className={styles.legendItem}>
                    <span className={styles.dotBlack} />
                    <span>Current Month</span>
                  </div>
                </div>
                <span className={styles.mono}>
                  Average Growth: {chart.avgGrowth >= 0 ? "+" : ""}
                  {chart.avgGrowth.toFixed(1)}% MoM
                </span>
              </div>
            </>
          )}
        </div>

        <div className={styles.projectionCard}>
          <div>
            <div className={styles.cardTop}>
              <span className={styles.cardLabel}>This Month</span>
              <span className={styles.badgeBlue}>
                {labelOf(currentKey, true)}
              </span>
            </div>

            <div className={styles.projValue}>{formatKES(mtdTotal)}</div>
            <div className={styles.chartSubtitle}>Collected so far</div>

            <div className={styles.monthTrack}>
              <div
                className={styles.monthFill}
                style={{ width: `${monthPct}%` }}
              />
            </div>
            <div className={styles.monthMeta}>
              <span>
                Day {mtd?.dayOfMonth ?? 0} of {mtd?.daysInMonth ?? 0}
              </span>
              <span>Projected {formatKES(mtd?.projectedMonthEnd)}</span>
            </div>

            <div className={styles.splitLabel}>Source this month</div>
            <div className={styles.splitBar}>
              <div
                className={styles.splitListers}
                style={{ width: `${listerPct}%` }}
              />
              <div
                className={styles.splitUsers}
                style={{ width: `${userPct}%` }}
              />
            </div>
            <div className={styles.splitLegend}>
              <span>
                <i className={styles.dotListers} /> Listers{" "}
                {formatKES(mtd?.listers)}
              </span>
              <span>
                <i className={styles.dotUsers} /> Users {formatKES(mtd?.users)}
              </span>
            </div>
          </div>

          <div className={styles.projFooter}>
            <div>
              <div className={styles.projFooterLabel}>Next month estimate</div>
              <div className={styles.projFooterHint}>
                Weighted average of the last 3 full months
              </div>
            </div>
            <span className={styles.mono}>{formatKES(projection)}</span>
          </div>
        </div>
      </div>

      {/* 3. TABLE SECTION */}
      <div className={styles.tableContainer}>
        <div className={styles.toolbar}>
          <div className={styles.searchBox}>
            <svg
              className={styles.searchIcon}
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              placeholder="Search reference, user ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={styles.searchInput}
            />
          </div>

          <MonthRangePicker
            label="Period"
            months={exportMonths}
            value={
              tableRange ?? { start: currentMonthKey(), end: currentMonthKey() }
            }
            onChange={setTableRange}
          />
          {tableRange && (
            <button
              className={styles.exportBtn}
              onClick={() => setTableRange(null)}>
              All time
            </button>
          )}

          <div className={styles.filterGroup}>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className={styles.selectInput}>
              <option value="all">All Categories</option>
              <option value="listerplan">Lister Plan</option>
              <option value="user24-houraccess">User 24h Access</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={styles.selectInput}>
              <option value="all">All Statuses</option>
              <option value="completed">Completed</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
            </select>
          </div>
        </div>

        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead className={styles.thead}>
              <tr>
                <th className={styles.th}>Date</th>
                <th className={styles.th}>Reference</th>
                <th className={styles.th}>Description</th>
                <th className={styles.th}>Category</th>
                <th className={styles.th}>Customer/Lister</th>
                <th className={styles.th}>Payment Method</th>
                <th className={styles.th} style={{ textAlign: "right" }}>
                  Money In
                </th>
                <th className={styles.th} style={{ textAlign: "center" }}>
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={8}
                    style={{
                      padding: "3rem 0",
                      textAlign: "center",
                      color: "#94a3b8",
                    }}>
                    Loading transactions data...
                  </td>
                </tr>
              ) : filteredTransactions.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    style={{
                      padding: "3rem 0",
                      textAlign: "center",
                      color: "#94a3b8",
                    }}>
                    No matching transactions found.
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((tx, idx) => (
                  <tr key={tx.id || idx} className={styles.tr}>
                    <td
                      className={styles.td}
                      style={{ color: "#64748b", whiteSpace: "nowrap" }}>
                      <span className={styles.mono}>
                        {tx.date
                          ? new Date(tx.date).toLocaleDateString("en-GB")
                          : "-"}
                      </span>
                    </td>
                    <td
                      className={styles.td}
                      style={{ fontWeight: 600, color: "#0f172a" }}>
                      <span className={styles.mono}>{tx.reference}</span>
                    </td>
                    <td className={styles.td} style={{ color: "#1e293b" }}>
                      {tx.description}
                    </td>
                    <td className={styles.td}>
                      <span
                        className={styles.badgeBlue}
                        style={{
                          color: "#334155",
                          backgroundColor: "#f1f5f9",
                        }}>
                        {tx.category}
                      </span>
                    </td>
                    <td
                      className={styles.td}
                      style={{
                        color: "#64748b",
                        maxWidth: "150px",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}>
                      <span className={styles.mono}>{tx.customerLister}</span>
                    </td>
                    <td className={styles.td} style={{ color: "#475569" }}>
                      {tx.paymentMethod}
                    </td>
                    <td
                      className={styles.td}
                      style={{
                        textAlign: "right",
                        fontWeight: 600,
                        color: "#059669",
                      }}>
                      <span className={styles.mono}>
                        +KES {(tx.moneyIn || 0).toLocaleString("en-KE")}
                      </span>
                    </td>
                    <td className={styles.td} style={{ textAlign: "center" }}>
                      <span className={styles.statusPill}>
                        <svg
                          width="12"
                          height="12"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                        {tx.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

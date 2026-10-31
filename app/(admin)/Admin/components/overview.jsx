"use client";

import { useState, useEffect, useMemo } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import styles from "../css/ExecutiveOverview.module.css";
import MonthRangePicker from "./MonthRangePicker";
import {
  getAdminCache,
  setAdminCache,
  isAdminCacheFresh,
} from "@/lib/cache/adminCache";
import { monthList, monthsToRange, formatDay } from "@/lib/admin/monthRange";

const SYNC_ID = "overview-chart";
const Y_WIDTH = 40; // identical on line and bar charts so x positions align
const MARGIN = { top: 8, right: 8, bottom: 0, left: 0 };

const tooltipStyle = {
  background: "#0f172a",
  color: "#ffffff",
  border: "none",
  borderRadius: 8,
  fontSize: 12,
  padding: "8px 12px",
};
const tooltipLabelStyle = { color: "#94a3b8", marginBottom: 4 };

const fmt = (v) => (v ?? 0).toLocaleString("en-KE");
const tickDay = (s) => formatDay(s);
const labelDay = (s) => formatDay(s, true);

// Fetch + cache helper shared by both effects.
async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Fetch failed: ${url}`);
  return res.json();
}

function useCachedLoad(key, loader, deps) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const entry = getAdminCache(key);

    if (entry) {
      setData(entry.data);
      setLoading(false);
      if (isAdminCacheFresh(entry)) return;
    } else {
      setData(null); // never show the previous range's numbers under a new range
      setLoading(true);
    }

    (async () => {
      try {
        const next = await loader();
        setAdminCache(key, next);
        if (!cancelled) setData(next);
      } catch (err) {
        console.error(`Failed loading ${key}:`, err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, loading };
}

function PlatformCard({ label, unit, icon, iconClass, value, total, loading }) {
  return (
    <div className={styles.metricCard}>
      <div className={styles.cardHeader}>
        <span className={styles.cardLabel}>{label}</span>
        <div className={`${styles.iconBox} ${iconClass || ""}`}>
          <i className={`hgi hgi-stroke hgi-rounded ${icon}`}></i>
        </div>
      </div>
      <div className={styles.metricRow}>
        <span className={styles.primaryMetric}>
          {value == null ? (loading ? "..." : "0") : fmt(value)}
        </span>
        {unit && <span className={styles.metricUnit}>{unit}</span>}
      </div>
      <div className={styles.cardSecondary}>
        {total == null ? "\u00A0" : `${fmt(total)} all-time`}
      </div>
    </div>
  );
}

function GrowthCard({
  title,
  sub,
  dataKey,
  color,
  gradId,
  data,
  baseline,
  footLabel,
  loading,
}) {
  const last = data.length ? data[data.length - 1][dataKey] : baseline;
  const delta = last - baseline;

  return (
    <div className={styles.growthCard}>
      <div className={styles.growthHeader}>
        <div>
          <h4 className={styles.growthTitle}>{title}</h4>
          <p className={styles.growthSub}>{sub}</p>
        </div>
      </div>
      <div className={styles.areaContainer}>
        {data.length === 0 ? (
          <div className={styles.chartEmpty}>
            {loading ? "Loading..." : "No data"}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={MARGIN}>
              <defs>
                <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="4 4"
                stroke="#e2e8f0"
                vertical={false}
              />
              <XAxis
                dataKey="date"
                tickFormatter={tickDay}
                tick={{ fontSize: 10, fill: "#64748b" }}
                tickLine={false}
                axisLine={{ stroke: "#e2e8f0" }}
                minTickGap={28}
              />
              <YAxis
                width={36}
                allowDecimals={false}
                domain={[0, "auto"]}
                tick={{ fontSize: 10, fill: "#64748b" }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                labelStyle={tooltipLabelStyle}
                itemStyle={{ color: "#ffffff" }}
                labelFormatter={labelDay}
                formatter={(v) => [fmt(v), title.replace("Growth of ", "")]}
              />
              <Area
                type="monotone"
                dataKey={dataKey}
                stroke={color}
                strokeWidth={2}
                fill={`url(#${gradId})`}
                dot={false}
                activeDot={{
                  r: 4.5,
                  fill: "#ffffff",
                  stroke: color,
                  strokeWidth: 2.5,
                }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
      <div className={styles.growthFooter}>
        <span>{footLabel}</span>
        <span className={styles.boldText}>
          {fmt(last)} Total
          <span className={styles.growthDelta}> +{fmt(delta)} in range</span>
        </span>
      </div>
    </div>
  );
}

export default function ExecutiveOverview() {
  const months = useMemo(() => monthList(), []);
  const cur = months[months.length - 1];

  const [cardsSel, setCardsSel] = useState({ start: cur, end: cur });
  const [chartSel, setChartSel] = useState({ start: cur, end: cur });

  const cardsRange = useMemo(
    () => monthsToRange(cardsSel.start, cardsSel.end),
    [cardsSel],
  );
  const chartRange = useMemo(
    () => monthsToRange(chartSel.start, chartSel.end),
    [chartSel],
  );

  const cards = useCachedLoad(
    `overview:cards:${cardsRange.from}:${cardsRange.to}`,
    async () => {
      const q = `from=${cardsRange.from}&to=${cardsRange.to}`;
      const [platform, visitors] = await Promise.all([
        fetchJson(`/api/v1/admin/overview/platform?${q}`),
        fetchJson(`/api/v1/admin/overview/visitors?${q}&part=summary`),
      ]);
      return { platform, visitors };
    },
    [cardsRange.from, cardsRange.to],
  );

  const charts = useCachedLoad(
    `overview:chart:${chartRange.from}:${chartRange.to}`,
    async () => {
      const q = `from=${chartRange.from}&to=${chartRange.to}`;
      const [visitors, growth] = await Promise.all([
        fetchJson(`/api/v1/admin/overview/visitors?${q}&part=series`),
        fetchJson(`/api/v1/admin/overview/growth?${q}`),
      ]);
      return { visitors, growth };
    },
    [chartRange.from, chartRange.to],
  );

  // Cards
  const platform = cards.data?.platform;
  const footfall = cards.data?.visitors;

  // Charts
  const visitorSeries = charts.data?.visitors?.series ?? [];
  const growthSeries = charts.data?.growth?.series ?? [];
  const baseline = charts.data?.growth?.baseline ?? {
    listings: 0,
    users: 0,
    listers: 0,
  };

  // Daily counts + baseline -> cumulative totals.
  const cumulative = useMemo(() => {
    const series = charts.data?.growth?.series ?? [];
    const b = charts.data?.growth?.baseline ?? {
      listings: 0,
      users: 0,
      listers: 0,
    };
    let l = b.listings;
    let u = b.users;
    let k = b.listers;
    return series.map((r) => {
      l += r.listings;
      u += r.users;
      k += r.listers;
      return { date: r.date, listings: l, users: u, listers: k };
    });
  }, [charts.data]);

  const avgDaily = visitorSeries.length
    ? Math.round(
        visitorSeries.reduce((a, r) => a + (r.total || 0), 0) /
          visitorSeries.length,
      )
    : 0;

  const meanUsers = growthSeries.length
    ? (
        growthSeries.reduce((a, r) => a + (r.users || 0), 0) /
        growthSeries.length
      ).toFixed(1)
    : "0.0";

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Executive Platform Overview</h1>
        <MonthRangePicker
          label="Cards"
          months={months}
          value={cardsSel}
          onChange={setCardsSel}
        />
      </header>

      {/* Row 1: platform cards (cards range) */}
      <section className={styles.topGrid}>
        <PlatformCard
          label="New Live Listings"
          unit="/units"
          icon="hgi-real-estate-01"
          value={platform?.inRange?.listings}
          total={platform?.totalListings}
          loading={cards.loading}
        />
        <PlatformCard
          label="New Users"
          unit="/users"
          icon="hgi-user-add-01"
          value={platform?.inRange?.users}
          total={platform?.totalUsers}
          loading={cards.loading}
        />
        <PlatformCard
          label="New Listers"
          unit="/listers"
          icon="hgi-user-edit-01"
          iconClass={styles.iconOrange}
          value={platform?.inRange?.listers}
          total={platform?.totalListers}
          loading={cards.loading}
        />
      </section>

      <div className={styles.sectionDivider}>
        <span>AUDIENCE FOOTFALL</span>
        <span className={styles.metaInfo}>PostHog Telemetry Integration</span>
      </div>

      {/* Row 2: footfall cards (cards range) */}
      <section className={styles.visitorCardsGrid}>
        <div className={styles.visitorCard}>
          <span className={styles.cardLabel}>Total Visitors</span>
          <div className={styles.visitorValueRow}>
            <span className={styles.visitorValue}>
              {footfall
                ? fmt(footfall.totalVisitors)
                : cards.loading
                  ? "..."
                  : "0"}
            </span>
          </div>
        </div>

        <div className={styles.visitorCard}>
          <span className={styles.cardLabel}>New Visitors</span>
          <div className={styles.visitorValueRow}>
            <span className={styles.visitorValue}>
              {footfall
                ? fmt(footfall.newVisitors)
                : cards.loading
                  ? "..."
                  : "0"}
            </span>
          </div>
        </div>

        <div className={styles.visitorCard}>
          <span className={styles.cardLabel}>Returning Visitors</span>
          <div className={styles.visitorValueRow}>
            <span className={styles.visitorValue}>
              {footfall
                ? fmt(footfall.returningVisitors)
                : cards.loading
                  ? "..."
                  : "0"}
            </span>
          </div>
        </div>
      </section>

      <div className={styles.sectionDivider}>
        <span>TRENDS</span>
        <MonthRangePicker
          label="Charts"
          months={months}
          value={chartSel}
          onChange={setChartSel}
        />
      </div>

      {/* Row 3: visitors line (chart range) */}
      <section className={styles.chartSection}>
        <div className={styles.chartHeader}>
          <div>
            <h3 className={styles.chartTitle}>
              Visitors Over Time{" "}
              <span className={styles.pillTag}>Dual Stream</span>
            </h3>
            <p className={styles.chartSub}>
              Volume distribution comparing total portal traffic against
              first-time prospective renters.
            </p>
          </div>
          <div className={styles.chartLegend}>
            <span className={styles.legendItem}>
              <span className={`${styles.dot} ${styles.dotBlue}`} /> Total
              Visitors
            </span>
            <span className={styles.legendItem}>
              <span className={`${styles.dot} ${styles.dotOrange}`} /> New
              Visitors
            </span>
          </div>
        </div>

        <div className={styles.chartBody}>
          {visitorSeries.length === 0 ? (
            <div className={styles.chartEmpty}>
              {charts.loading ? "Loading..." : "No data in range."}
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={visitorSeries} syncId={SYNC_ID} margin={MARGIN}>
                <CartesianGrid
                  strokeDasharray="4 4"
                  stroke="#e2e8f0"
                  vertical={false}
                />
                <XAxis
                  dataKey="date"
                  tickFormatter={tickDay}
                  tick={{ fontSize: 11, fill: "#64748b" }}
                  tickLine={false}
                  axisLine={{ stroke: "#e2e8f0" }}
                  minTickGap={28}
                />
                <YAxis
                  width={Y_WIDTH}
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: "#64748b" }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  labelStyle={tooltipLabelStyle}
                  labelFormatter={labelDay}
                  formatter={(v, name) => [
                    fmt(v),
                    name === "total" ? "Total Visitors" : "New Visitors",
                  ]}
                />
                <Line
                  type="monotone"
                  dataKey="total"
                  stroke="#2563eb"
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{
                    r: 5.5,
                    fill: "#ffffff",
                    stroke: "#2563eb",
                    strokeWidth: 3,
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="new"
                  stroke="#f59e0b"
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{
                    r: 5.5,
                    fill: "#ffffff",
                    stroke: "#f59e0b",
                    strokeWidth: 3,
                  }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className={styles.chartFooterGrid}>
          <div>
            <span className={styles.footerLabel}>Avg. Daily Visitors</span>
            <h4 className={styles.footerValue}>{fmt(avgDaily)} / day</h4>
          </div>
        </div>
      </section>

      {/* Row 4: new users per day (chart range, hover synced with the line) */}
      <section className={styles.chartSection}>
        <div className={styles.chartHeader}>
          <div>
            <h3 className={styles.chartTitle}>
              New Users Per Day{" "}
              <span className={styles.pillTag}>Daily Acquisition</span>
            </h3>
            <p className={styles.chartSub}>
              Tenant account creations per day, bucketed in EAT. Admins
              excluded.
            </p>
          </div>
          <span className={styles.meanBadge}>● Mean: {meanUsers} / day</span>
        </div>

        <div className={styles.chartBody}>
          {growthSeries.length === 0 ? (
            <div className={styles.chartEmpty}>
              {charts.loading ? "Loading..." : "No data in range."}
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart
                data={growthSeries}
                syncId={SYNC_ID}
                margin={MARGIN}
                barCategoryGap="12%">
                <CartesianGrid
                  strokeDasharray="4 4"
                  stroke="#e2e8f0"
                  vertical={false}
                />
                <XAxis
                  dataKey="date"
                  tickFormatter={tickDay}
                  tick={{ fontSize: 11, fill: "#64748b" }}
                  tickLine={false}
                  axisLine={{ stroke: "#e2e8f0" }}
                  minTickGap={28}
                />
                <YAxis
                  width={Y_WIDTH}
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: "#64748b" }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  cursor={{ fill: "rgba(15, 23, 42, 0.06)" }}
                  contentStyle={tooltipStyle}
                  labelStyle={tooltipLabelStyle}
                  itemStyle={{ color: "#ffffff" }}
                  labelFormatter={labelDay}
                  formatter={(v) => [fmt(v), "New Users"]}
                />
                <Bar
                  dataKey="users"
                  fill="#0f172a"
                  radius={[2, 2, 0, 0]}
                  isAnimationActive={false}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </section>

      {/* Row 5: cumulative growth (chart range) */}
      <section className={styles.bottomGrid}>
        <GrowthCard
          title="Growth of Users"
          sub="Cumulative registered tenant signups."
          dataKey="users"
          color="#1e293b"
          gradId="userGrad"
          data={cumulative}
          baseline={baseline.users}
          footLabel="At range end"
          loading={charts.loading}
        />
        <GrowthCard
          title="Growth of Listings"
          sub="Cumulative live (paid) listings."
          dataKey="listings"
          color="#2563eb"
          gradId="listingGrad"
          data={cumulative}
          baseline={baseline.listings}
          footLabel="At range end"
          loading={charts.loading}
        />
        <GrowthCard
          title="Growth of Listers"
          sub="Property managers & individual owners."
          dataKey="listers"
          color="#f59e0b"
          gradId="listerGrad"
          data={cumulative}
          baseline={baseline.listers}
          footLabel="At range end"
          loading={charts.loading}
        />
      </section>
    </div>
  );
}

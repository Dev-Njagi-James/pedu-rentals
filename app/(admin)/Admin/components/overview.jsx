"use client";

import { useState, useEffect } from "react";
import styles from "../css/ExecutiveOverview.module.css";

export default function ExecutiveOverview() {
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);

  // Data states from our created API endpoints
  const [platformData, setPlatformData] = useState(null);
  const [visitorData, setVisitorData] = useState(null);
  const [growthData, setGrowthData] = useState(null);
  const [hoveredPoint, setHoveredPoint] = useState(null);
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const [hoveredGrowth, setHoveredGrowth] = useState({
    type: null,
    point: null,
  });

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    async function fetchDashboardData() {
      try {
        const [platRes, visRes, growthRes] = await Promise.all([
          fetch(`/api/v1/admin/overview/platform?days=${days}`),
          fetch(`/api/v1/admin/overview/visitors?days=${days}`),
          fetch(`/api/v1/admin/overview/growth?days=${days}`),
        ]);

        const platJson = platRes.ok ? await platRes.json() : null;
        const visJson = visRes.ok ? await visRes.json() : null;
        const growthJson = growthRes.ok ? await growthRes.json() : null;

        if (isMounted) {
          setPlatformData(platJson);
          setVisitorData(visJson);
          setGrowthData(growthJson);
          setLoading(false);
        }
      } catch (err) {
        console.error("Failed loading executive dashboard data:", err);
        if (isMounted) setLoading(false);
      }
    }

    fetchDashboardData();

    return () => {
      isMounted = false;
    };
  }, [days]);

  // Derived metrics
  const totalVisitors = visitorData?.totalVisitors || 0;
  const newVisitorsToday = visitorData?.newVisitorsToday || 0;
  const series = visitorData?.series || [];
  const growthSeries = growthData?.series || [];

  const buildSvgPath = (points, key, width = 300, height = 80) => {
    if (!points || points.length === 0)
      return `M 0,${height} L ${width},${height}`;

    const values = points.map((p) => Number(p[key]) || 0);
    const minVal = 0; // Always anchor growth charts to 0 for accurate cumulative context
    const maxVal = Math.max(...values, 5); // Ensure a minimum ceiling of 5 so small numbers don't spike weirdly
    const range = Math.max(maxVal - minVal, 1);

    const mapped = points.map((p, i) => {
      const x = (i / Math.max(points.length - 1, 1)) * width;
      const val = Number(p[key]) || 0;
      // Invert Y coordinate for SVG (0 is at top)
      const y = height - ((val - minVal) / range) * (height - 20) - 10;
      return { x, y };
    });

    return mapped.reduce((acc, pt, i, arr) => {
      if (i === 0) return `M ${pt.x},${pt.y}`;
      const prev = arr[i - 1];
      const cx1 = prev.x + (pt.x - prev.x) / 2;
      return `${acc} C ${cx1},${prev.y} ${cx1},${pt.y} ${pt.x},${pt.y}`;
    }, "");
  };

  const buildSvgArea = (points, key, width = 300, height = 80) => {
    const linePath = buildSvgPath(points, key, width, height);
    if (!linePath) return "";
    return `${linePath} L ${width},${height} L 0,${height} Z`;
  };

  return (
    <div className={styles.container}>
      {/* Header & Time Filter Controls */}
      <header className={styles.header}>
        <h1 className={styles.title}>Executive Platform Overview</h1>
        <div className={styles.timeFilter}>
          {[7, 30, 90].map((d) => (
            <button
              key={d}
              type="button"
              className={`${styles.filterBtn} ${days === d ? styles.activeFilter : ""}`}
              onClick={() => setDays(d)}>
              {d} Days
            </button>
          ))}
        </div>
      </header>

      {/* Row 1: Key Platform Metrics */}
      <section className={styles.topGrid}>
        {/* Total Listings Card */}
        <div className={styles.metricCard}>
          <div className={styles.cardHeader}>
            <span className={styles.cardLabel}>Total Listings</span>
            <div className={styles.iconBox}>🏢</div>
          </div>
          <div className={styles.metricRow}>
            <span className={styles.primaryMetric}>
              {platformData?.totalListings?.toLocaleString("en-KE") ??
                (loading ? "..." : "0")}
            </span>
            <span className={styles.metricUnit}>units</span>
          </div>
          {/*<div className={styles.cardFooter}>
            <span className={`${styles.badge} ${styles.badgeGreen}`}>
              ↗ +12.4% MoM
            </span>
            <span className={styles.subtext}>1,390 actively published</span>
          </div> */}
        </div>

        {/* Total Registered Users Card */}
        <div className={styles.metricCard}>
          <div className={styles.cardHeader}>
            <span className={styles.cardLabel}>Total Registered Users</span>
            <div className={styles.iconBox}>👥</div>
          </div>
          <div className={styles.metricRow}>
            <span className={styles.primaryMetric}>
              {platformData?.totalUsers?.toLocaleString("en-KE") ??
                (loading ? "..." : "0")}
            </span>
            <span className={styles.metricUnit}>users</span>
          </div>
          {/*<div className={styles.cardFooter}>
            <span className={`${styles.badge} ${styles.badgeGreen}`}>
              ↗ +18.2% MoM
            </span>
            <span className={styles.subtext}>96.8% phone verified</span>
          </div> */}
        </div>

        {/* Total Listers Card */}
        <div className={styles.metricCard}>
          <div className={styles.cardHeader}>
            <span className={styles.cardLabel}>Total Listers</span>
            <div className={`${styles.iconBox} ${styles.iconOrange}`}>✓</div>
          </div>
          <div className={styles.metricRow}>
            <span className={styles.primaryMetric}>
              {platformData?.totalListers?.toLocaleString("en-KE") ??
                (loading ? "..." : "0")}
            </span>
          </div>
          {/*<div className={styles.cardFooter}>
            <span className={`${styles.badge} ${styles.badgeGreen}`}>
              ↗ +6.5% MoM
            </span>
            <span className={styles.subtext}>92.4% portfolio active</span>
          </div> */}
        </div>
      </section>

      {/* Section Label */}
      <div className={styles.sectionDivider}>
        <span>AUDIENCE FOOTFALL</span>
        <span className={styles.metaInfo}>PostHog Telemetry Integration</span>
      </div>

      {/* Row 2: Audience Footfall Summary */}
      <section className={styles.visitorCardsGrid}>
        <div className={styles.visitorCard}>
          <span className={styles.cardLabel}>Total Unique Visitors</span>
          <div className={styles.visitorValueRow}>
            <span className={styles.visitorValue}>
              {totalVisitors.toLocaleString("en-KE")}
            </span>
            <span className={styles.visitorUnit}>sessions</span>
          </div>
          <p className={styles.visitorNote}>
            Across web portal, Android APK, and PWA instances
          </p>
        </div>

        <div className={styles.visitorCard}>
          <span className={styles.cardLabel}>New Visitors (Today)</span>
          <div className={styles.visitorValueRow}>
            <span className={styles.visitorValue}>
              {newVisitorsToday.toLocaleString("en-KE")}
            </span>
            {/* <span className={`${styles.badge} ${styles.badgeGreen}`}>
              ↑ +8.4% vs yesterday
            </span> */}
          </div>
          {/*<p className={styles.visitorNote}>
            Peak velocity recorded at 12:45 EAT – Nairobi Urban Ring
          </p>
           */}
        </div>
      </section>

      {/* Row 3: Visitors Over Time (Dual Stream 2-Line Graph) */}
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

        {/* Interactive SVG Line Chart Container */}
        <div className={styles.interactiveChartWrapper}>
          {/* Active Hover Tooltip */}
          {hoveredPoint && (
            <div className={styles.chartTooltip}>
              <strong>{hoveredPoint.date}</strong>
              <div className={styles.tooltipTotal}>
                Total Visitors: {hoveredPoint.total}
              </div>
              <div className={styles.tooltipNew}>
                New Visitors: {hoveredPoint.new}
              </div>
            </div>
          )}

          <div className={styles.svgContainer}>
            <svg viewBox="0 0 800 180" className={styles.chartSvg}>
              {/* Increased Background Grid Lines (5 rows evenly spaced) */}
              <line
                x1="0"
                y1="20"
                x2="800"
                y2="20"
                stroke="#e2e8f0"
                strokeWidth="1"
                strokeDasharray="4"
              />
              <line
                x1="0"
                y1="50"
                x2="800"
                y2="50"
                stroke="#f1f5f9"
                strokeWidth="1"
                strokeDasharray="4"
              />
              <line
                x1="0"
                y1="80"
                x2="800"
                y2="80"
                stroke="#f1f5f9"
                strokeWidth="1"
                strokeDasharray="4"
              />
              <line
                x1="0"
                y1="110"
                x2="800"
                y2="110"
                stroke="#f1f5f9"
                strokeWidth="1"
                strokeDasharray="4"
              />
              <line
                x1="0"
                y1="140"
                x2="800"
                y2="140"
                stroke="#f1f5f9"
                strokeWidth="1"
                strokeDasharray="4"
              />
              <line
                x1="0"
                y1="170"
                x2="800"
                y2="170"
                stroke="#e2e8f0"
                strokeWidth="1"
              />

              {/* Total Visitors Line (Blue) */}
              <path
                d={buildSvgPath(series, "total", 800, 160)}
                fill="none"
                stroke="#2563eb"
                strokeWidth="2.5"
              />
              {/* New Visitors Line (Orange) */}
              <path
                d={buildSvgPath(series, "new", 800, 160)}
                fill="none"
                stroke="#f59e0b"
                strokeWidth="2.5"
              />

              {/* Interactive Hover Hotspots */}
              {series.map((pt, i) => {
                const x = (i / Math.max(series.length - 1, 1)) * 800;

                // Calculate maxVal matching the path generator scaling
                const maxVal = Math.max(
                  ...series.map((p) => Math.max(p.total || 0, p.new || 0)),
                  1,
                );

                // Exact Y coordinate formula matching buildSvgPath height (160)
                const totalY = 170 - ((pt.total || 0) / maxVal) * 140;
                const newY = 170 - ((pt.new || 0) / maxVal) * 140;

                const isHovered = hoveredIndex === i;

                return (
                  <g
                    key={i}
                    onMouseEnter={() => {
                      setHoveredPoint(pt);
                      setHoveredIndex(i);
                    }}
                    onMouseLeave={() => {
                      setHoveredPoint(null);
                      setHoveredIndex(null);
                    }}>
                    {/* Vertical guide line on hover */}
                    {isHovered && (
                      <line
                        x1={x}
                        y1="20"
                        x2={x}
                        y2="170"
                        stroke="#cbd5e1"
                        strokeWidth="1.5"
                        strokeDasharray="2"
                      />
                    )}

                    {/* Invisible hover column for smooth mouse tracking */}
                    <rect
                      x={x - 15}
                      y="0"
                      width="30"
                      height="180"
                      fill="transparent"
                      style={{ cursor: "pointer" }}
                    />

                    {/* Highlight Dots locked precisely to their respective lines */}
                    {isHovered && (
                      <>
                        <circle
                          cx={x}
                          cy={totalY}
                          r="5.5"
                          fill="#ffffff"
                          stroke="#2563eb"
                          strokeWidth="3"
                        />
                        <circle
                          cx={x}
                          cy={newY}
                          r="5.5"
                          fill="#ffffff"
                          stroke="#f59e0b"
                          strokeWidth="3"
                        />
                      </>
                    )}
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        {/* Footer Metrics */}
        <div className={styles.chartFooterGrid}>
          <div>
            <span className={styles.footerLabel}>Avg. Daily Volume</span>
            <h4 className={styles.footerValue}>
              {Math.round(totalVisitors / Math.max(days, 1)).toLocaleString(
                "en-KE",
              )}{" "}
              / day
            </h4>
          </div>
          {/*<div>
            <span className={styles.footerLabel}>Conversion Rate</span>
            <h4 className={styles.footerValue}>18.51%</h4>
          </div>
          <div>
            <span className={styles.footerLabel}>Top Direct Channel</span>
            <h4 className={styles.footerValue}>PWA Mobile (62%)</h4>
          </div>
          <div>
            <span className={styles.footerLabel}>Bounce Rate</span>
            <h4 className={styles.footerValue}>24.2%</h4>
          </div> */}
        </div>
      </section>

      {/* Row 4: New Users Per Day */}
      <section className={styles.chartSection}>
        <div className={styles.chartHeader}>
          <div>
            <h3 className={styles.chartTitle}>
              New Users Per Day{" "}
              <span className={styles.pillTag}>Daily Acquisition</span>
            </h3>
            <p className={styles.chartSub}>
              Tenant account creations recorded by verification timestamp.
            </p>
          </div>
          <span className={styles.meanBadge}>
            ● {days}-Day Mean:{" "}
            {Math.round(
              growthSeries.reduce((acc, curr) => acc + (curr.users || 0), 0) /
                Math.max(days, 1),
            )}{" "}
            / day
          </span>
        </div>

        {/* Bar Chart Container */}
        <div className={styles.barChartContainer}>
          {growthSeries.map((item, idx, arr) => {
            const maxVal = Math.max(...arr.map((g) => Number(g.users) || 0), 1);
            const userCount = Number(item.users) || 0;

            // Calculate proportional height (0 count stays low to align cleanly)
            const heightPct =
              userCount === 0 ? 4 : Math.max((userCount / maxVal) * 100, 12);

            // Dynamic Shading: Peak days get darker (#0f172a / high opacity), low days get light gray
            const shadeRatio =
              userCount === 0 ? 0.25 : 0.4 + (userCount / maxVal) * 0.6;

            return (
              <div key={item.date || idx} className={styles.barColumn}>
                <div
                  className={styles.bar}
                  style={{
                    height: `${heightPct}%`,
                    backgroundColor: "#0f172a",
                    opacity: shadeRatio,
                  }}
                  title={`${item.date}: ${userCount} new users`}
                />
              </div>
            );
          })}
        </div>

        {/* Clean X-Axis Line */}
        <div className={styles.xAxisLine} />

        {/* Flat Milestone Date Labels at Bottom */}
        <div className={styles.barLabelArea}>
          {growthSeries.map((item, idx, arr) => {
            const total = arr.length;
            // Show flat milestones at Start, ~25%, ~50%, ~75%, and End
            const isMilestone =
              idx === 0 ||
              idx === total - 1 ||
              idx === Math.floor(total * 0.25) ||
              idx === Math.floor(total * 0.5) ||
              idx === Math.floor(total * 0.75);

            if (!isMilestone || !item.date) return <div key={idx} />;

            const [year, month, day] = item.date.split("-");
            const dateObj = new Date(year, month - 1, day);
            const formattedDate = dateObj.toLocaleDateString("en-GB", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            });

            return (
              <span key={item.date} className={styles.axisLabel}>
                {formattedDate}
              </span>
            );
          })}
        </div>
      </section>

      {/* Row 5: Growth Trends (Users, Listings, Listers) */}
      <section className={styles.bottomGrid}>
        {/* Growth of Users */}
        <div className={styles.growthCard}>
          {hoveredGrowth.type === "users" && hoveredGrowth.point && (
            <div className={styles.growthTooltip}>
              <span className={styles.tooltipDate}>
                {hoveredGrowth.point.date}
              </span>
              <strong>Users: {hoveredGrowth.point.users}</strong>
            </div>
          )}
          <div className={styles.growthHeader}>
            <div>
              <h4 className={styles.growthTitle}>Growth of Users</h4>
              <p className={styles.growthSub}>
                Cumulative registered tenant signups.
              </p>
            </div>
          </div>
          <div className={styles.areaContainer}>
            <svg viewBox="0 0 300 80" className={styles.areaSvg}>
              <defs>
                <linearGradient id="userGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#1e293b" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#1e293b" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path
                d={buildSvgArea(growthSeries, "users", 300, 80)}
                fill="url(#userGrad)"
              />
              <path
                d={buildSvgPath(growthSeries, "users", 300, 80)}
                fill="none"
                stroke="#1e293b"
                strokeWidth="2"
              />
              {growthSeries.map((pt, i) => {
                const maxVal = Math.max(
                  ...growthSeries.map((p) => Number(p.users) || 0),
                  5,
                );
                const x = (i / Math.max(growthSeries.length - 1, 1)) * 300;
                const y = 80 - ((Number(pt.users) || 0) / maxVal) * 60 - 10;
                const isHovered =
                  hoveredGrowth.type === "users" && hoveredGrowth.index === i;
                return (
                  <g
                    key={i}
                    onMouseEnter={() =>
                      setHoveredGrowth({ type: "users", index: i, point: pt })
                    }
                    onMouseLeave={() =>
                      setHoveredGrowth({ type: null, point: null, index: null })
                    }>
                    <rect
                      x={x - 12}
                      y="0"
                      width="24"
                      height="80"
                      fill="transparent"
                      style={{ cursor: "pointer" }}
                    />
                    {isHovered && (
                      <circle
                        cx={x}
                        cy={y}
                        r="4.5"
                        fill="#ffffff"
                        stroke="#1e293b"
                        strokeWidth="2.5"
                      />
                    )}
                  </g>
                );
              })}
            </svg>
          </div>
          <div className={styles.growthFooter}>
            <span>Current Rate</span>
            <span className={styles.boldText}>
              {platformData?.totalUsers?.toLocaleString("en-KE") || 0} Total
            </span>
          </div>
        </div>

        {/* Growth of Listings */}
        <div className={styles.growthCard}>
          {hoveredGrowth.type === "listings" && hoveredGrowth.point && (
            <div className={styles.growthTooltip}>
              <span className={styles.tooltipDate}>
                {hoveredGrowth.point.date}
              </span>
              <strong>Listings: {hoveredGrowth.point.listings}</strong>
            </div>
          )}
          <div className={styles.growthHeader}>
            <div>
              <h4 className={styles.growthTitle}>Growth of Listings</h4>
              <p className={styles.growthSub}>
                Active residential and retail inventory.
              </p>
            </div>
          </div>
          <div className={styles.areaContainer}>
            <svg viewBox="0 0 300 80" className={styles.areaSvg}>
              <defs>
                <linearGradient id="listingGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2563eb" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#2563eb" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path
                d={buildSvgArea(growthSeries, "listings", 300, 80)}
                fill="url(#listingGrad)"
              />
              <path
                d={buildSvgPath(growthSeries, "listings", 300, 80)}
                fill="none"
                stroke="#2563eb"
                strokeWidth="2"
              />
              {growthSeries.map((pt, i) => {
                const maxVal = Math.max(
                  ...growthSeries.map((p) => Number(p.listings) || 0),
                  5,
                );
                const x = (i / Math.max(growthSeries.length - 1, 1)) * 300;
                const y = 80 - ((Number(pt.listings) || 0) / maxVal) * 60 - 10;
                const isHovered =
                  hoveredGrowth.type === "listings" &&
                  hoveredGrowth.index === i;
                return (
                  <g
                    key={i}
                    onMouseEnter={() =>
                      setHoveredGrowth({
                        type: "listings",
                        index: i,
                        point: pt,
                      })
                    }
                    onMouseLeave={() =>
                      setHoveredGrowth({ type: null, point: null, index: null })
                    }>
                    <rect
                      x={x - 12}
                      y="0"
                      width="24"
                      height="80"
                      fill="transparent"
                      style={{ cursor: "pointer" }}
                    />
                    {isHovered && (
                      <circle
                        cx={x}
                        cy={y}
                        r="4.5"
                        fill="#ffffff"
                        stroke="#2563eb"
                        strokeWidth="2.5"
                      />
                    )}
                  </g>
                );
              })}
            </svg>
          </div>
          <div className={styles.growthFooter}>
            <span>Live Properties</span>
            <span className={styles.boldText}>
              {platformData?.totalListings?.toLocaleString("en-KE") || 0} Total
            </span>
          </div>
        </div>

        {/* Growth of Listers */}
        <div className={styles.growthCard}>
          {hoveredGrowth.type === "listers" && hoveredGrowth.point && (
            <div className={styles.growthTooltip}>
              <span className={styles.tooltipDate}>
                {hoveredGrowth.point.date}
              </span>
              <strong>Listers: {hoveredGrowth.point.listers}</strong>
            </div>
          )}
          <div className={styles.growthHeader}>
            <div>
              <h4 className={styles.growthTitle}>Growth of Listers</h4>
              <p className={styles.growthSub}>
                Property managers & individual owners.
              </p>
            </div>
          </div>
          <div className={styles.areaContainer}>
            <svg viewBox="0 0 300 80" className={styles.areaSvg}>
              <defs>
                <linearGradient id="listerGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path
                d={buildSvgArea(growthSeries, "listers", 300, 80)}
                fill="url(#listerGrad)"
              />
              <path
                d={buildSvgPath(growthSeries, "listers", 300, 80)}
                fill="none"
                stroke="#f59e0b"
                strokeWidth="2"
              />
              {growthSeries.map((pt, i) => {
                const maxVal = Math.max(
                  ...growthSeries.map((p) => Number(p.listers) || 0),
                  5,
                );
                const x = (i / Math.max(growthSeries.length - 1, 1)) * 300;
                const y = 80 - ((Number(pt.listers) || 0) / maxVal) * 60 - 10;
                const isHovered =
                  hoveredGrowth.type === "listers" && hoveredGrowth.index === i;
                return (
                  <g
                    key={i}
                    onMouseEnter={() =>
                      setHoveredGrowth({ type: "listers", index: i, point: pt })
                    }
                    onMouseLeave={() =>
                      setHoveredGrowth({ type: null, point: null, index: null })
                    }>
                    <rect
                      x={x - 12}
                      y="0"
                      width="24"
                      height="80"
                      fill="transparent"
                      style={{ cursor: "pointer" }}
                    />
                    {isHovered && (
                      <circle
                        cx={x}
                        cy={y}
                        r="4.5"
                        fill="#ffffff"
                        stroke="#f59e0b"
                        strokeWidth="2.5"
                      />
                    )}
                  </g>
                );
              })}
            </svg>
          </div>
          <div className={styles.growthFooter}>
            <span>Onboarded Listers</span>
            <span className={styles.boldText}>
              {platformData?.totalListers?.toLocaleString("en-KE") || 0} Total
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}

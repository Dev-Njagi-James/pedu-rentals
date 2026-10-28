import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { parseRange, todayEAT } from "@/lib/admin/dateRange";

const TZ = "Africa/Nairobi";
const day = (col) => `toDate(toTimeZone(${col}, '${TZ}'))`;

export async function GET(request) {
  const gate = await requireAdmin();
  if (gate.error) return gate.error;

  const { searchParams } = new URL(request.url);
  const range = parseRange(searchParams);
  if (range.error) {
    return NextResponse.json({ error: range.error }, { status: 400 });
  }
  const part = searchParams.get("part"); // "summary" | "series" | null (both)

  const apiKey = process.env.POSTHOG_PERSONAL_API_KEY;
  const projectId = process.env.POSTHOG_PROJECT_ID;
  const host = process.env.POSTHOG_HOST || "https://app.posthog.com";
  if (!apiKey || !projectId) {
    return NextResponse.json(
      { error: "PostHog credentials not configured" },
      { status: 500 },
    );
  }

  const { from, to } = range; // validated YYYY-MM-DD only
  const today = todayEAT();

  const run = (query) =>
    fetch(`${host}/api/projects/${projectId}/query/`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: { kind: "HogQLQuery", query } }),
    });

  const firstSeen = `(SELECT person_id, min(timestamp) AS first_seen FROM events GROUP BY person_id)`;

  const summarySql = `
    SELECT
      (SELECT count(DISTINCT person_id) FROM events
         WHERE ${day("timestamp")} >= toDate('${from}') AND ${day("timestamp")} <= toDate('${to}')) AS total_visitors,
      (SELECT count(DISTINCT person_id) FROM ${firstSeen}
         WHERE ${day("first_seen")} >= toDate('${from}') AND ${day("first_seen")} <= toDate('${to}')) AS new_visitors,
      (SELECT count(DISTINCT person_id) FROM ${firstSeen}
         WHERE ${day("first_seen")} = toDate('${today}')) AS new_today
  `;

  const seriesSql = `
    SELECT
      ${day("e.timestamp")} AS d,
      count(DISTINCT e.person_id) AS total_count,
      count(DISTINCT CASE WHEN ${day("f.first_seen")} = ${day("e.timestamp")} THEN e.person_id END) AS new_count
    FROM events e
    JOIN ${firstSeen} f ON e.person_id = f.person_id
    WHERE ${day("e.timestamp")} >= toDate('${from}') AND ${day("e.timestamp")} <= toDate('${to}')
    GROUP BY d
    ORDER BY d ASC
  `;

  try {
    const wantSummary = part !== "series";
    const wantSeries = part !== "summary";

    const [summaryRes, seriesRes] = await Promise.all([
      wantSummary ? run(summarySql) : null,
      wantSeries ? run(seriesSql) : null,
    ]);

    if ((summaryRes && !summaryRes.ok) || (seriesRes && !seriesRes.ok)) {
      return NextResponse.json(
        { error: "PostHog API execution error" },
        { status: 500 },
      );
    }

    const body = { from, to };

    if (summaryRes) {
      const row = (await summaryRes.json()).results?.[0] ?? [0, 0, 0];
      body.totalVisitors = row[0] || 0;
      body.newVisitors = row[1] || 0;
      body.newVisitorsToday = row[2] || 0;
    }

    if (seriesRes) {
      const byDay = {};
      for (const [d, total, fresh] of (await seriesRes.json()).results ?? []) {
        byDay[String(d).slice(0, 10)] = { total, new: fresh };
      }
      body.series = range.dates.map((date) => ({
        date,
        total: byDay[date]?.total ?? 0,
        new: byDay[date]?.new ?? 0,
      }));
    }

    return NextResponse.json(body);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/requireAdmin";

export async function GET(request) {
  const gate = await requireAdmin();
  if (gate.error) return gate.error;

  const { searchParams } = new URL(request.url);
  const days = parseInt(searchParams.get("days") || "30", 10);

  const apiKey = process.env.POSTHOG_PERSONAL_API_KEY;
  const projectId = process.env.POSTHOG_PROJECT_ID;
  const host = process.env.POSTHOG_HOST || "https://app.posthog.com";

  if (!apiKey || !projectId) {
    return NextResponse.json(
      { error: "PostHog credentials not configured" },
      { status: 500 },
    );
  }

  try {
    // 1. Fetch total visitors and new visitors today
    const summaryQuery = {
      query: {
        kind: "HogQLQuery",
        query: `
          SELECT 
            (SELECT count(DISTINCT person_id) FROM events WHERE timestamp >= now() - interval ${days} day) as total_visitors,
            (SELECT count(DISTINCT person_id) FROM (SELECT person_id, min(timestamp) as first_seen FROM events GROUP BY person_id) WHERE toDate(first_seen) = today()) as new_visitors_today
        `,
      },
    };

    // 2. Fetch the daily breakdown series for total and new visitors per day
    const seriesQuery = {
      query: {
        kind: "HogQLQuery",
        query: `
          SELECT 
            toDate(e.timestamp) as day,
            count(DISTINCT e.person_id) as total_count,
            count(DISTINCT CASE WHEN toDate(f.first_seen_time) = toDate(e.timestamp) THEN e.person_id END) as new_count
          FROM events e
          JOIN (
            SELECT person_id, min(timestamp) as first_seen_time 
            FROM events 
            GROUP BY person_id
          ) f ON e.person_id = f.person_id
          WHERE e.timestamp >= now() - interval ${days} day
          GROUP BY day
          ORDER BY day ASC
        `,
      },
    };

    const [summaryRes, seriesRes] = await Promise.all([
      fetch(`${host}/api/projects/${projectId}/query/`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(summaryQuery),
      }),
      fetch(`${host}/api/projects/${projectId}/query/`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(seriesQuery),
      }),
    ]);

    if (!summaryRes.ok || !seriesRes.ok) {
      return NextResponse.json(
        { error: "PostHog API execution error" },
        { status: 500 },
      );
    }

    const summaryData = await summaryRes.json();
    const seriesData = await seriesRes.json();

    const summaryRow = summaryData.results?.[0] || [0, 0];
    const rawSeries = seriesData.results || [];

    const series = rawSeries.map(([day, totalCount, newCount]) => ({
      date: day,
      total: totalCount,
      new: newCount,
    }));

    return NextResponse.json({
      totalVisitors: summaryRow[0] || 0,
      newVisitorsToday: summaryRow[1] || 0,
      series,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { parseRange } from "@/lib/admin/dateRange";

const cache = new Map(); // key -> { body, t }
const TTL_MS = 3 * 60 * 1000;
const TZ = "Africa/Nairobi";
const day = (col) => `toDate(toTimeZone(${col}, '${TZ}'))`;
const ev = (a = "") =>
  `${a}event = '$pageview' AND ${a}properties.$host = 'www.pedurentals.com' AND ifNull(toString(${a}person.properties.is_admin), '') != 'true'`;

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

  const run = async (query, attempts = 3) => {
    let lastErr;
    for (let i = 0; i < attempts; i++) {
      try {
        return await fetch(`${host}/api/projects/${projectId}/query/`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ query: { kind: "HogQLQuery", query } }),
          signal: AbortSignal.timeout(30000),
        });
      } catch (err) {
        lastErr = err;
        await new Promise((r) => setTimeout(r, 600 * (i + 1)));
      }
    }
    throw lastErr;
  };

  // Events after the range cannot change anyone's first day or in-range
  // status. The 2-day padding covers the EAT offset.
  const upperBound = `timestamp < toDateTime('${to}') + INTERVAL 2 DAY`;

  // One pass over events: first-ever day per person, plus whether they were
  // seen inside the range.
  const summarySql = `
    SELECT
      countIf(in_range > 0) AS total_visitors,
      countIf(first_day >= toDate('${from}') AND first_day <= toDate('${to}')) AS new_visitors
    FROM (
      SELECT
        person_id,
        min(${day("timestamp")}) AS first_day,
        countIf(${day("timestamp")} >= toDate('${from}') AND ${day("timestamp")} <= toDate('${to}')) AS in_range
      FROM events
      WHERE ${ev()} AND ${upperBound}
      GROUP BY person_id
    )
  `;

  // Join deduplicated person-days to deduplicated first days.
  const seriesSql = `
    SELECT
      pd.d AS d,
      count() AS total_count,
      countIf(pd.d = f.first_day) AS new_count
    FROM (
      SELECT person_id, ${day("timestamp")} AS d
      FROM events
      WHERE ${ev()}
        AND ${day("timestamp")} >= toDate('${from}')
        AND ${day("timestamp")} <= toDate('${to}')
      GROUP BY person_id, d
    ) AS pd
    JOIN (
      SELECT person_id, min(${day("timestamp")}) AS first_day
      FROM events
      WHERE ${ev()} AND ${upperBound}
      GROUP BY person_id
    ) AS f ON pd.person_id = f.person_id
    GROUP BY pd.d
    ORDER BY pd.d ASC
  `;

  try {
    const wantSummary = part !== "series";
    const wantSeries = part !== "summary";

    const [summaryRes, seriesRes] = await Promise.all([
      wantSummary ? run(summarySql) : null,
      wantSeries ? run(seriesSql) : null,
    ]);

    // Log the real PostHog error so a failure is visible in the terminal.
    for (const [name, r] of [
      ["summary", summaryRes],
      ["series", seriesRes],
    ]) {
      if (r && !r.ok) {
        console.error(
          `[visitors:${name}] PostHog error`,
          r.status,
          await r.text(),
        );
        return NextResponse.json(
          { error: "PostHog API execution error" },
          { status: 500 },
        );
      }
    }

    const body = { from, to };
    const cacheKey = `${part ?? "all"}:${from}:${to}`;
    const hit = cache.get(cacheKey);
    if (hit && Date.now() - hit.t < TTL_MS) {
      return NextResponse.json(hit.body);
    }

    if (summaryRes) {
      const row = (await summaryRes.json()).results?.[0] ?? [0, 0];
      body.totalVisitors = row[0] || 0;
      body.newVisitors = row[1] || 0;
      body.returningVisitors = Math.max(
        0,
        body.totalVisitors - body.newVisitors,
      );
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
    console.error("[visitors] route failed", error);
    if (hit) return NextResponse.json(hit.body);
    return NextResponse.json(
      { error: "Visitors query failed." },
      { status: 500 },
    );
  }
}

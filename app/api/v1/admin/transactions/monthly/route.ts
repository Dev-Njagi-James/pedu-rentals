import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { paymentsSupabase } from "@/lib/supabase/paymentsClient";

const EAT_MS = 3 * 3600 * 1000;

const monthKeyEAT = (iso: string) =>
  new Date(new Date(iso).getTime() + EAT_MS).toISOString().slice(0, 7);

export async function GET() {
  const gate = await requireAdmin();
  if (gate.error) return gate.error;

  try {
    const cols =
      "payment_id, merchant_reference, provider_receipt, created_at, amount_kes, status, plan_name, payment_method, provider, lister_uuid";

    const [listerRes, accessRes] = await Promise.all([
      paymentsSupabase
        .from("payments_table")
        .select(cols)
        .eq("status", "completed"),
      paymentsSupabase
        .from("access_payments")
        .select(cols)
        .eq("status", "completed"),
    ]);
    if (listerRes.error) throw listerRes.error;
    if (accessRes.error) throw accessRes.error;

    const listerPay = listerRes.data ?? [];
    const accessPay = accessRes.data ?? [];

    const ids = [
      ...new Set([...listerPay, ...accessPay].map((r) => r.lister_uuid)),
    ];
    const nameById = new Map<string, string>();
    if (ids.length) {
      const { data: users, error: uErr } = await paymentsSupabase
        .from("users_table")
        .select("lister_uuid, username, lister_email")
        .in("lister_uuid", ids);
      if (uErr) throw uErr;
      (users ?? []).forEach((u) =>
        nameById.set(
          u.lister_uuid,
          u.username || u.lister_email || u.lister_uuid,
        ),
      );
    }
    const who = (id: string) => nameById.get(id) ?? id;

    const listerTx = listerPay.map((r) => ({
      id: `L-${r.payment_id}`,
      date: r.created_at,
      reference: r.merchant_reference || r.provider_receipt || "-",
      description: `${r.plan_name} Lister Plan Subscription`,
      category: "Lister Plan",
      customerLister: who(r.lister_uuid),
      paymentMethod: r.payment_method || r.provider || "-",
      moneyIn: r.amount_kes || 0,
      status: r.status,
    }));

    const accessTx = accessPay.map((r) => ({
      id: `A-${r.payment_id}`,
      date: r.created_at,
      reference: r.merchant_reference || r.provider_receipt || "-",
      description: `${r.plan_name} User Pass`,
      category: "User 24-Hour Access",
      customerLister: who(r.lister_uuid),
      paymentMethod: r.payment_method || r.provider || "-",
      moneyIn: r.amount_kes || 0,
      status: r.status,
    }));

    const transactions = [...listerTx, ...accessTx].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );

    const monthly: Record<string, number> = {};
    for (const tx of transactions) {
      if (!tx.date) continue;
      const k = monthKeyEAT(tx.date);
      monthly[k] = (monthly[k] || 0) + tx.moneyIn;
    }
    const series = Object.keys(monthly)
      .sort()
      .map((month) => ({ month, revenue: monthly[month] }));

        const nowEAT = new Date(Date.now() + EAT_MS);
        const currentKey = nowEAT.toISOString().slice(0, 7);
        const dayOfMonth = nowEAT.getUTCDate();
        const daysInMonth = new Date(
          Date.UTC(nowEAT.getUTCFullYear(), nowEAT.getUTCMonth() + 1, 0),
        ).getUTCDate();

        // Next-month estimate: weighted average of the last 3 FULL months (weights 1,2,3).
        const full = series.filter((s) => s.month < currentKey).slice(-3);
        const weights = [1, 2, 3].slice(-full.length);
        const weightSum = weights.reduce((a, b) => a + b, 0);
        const nextMonthProjection = full.length
          ? Math.round(
              full.reduce((a, s, i) => a + s.revenue * weights[i], 0) /
                weightSum,
            )
          : 0;

        // Current month so far, split by category, with run-rate projection.
        const mtdTx = transactions.filter(
          (t) => t.date && monthKeyEAT(t.date) === currentKey,
        );
        const mtdTotal = mtdTx.reduce((a, t) => a + t.moneyIn, 0);
        const mtdListers = mtdTx
          .filter((t) => t.category === "Lister Plan")
          .reduce((a, t) => a + t.moneyIn, 0);

        const monthToDate = {
          total: mtdTotal,
          listers: mtdListers,
          users: mtdTotal - mtdListers,
          dayOfMonth,
          daysInMonth,
          projectedMonthEnd: Math.round((mtdTotal / dayOfMonth) * daysInMonth),
        };

        return NextResponse.json({
          transactions,
          series,
          nextMonthProjection,
          monthToDate,
        });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

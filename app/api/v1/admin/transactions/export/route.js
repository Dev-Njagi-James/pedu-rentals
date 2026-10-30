import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { paymentsSupabase } from "@/lib/supabase/paymentsClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EAT_MS = 3 * 3600 * 1000;
const HEADER_BG = "FF1F4E78";
const BAND_BG = "FFDCE6F1";
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const PAGE = 1000;

const COLS =
  "payment_id, merchant_reference, provider_receipt, created_at, amount_kes, status, plan_name, payment_method, provider, lister_uuid";

const COLUMNS = [
  { header: "Date", key: "date", width: 13 },
  { header: "Reference", key: "reference", width: 22 },
  { header: "Description", key: "description", width: 32 },
  { header: "Type", key: "type", width: 12 },
  { header: "Category", key: "category", width: 20 },
  { header: "Lister Plan", key: "plan", width: 16 },
  { header: "Customer/Lister", key: "customer", width: 30 },
  { header: "Payment Method", key: "method", width: 16 },
  { header: "Money In", key: "moneyIn", width: 14 },
  { header: "Net", key: "net", width: 14 },
  { header: "Status", key: "status", width: 13 },
  { header: "Notes", key: "notes", width: 28 },
];
// A Date, B Reference, C Description, D Type, E Category, F Lister Plan,
// G Customer/Lister, H Payment Method, I Money In, J Net, K Status, L Notes

// "YYYY-MM-DD" in Nairobi -> UTC ISO instant at 00:00 EAT.
const eatMidnightISO = (ymd, addDays = 0) => {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + addDays) - EAT_MS).toISOString();
};

async function fetchAll(table, { fromISO, toISO, status }) {
  const out = [];
  for (let from = 0; ; from += PAGE) {
    let q = paymentsSupabase.from(table).select(COLS);
    if (status !== "all") q = q.eq("status", status);
    if (fromISO) q = q.gte("created_at", fromISO);
    if (toISO) q = q.lt("created_at", toISO);
    const { data, error } = await q
      .order("created_at", { ascending: false })
      .order("payment_id", { ascending: false }) // stable paging
      .range(from, from + PAGE - 1);
    if (error) throw new Error(`${table}: ${error.message}`);
    out.push(...(data ?? []));
    if (!data || data.length < PAGE) break;
  }
  return out;
}

async function lookupNames(ids) {
  const map = new Map();
  for (let i = 0; i < ids.length; i += 100) {
    const { data, error } = await paymentsSupabase
      .from("users_table")
      .select("lister_uuid, username, lister_email")
      .in("lister_uuid", ids.slice(i, i + 100));
    if (error) throw new Error(`users_table: ${error.message}`);
    (data ?? []).forEach((u) =>
      map.set(u.lister_uuid, u.username || u.lister_email || u.lister_uuid),
    );
  }
  return map;
}

const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1).toLowerCase() : "");

export async function GET(request) {
  const gate = await requireAdmin();
  if (gate.error) return gate.error;

  const sp = new URL(request.url).searchParams;
  const from = sp.get("from");
  const to = sp.get("to");
  const status = (sp.get("status") || "completed").toLowerCase();

  if ((from && !DATE_RE.test(from)) || (to && !DATE_RE.test(to))) {
    return NextResponse.json(
      { error: "from/to must be YYYY-MM-DD" },
      { status: 400 },
    );
  }
  if (from && to && from > to) {
    return NextResponse.json({ error: "from is after to" }, { status: 400 });
  }
  if (!["completed", "pending", "failed", "all"].includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const filter = {
    fromISO: from ? eatMidnightISO(from) : null,
    toISO: to ? eatMidnightISO(to, 1) : null, // inclusive end day
    status,
  };

  try {
    const [listerPay, accessPay] = await Promise.all([
      fetchAll("payments_table", filter),
      fetchAll("access_payments", filter),
    ]);

    const ids = [
      ...new Set([...listerPay, ...accessPay].map((r) => r.lister_uuid)),
    ].filter(Boolean);
    const names = await lookupNames(ids);
    const who = (id) => names.get(id) ?? id ?? "";

    const rows = [
      ...listerPay.map((r) => ({
        raw: r.created_at,
        reference: r.merchant_reference || r.provider_receipt || "-",
        description: `${r.plan_name} Lister Plan Subscription`,
        category: "Lister Plan",
        plan: r.plan_name ?? "",
        customer: who(r.lister_uuid),
        method: r.payment_method || r.provider || "-",
        moneyIn: Number(r.amount_kes) || 0,
        status: cap(r.status),
      })),
      ...accessPay.map((r) => ({
        raw: r.created_at,
        reference: r.merchant_reference || r.provider_receipt || "-",
        description: `${r.plan_name} User Pass`,
        category: "User 24-Hour Access",
        plan: "",
        customer: who(r.lister_uuid),
        method: r.payment_method || r.provider || "-",
        moneyIn: Number(r.amount_kes) || 0,
        status: cap(r.status),
      })),
    ].sort((a, b) => new Date(b.raw) - new Date(a.raw));

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Transactions", {
      views: [{ state: "frozen", ySplit: 1 }],
    });
    ws.columns = COLUMNS;

    ws.getRow(1).eachCell((c) => {
      c.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 10 };
      c.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: HEADER_BG },
      };
      c.alignment = { vertical: "middle" };
    });

    rows.forEach((r, i) => {
      const n = i + 2;
      const row = ws.addRow({
        date: new Date(new Date(r.raw).getTime() + EAT_MS),
        reference: r.reference,
        description: r.description,
        type: "Income",
        category: r.category,
        plan: r.plan,
        customer: r.customer,
        method: r.method,
        moneyIn: r.moneyIn,
        net: { formula: `I${n}`, result: r.moneyIn },
        status: r.status,
        notes: "",
      });
      row.getCell("date").numFmt = "dd/mm/yyyy";
      row.getCell("moneyIn").numFmt = "#,##0";
      row.getCell("net").numFmt = "#,##0";
      if (i % 2 === 0) {
        row.eachCell({ includeEmpty: true }, (c) => {
          c.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: BAND_BG },
          };
        });
      }
    });

    const last = rows.length + 1;
    if (rows.length > 0) ws.autoFilter = `A1:L${last}`;

    const totalAll = rows.reduce((s, r) => s + r.moneyIn, 0);
    const totalDone = rows
      .filter((r) => r.status === "Completed")
      .reduce((s, r) => s + r.moneyIn, 0);

    const addTotal = (label, fI, fJ, result, strong = false) => {
      const row = ws.addRow({});
      row.getCell("customer").value = label;
      row.getCell("moneyIn").value = { formula: fI, result };
      row.getCell("net").value = { formula: fJ, result };
      for (let col = 7; col <= 10; col++) {
        const c = row.getCell(col);
        c.font = { bold: true, size: strong ? 11 : 10 };
        c.border = strong
          ? { top: { style: "thin" }, bottom: { style: "double" } }
          : { top: { style: "thin" } };
        if (strong) {
          c.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: BAND_BG },
          };
        }
      }
      row.getCell("moneyIn").numFmt = "#,##0";
      row.getCell("net").numFmt = "#,##0";
    };

    ws.addRow({});
    if (rows.length > 0) {
      addTotal(
        "TOTAL (visible rows)",
        `SUBTOTAL(109,I2:I${last})`,
        `SUBTOTAL(109,J2:J${last})`,
        totalAll,
      );
      addTotal(
        "NET TOTAL (completed)",
        `SUMIF(K2:K${last},"Completed",I2:I${last})`,
        `SUMIF(K2:K${last},"Completed",J2:J${last})`,
        totalDone,
        true,
      );
    }

    const buffer = await wb.xlsx.writeBuffer();
    const today = new Date(Date.now() + EAT_MS).toISOString().split("T")[0];
    const range =
      from || to ? `_${from || "start"}_to_${to || "today"}` : `_${today}`;

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="transactions${range}.xlsx"`,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

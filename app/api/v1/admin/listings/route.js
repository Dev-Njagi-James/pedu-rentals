import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { paymentsSupabase } from "@/lib/supabase/paymentsClient";

const PAGE_SIZE = 12;

export async function GET(request) {
  const gate = await requireAdmin();
  if (gate.error) return gate.error;

  const sp = new URL(request.url).searchParams;
  const page = Math.max(1, parseInt(sp.get("page") || "1", 10));
  const q = (sp.get("q") || "").trim();
  const category = sp.get("category") || "";
  const type = sp.get("type") || "";
  const status = sp.get("status") || "";
  const plan = sp.get("plan") || "";
  const ward = sp.get("ward") || "";
  const minPrice = sp.get("minPrice");
  const maxPrice = sp.get("maxPrice");
  const sort = sp.get("sort") || "newest";

  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  try {
    let query = paymentsSupabase.from("listings_table").select(
      `listing_id, listing_name, listing_category, category_type, furnishing,
       rent_duration, price_kes, listing_ward, ward_display_name, plan_name,
       payment_status, created_at, updated_at, lister_uuid,
       images_table (images_url, video_url),
       users_table!inner (lister_uuid, username, lister_email, phone_number, account_type)`,
      { count: "exact" },
    );

    if (q) {
      const safe = q.replace(/[,()%]/g, " ");
      query = /^\d+$/.test(q)
        ? query.or(`listing_name.ilike.%${safe}%,listing_id.eq.${q}`)
        : query.ilike("listing_name", `%${safe}%`);
    }
    if (category) query = query.eq("listing_category", category);
    if (type) query = query.eq("category_type", type);
    if (status) query = query.eq("payment_status", status);
    if (plan) query = query.eq("plan_name", plan);
    if (ward) query = query.eq("listing_ward", ward);
    if (minPrice) query = query.gte("price_kes", Number(minPrice));
    if (maxPrice) query = query.lte("price_kes", Number(maxPrice));

    query =
      sort === "price"
        ? query.order("price_kes", { ascending: false })
        : query.order("created_at", { ascending: false });

    const [{ data: listings, count, error }, cats, wards] = await Promise.all([
      query.range(from, to),
      paymentsSupabase.from("categories_table").select("category_name"),
      paymentsSupabase
        .from("wards_table")
        .select("ward_id, ward_name")
        .order("ward_name"),
    ]);
    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 });

    const items = (listings ?? []).map(({ users_table, ...item }) => ({
      ...item,
      lister: {
        uuid: item.lister_uuid,
        username:
          users_table?.username || users_table?.lister_email || "Lister",
        email: users_table?.lister_email ?? null,
        phone: users_table?.phone_number ?? null,
      },
    }));

    return NextResponse.json({
      page,
      pageSize: PAGE_SIZE,
      totalItems: count || 0,
      totalPages: Math.ceil((count || 0) / PAGE_SIZE),
      items,
      facets: {
        categories: (cats.data ?? []).map((c) => c.category_name),
        wards: wards.data ?? [],
      },
    });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

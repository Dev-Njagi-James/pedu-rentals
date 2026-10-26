import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { paymentsSupabase } from "@/lib/supabase/paymentsClient";
import { clerkClient } from "@clerk/nextjs/server";

const PAGE_SIZE = 12;

export async function GET(request) {
  const gate = await requireAdmin();
  if (gate.error) return gate.error;

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const q = (searchParams.get("q") || "").trim();
  const category = searchParams.get("category") || "";
  const type = searchParams.get("type") || "";
  const status = searchParams.get("status") || "";
  const plan = searchParams.get("plan") || "";

  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  try {
    let query = paymentsSupabase.from("listings_table").select(
      `
        listing_id,
        listing_name,
        listing_category,
        category_type,
        furnishing,
        rent_duration,
        price_kes,
        listing_ward,
        ward_display_name,
        listing_description,
        plan_name,
        payment_status,
        created_at,
        updated_at,
        lister_uuid,
        images_table (images_url, video_url),
        users_table!inner (lister_uuid, account_type)
      `,
      { count: "exact" },
    );

    if (q) {
      query = query.ilike("listing_name", `%${q}%`);
    }
    if (category && category !== "all") {
      query = query.eq("listing_category", category);
    }
    if (type) {
      query = query.eq("category_type", type);
    }
    if (status) {
      query = query.eq("payment_status", status);
    }
    if (plan) {
      query = query.eq("plan_name", plan);
    }

    query = query.order("created_at", { ascending: false }).range(from, to);

    const { data: listings, count, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Attempt to fetch lister metadata from Clerk if uuids match, or provide defaults
    const client = await clerkClient();
    const listerUuids = Array.from(
      new Set((listings || []).map((item) => item.lister_uuid).filter(Boolean)),
    );

    let clerkUserMap = {};
    if (listerUuids.length > 0) {
      try {
        const usersList = await client.users.getUserList({
          userId: listerUuids,
          limit: 100,
        });
        const usersData = usersList.data || usersList;
        usersData.forEach((u) => {
          clerkUserMap[u.id] = {
            imageUrl: u.imageUrl,
            username:
              u.username ||
              `${u.firstName || ""} ${u.lastName || ""}`.trim() ||
              "Lister",
          };
        });
      } catch (err) {
        // Fallback gracefully if lister_uuid isn't a Clerk ID format
      }
    }

    const items = (listings || []).map((item) => {
      const listerInfo = clerkUserMap[item.lister_uuid] || {};
      return {
        ...item,
        lister: {
          uuid: item.lister_uuid,
          username: listerInfo.username || "Lister",
          imageUrl: listerInfo.imageUrl || null,
        },
      };
    });

    return NextResponse.json({
      page,
      pageSize: PAGE_SIZE,
      totalItems: count || 0,
      totalPages: Math.ceil((count || 0) / PAGE_SIZE),
      items,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

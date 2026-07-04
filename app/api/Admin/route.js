import { createServerSupabaseClient } from '../../../lib/supabase/server';
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createServerSupabaseClient();

  const [
    { count: activeListings,    error: listingError },
    { count: registeredListers, error: listersError },
  ] = await Promise.all([
    supabase.from("Property_Listing").select("*", { count: "exact", head: true }),
    supabase.from("Listers_Info").select("*", { count: "exact", head: true }),
  ]);

  if (listingError) return NextResponse.json({ error: listingError.message }, { status: 500 });
  if (listersError) return NextResponse.json({ error: listersError.message }, { status: 500 });

  return NextResponse.json({
    activeListings,
    suspendedListings: 0,
    registeredListers,
    totalVisits:       0,
  });
}
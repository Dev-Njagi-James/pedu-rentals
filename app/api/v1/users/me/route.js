import { NextResponse } from "next/server";
import { paymentsSupabase } from "@/lib/supabase/paymentsClient";
import { requireAuth } from "@/lib/auth/session";

export async function GET() {
  const { user, error, status } = await requireAuth();

  if (error) {
    return NextResponse.json({ error }, { status });
  }

  const { data, error: queryError } = await paymentsSupabase
    .from("users_table")
    .select(
      "lister_uuid, username, lister_organization, lister_email, phone_number, ward_name",
    )
    .eq("lister_uuid", user.id)
    .maybeSingle();

  if (queryError) {
    return NextResponse.json({ error: queryError.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({ data }, { status: 200 });
}

export async function PATCH(request) {
  const { user, error, status } = await requireAuth();

  if (error) {
    return NextResponse.json({ error }, { status });
  }

  const body = await request.json().catch(() => null);

  const ALLOWED_FIELDS = [
    "username",
    "lister_organization",
    "phone_number",
    "ward_name",
  ];

  const update = {};

  if (body && typeof body === "object" && !Array.isArray(body)) {
    for (const field of ALLOWED_FIELDS) {
      if (
        Object.prototype.hasOwnProperty.call(body, field) &&
        body[field] !== undefined
      ) {
        const value = body[field];
        if (value !== null && typeof value !== "string") {
          return NextResponse.json(
            { error: `Field "${field}" must be a string or null.` },
            { status: 400 },
          );
        }
        update[field] = value;
      }
    }
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json(
      { error: "No valid fields provided" },
      { status: 400 },
    );
  }

  const { data, error: queryError } = await paymentsSupabase
    .from("users_table")
    .update(update)
    .eq("lister_uuid", user.id)
    .select(
      "lister_uuid, username, lister_organization, lister_email, phone_number, ward_name",
    )
    .maybeSingle();

  if (queryError) {
    if (queryError.code === "23503") {
      return NextResponse.json(
        { error: "ward_name does not match an existing ward." },
        { status: 400 },
      );
    }
    return NextResponse.json({ error: queryError.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({ data }, { status: 200 });
}
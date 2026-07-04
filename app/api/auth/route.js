import { createAdminClient } from '../../../lib/supabase/server';
import { NextResponse } from "next/server";

const supabase = createAdminClient();

export async function POST(req) {
  const { mode, ...fields } = await req.json();

  if (mode === "signup") return handleSignup(fields);
  if (mode === "login") return handleLogin(fields);

  return NextResponse.json({ error: "Invalid mode." }, { status: 400 });
}

async function handleSignup({ username, password, email, organisationName, contact, ward }) {
  if (!username || !password || !email) {
    return NextResponse.json({ error: "Username, password and email are required." }, { status: 400 });
  }

  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 400 });
  }

  const userId = authData.user.id;

  const { error: profileError } = await supabase
    .from("Listers_Info")
    .insert({
      lister_UUID: userId,
      username: username,
      lister_email: email,
      lister_org: organisationName ?? null,
      lister_contact: contact ?? null,
      lister_ward: ward ?? null,
    });

  if (profileError) {
    await supabase.auth.admin.deleteUser(userId);
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, userId }, { status: 201 });
}
async function handleLogin({ username }) {
  if (!username) {
    return NextResponse.json({ error: "Username is required." }, { status: 400 });
  }

  // Check listers first
  const { data: profile, error: profileError } = await supabase
    .from("Listers_Info")
    .select("lister_UUID")
    .eq("username", username)
    .single();

  if (!profileError && profile) {
    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(
      profile.lister_UUID
    );

    if (userError || !userData?.user?.email) {
      return NextResponse.json({ error: "Invalid username or password." }, { status: 401 });
    }

    await supabase.auth.admin.updateUserById(profile.lister_UUID, {
      user_metadata: { role: 'lister' }
    });

    return NextResponse.json({ email: userData.user.email, role: "lister" }, { status: 200 });
  }


  const { data: adminData, error: adminError } = await supabase
    .from('Admin Table')
    .select('lister_uuid, email')
    .eq('username', username)
    .single();

  if (adminError || !adminData) {
    return NextResponse.json({ error: "Invalid username or password." }, { status: 401 });
  }

  await supabase.auth.admin.updateUserById(adminData.lister_uuid, {
    user_metadata: { role: 'admin' }
  });

  return NextResponse.json({ email: adminData.email, role: "admin" }, { status: 200 });
}
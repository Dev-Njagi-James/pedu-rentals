import { paymentsSupabase } from "@/lib/supabase/paymentsClient";

const TTL_MS = 30_000;
const FAIL_TTL_MS = 5_000;
const cache = new Map();

// Value used when the DB read fails or the row is missing.
// Every flag declares its own safe default here.
export const FLAG_DEFAULTS = {
  contact_access_payment_required: true, // fail closed: payment required
};

export async function getFlag(key) {
  const hit = cache.get(key);
  if (hit && hit.expiresAt > Date.now()) return hit.value;

  try {
    const { data, error } = await paymentsSupabase
      .from("feature_flags")
      .select("enabled, config")
      .eq("key", key)
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new Error("flag_missing");

    const value = { enabled: data.enabled, config: data.config ?? {} };
    cache.set(key, { value, expiresAt: Date.now() + TTL_MS });
    return value;
  } catch (e) {
    console.error("[flags]", key, e.message);
    const value = {
      enabled: FLAG_DEFAULTS[key] ?? false,
      config: {},
      fallback: true,
    };
    cache.set(key, { value, expiresAt: Date.now() + FAIL_TTL_MS });
    return value;
  }
}

export async function isFlagEnabled(key) {
  return (await getFlag(key)).enabled;
}

export function invalidateFlag(key) {
  if (key) cache.delete(key);
  else cache.clear();
}

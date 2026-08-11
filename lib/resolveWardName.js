// lib/resolveWardName.js
// Shared helper: resolve a ward_id to its canonical ward_name using the
// payments-project wards_table (new scheme).
//
// All Property_Listing.ward_id values are now new-scheme (migrated), so there is
// NO old-scheme lookup and NO ward_id_mapping query at request time. We resolve
// every ward_id directly against the new-scheme wards_table.
//
// Fallback: if the ward_id has NO row in the payments wards_table, return
// ward_name: null explicitly (never fall through to an unrelated name).
// Calling code must handle null as "Ward unavailable".
//
// Supports single input (returns { ward_id, ward_name }) and array input
// (returns a Map keyed by the ORIGINAL input ward_id) to avoid N+1 queries.

import { paymentsSupabase } from '@/lib/supabase/paymentsClient';

// Cache the new-scheme wards (id -> name) for the lifetime of the server process.
let nameCache = null;
let nameCachePromise = null;

async function loadNames() {
  if (nameCache) return nameCache;
  if (!nameCachePromise) {
    nameCachePromise = (async () => {
      const { data, error } = await paymentsSupabase
        .from('wards_table')
        .select('ward_id, ward_name');
      if (error) {
        nameCachePromise = null;
        throw new Error('resolveWardName: failed to load wards_table: ' + error.message);
      }
      const map = new Map();
      for (const row of data ?? []) {
        map.set(row.ward_id, row.ward_name);
      }
      nameCache = map;
      return map;
    })();
  }
  return nameCachePromise;
}

/**
 * Resolve a single ward_id to { ward_id, ward_name }.
 * ward_name is null if the ward_id has no row in the payments wards_table.
 */
export async function resolveWardName(wardId) {
  if (wardId == null) return { ward_id: null, ward_name: null };

  const names = await loadNames();

  // Fallback: if ward_id has no row in payments wards_table -> null, never unrelated.
  const wardName = names.has(wardId) ? names.get(wardId) : null;

  return { ward_id: wardId, ward_name: wardName };
}

/**
 * Resolve an array of ward_ids to a Map keyed by the ORIGINAL input ward_id.
 * Each value is { ward_id, ward_name (or null) }.
 * Single query for names -> no N+1.
 */
export async function resolveWardNames(wardIds) {
  const unique = [...new Set((wardIds ?? []).filter(id => id != null))];
  const result = new Map();

  if (unique.length === 0) return result;

  const names = await loadNames();

  for (const id of unique) {
    const wardName = names.has(id) ? names.get(id) : null;
    result.set(id, { ward_id: id, ward_name: wardName });
  }

  return result;
}
// Step 6 verification: confirm resolveWardName resolves every stored Property_Listing
// ward_id directly against the new-scheme payments wards_table (no mapping lookup).
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load .env
const envPath = path.resolve(__dirname, '..', '.env');
const env = fs.readFileSync(envPath, 'utf8');
for (const line of env.split('\n')) {
  const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*)\s*$/);
  if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}

const primary = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
const payments = createClient(
  process.env.PAYMENTS_SUPABASE_URL,
  process.env.PAYMENTS_SUPABASE_SERVICE_ROLE_KEY
);

// Replicates lib/resolveWardName.js direct-scheme logic
async function resolveWardNames(wardIds) {
  const unique = [...new Set((wardIds ?? []).filter(id => id != null))];
  const result = new Map();
  if (unique.length === 0) return result;

  const { data, error } = await payments.from('wards_table').select('ward_id, ward_name');
  if (error) throw new Error('wards_table error: ' + error.message);

  const names = new Map((data ?? []).map(r => [r.ward_id, r.ward_name]));
  console.log(`payments wards_table rows: ${names.size}`);

  for (const id of unique) {
    const wardName = names.has(id) ? names.get(id) : null;
    result.set(id, { ward_id: id, ward_name: wardName });
  }
  return result;
}

async function main() {
  const { data: listings, error } = await primary
    .from('Property_Listing')
    .select('listing_id, property_name, ward_id, ward_name');
  if (error) throw new Error('Property_Listing query error: ' + error.message);

  console.log(`Total listings: ${listings.length}\n`);

  const wardIds = listings.map(l => l.ward_id);
  const wardMap = await resolveWardNames(wardIds);

  console.log('\n=== Direct-scheme resolution check per listing ===');
  let pass = 0;
  let fail = 0;
  for (const l of listings) {
    const resolved = wardMap.get(l.ward_id) ?? {};
    const displayName = resolved.ward_name ?? 'NULL (Ward unavailable)';
    const storedName = l.ward_name ?? 'NULL';
    const ok = displayName === l.ward_name || (l.ward_name === null && displayName === 'NULL (Ward unavailable)');
    if (ok) pass++; else fail++;
    console.log(`  #${String(l.listing_id).padEnd(3)} stored_ward_id=${String(l.ward_id).padEnd(4)} -> resolved_name="${displayName}" (stored_column="${storedName}") ${ok ? 'OK' : 'MISMATCH'}`);
  }

  // Edge case: unresolvable ID
  console.log('\n=== Fallback check (gap ID) ===');
  const gapMap = await resolveWardNames([999999]);
  const gap = gapMap.get(999999);
  console.log(`  ward_id 999999 -> ward_name=${gap.ward_name === null ? 'null (CORRECT fallback)' : gap.ward_name}`);

  console.log(`\n=== RESULT: ${pass} OK, ${fail} MISMATCH ===`);
  if (fail > 0) process.exit(1);
}

main().catch(e => { console.error(e); process.exit(1); });
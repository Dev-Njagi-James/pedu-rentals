// Step 2: Identify Property_Listing rows whose ward_id is still old-scheme.
// Cross-reference against ward_id_mapping.old_ward_id (payments project).
// Read-only. Reports listing_id, current ward_id, mapped new_ward_id.
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

async function main() {
  // 1. Load mapping old -> new
  const { data: mappingRows, error: mapErr } = await payments
    .from('ward_id_mapping')
    .select('old_ward_id, new_ward_id');
  if (mapErr) throw new Error('mapping error: ' + mapErr.message);
  const oldToNew = new Map((mappingRows ?? []).map(r => [r.old_ward_id, r.new_ward_id]));
  console.log(`ward_id_mapping rows: ${oldToNew.size}`);

  // 2. Load all Property_Listing ward_ids
  const { data: listings, error: listErr } = await primary
    .from('Property_Listing')
    .select('listing_id, property_name, ward_id, ward_name');
  if (listErr) throw new Error('Property_Listing error: ' + listErr.message);
  console.log(`Total Property_Listing rows: ${listings.length}\n`);

  // 3. Identify old-scheme rows: ward_id present as old_ward_id in mapping
  const oldSchemeRows = listings.filter(l => oldToNew.has(l.ward_id));
  const newSchemeRows = listings.filter(l => !oldToNew.has(l.ward_id));

  console.log('=== OLD-SCHEME rows (need UPDATE) ===');
  console.log('listing_id | property_name | current ward_id | mapped new_ward_id');
  console.log('-----------|---------------|----------------|-------------------');
  for (const l of oldSchemeRows) {
    console.log(`${String(l.listing_id).padEnd(10)} | ${String(l.property_name).padEnd(13)} | ${String(l.ward_id).padEnd(14)} | ${oldToNew.get(l.ward_id)}`);
  }
  console.log(`\nOld-scheme rows: ${oldSchemeRows.length}`);

  console.log('\n=== NEW-scheme rows (no change needed) ===');
  for (const l of newSchemeRows) {
    console.log(`  #${l.listing_id} (${l.property_name}) ward_id=${l.ward_id} ward_name="${l.ward_name}"`);
  }
  console.log(`\nNew-scheme rows: ${newSchemeRows.length}`);
}

main().catch(e => { console.error(e); process.exit(1); });
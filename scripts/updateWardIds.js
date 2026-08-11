// Step 3: UPDATE 11 Property_Listing rows to their mapped new-scheme ward_id.
// Uses the primary service-role client. No `pg`/DB URL available, so we emulate
// transactionality: apply all updates, and if any fails, roll back the applied ones.
// Logs every row changed: listing_id, old ward_id, new ward_id.
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

// listing_id -> new ward_id (confirmed by location-text validation)
const updates = [
  { id: 84, new: 200 },
  { id: 85, new: 200 },
  { id: 86, new: 200 },
  { id: 87, new: 200 },
  { id: 88, new: 200 },
  { id: 89, new: 200 },
  { id: 90, new: 200 },
  { id: 91, new: 200 },
  { id: 43, new: 159 },
  { id: 40, new: 126 },
  { id: 34, new: 63 },
];

async function main() {
  // Pre-fetch current ward_ids to log old values and to verify
  const ids = updates.map(u => u.id);
  const { data: before, error: beforeErr } = await primary
    .from('Property_Listing')
    .select('listing_id, ward_id')
    .in('listing_id', ids);
  if (beforeErr) throw new Error('pre-fetch error: ' + beforeErr.message);
  const beforeById = new Map((before ?? []).map(r => [r.listing_id, r.ward_id]));

  console.log('=== STEP 3: UPDATE LOG ===');
  console.log('listing_id | old ward_id | new ward_id');
  console.log('-----------|-------------|-----------');

  const applied = []; // { id, old, new }
  let failed = null;

  for (const u of updates) {
    const old = beforeById.get(u.id);
    const { data, error } = await primary
      .from('Property_Listing')
      .update({ ward_id: u.new })
      .eq('listing_id', u.id)
      .select('listing_id, ward_id');

    if (error) {
      failed = { id: u.id, old, new: u.new, error: error.message };
      console.log(`${String(u.id).padEnd(10)} | ${String(old).padEnd(11)} | ${String(u.new).padEnd(9)} | FAILED: ${error.message}`);
      break;
    }
    const changed = data?.[0];
    applied.push({ id: u.id, old, new: u.new });
    console.log(`${String(u.id).padEnd(10)} | ${String(old).padEnd(11)} | ${String(u.new).padEnd(9)} | OK (now ${changed?.ward_id})`);
  }

  if (failed) {
    console.log(`\n!!! FAILURE at listing ${failed.id}. Rolling back ${applied.length} already-applied updates...`);
    // Roll back in reverse order
    for (const a of [...applied].reverse()) {
      const { error } = await primary
        .from('Property_Listing')
        .update({ ward_id: a.old })
        .eq('listing_id', a.id);
      if (error) {
        console.log(`  ROLLBACK FAILED for #${a.id}: ${error.message}`);
      } else {
        console.log(`  Rolled back #${a.id} to ${a.old}`);
      }
    }
    console.log('ABORTED — no partial state left (best effort).');
    process.exit(1);
  }

  console.log(`\nApplied updates: ${applied.length}`);

  // Verify: re-fetch and confirm each row now has the new value
  const { data: after, error: afterErr } = await primary
    .from('Property_Listing')
    .select('listing_id, ward_id')
    .in('listing_id', ids);
  if (afterErr) throw new Error('post-fetch error: ' + afterErr.message);
  const afterById = new Map((after ?? []).map(r => [r.listing_id, r.ward_id]));

  let verified = 0;
  for (const u of updates) {
    if (afterById.get(u.id) === u.new) verified++;
  }
  console.log(`Verified rows at new value: ${verified} / ${updates.length}`);

  // Confirm no OTHER rows were touched: total count of rows with these ward_ids
  const { count: total, error: countErr } = await primary
    .from('Property_Listing')
    .select('*', { count: 'exact', head: true });
  if (countErr) throw new Error('count error: ' + countErr.message);
  console.log(`Total Property_Listing rows now: ${total}`);

  if (verified !== updates.length) {
    console.log('MISMATCH: not all rows verified. Investigate before proceeding.');
    process.exit(1);
  }
  console.log('SUCCESS: exactly 11 rows updated and verified.');
}

main().catch(e => { console.error(e); process.exit(1); });
// Verify: do any active Property_Listing rows reference the 55 unmatched-old wards?
// Loads mapping from wardMapping.json, queries Property_Listing distinct ward_ids,
// and reports any that fall in the unmatched-old set.
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

async function main() {
  // Load mapping
  const mapping = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'wardMapping.json'), 'utf8'));

  // Build sets
  const unmatchedOld = mapping.filter(r => r.match_confidence === 'unmatched_old');
  const unmatchedOldIds = new Set(unmatchedOld.map(r => r.old_ward_id).filter(Boolean));
  const exactOldIds = new Set(mapping.filter(r => r.match_confidence === 'exact').map(r => r.old_ward_id));

  console.log(`Unmatched-old wards: ${unmatchedOldIds.size}`);
  console.log(`Exact-match old wards: ${exactOldIds.size}`);

  // Query all distinct ward_ids from Property_Listing
  const { data, error } = await primary
    .from('Property_Listing')
    .select('listing_id, ward_id, ward_name');

  if (error) throw new Error('Property_Listing query error: ' + error.message);

  const listings = data;
  console.log(`\nTotal Property_Listing rows: ${listings.length}`);

  // Distinct ward_ids in use
  const usedWardIds = new Set(listings.map(l => l.ward_id).filter(Boolean));
  console.log(`Distinct ward_ids in use: ${usedWardIds.size}`);

  // Check which used ward_ids are in unmatched-old
  const usedUnmatchedOld = [...usedWardIds].filter(id => unmatchedOldIds.has(id));
  console.log(`\nUsed ward_ids that are in unmatched-old set: ${usedUnmatchedOld.length}`);

  if (usedUnmatchedOld.length > 0) {
    console.log('\n!!! WARNING: These unmatched-old wards ARE referenced by listings:');
    for (const id of usedUnmatchedOld) {
      const wardName = unmatchedOld.find(r => r.old_ward_id === id)?.old_ward_name;
      const refs = listings.filter(l => l.ward_id === id).map(l => `#${l.listing_id} (${l.ward_name})`);
      console.log(`  ward_id ${id} (${wardName}): ${refs.join(', ')}`);
    }
  } else {
    console.log('CONFIRMED: No active listings reference any unmatched-old ward.');
  }

  // Also report which used ward_ids are NOT in the mapping at all (neither exact nor unmatched-old)
  const knownOldIds = new Set([...exactOldIds, ...unmatchedOldIds]);
  const unknownUsed = [...usedWardIds].filter(id => !knownOldIds.has(id));
  console.log(`\nUsed ward_ids not in mapping at all (neither exact nor unmatched-old): ${unknownUsed.length}`);
  if (unknownUsed.length > 0) {
    for (const id of unknownUsed) {
      const refs = listings.filter(l => l.ward_id === id).map(l => `#${l.listing_id} (${l.ward_name})`);
      console.log(`  ward_id ${id}: ${refs.join(', ')}`);
    }
  }

  // Report the full breakdown of used ward_ids
  console.log('\n=== All used ward_ids breakdown ===');
  const breakdown = {};
  for (const l of listings) {
    const id = l.ward_id;
    if (!breakdown[id]) breakdown[id] = { count: 0, names: new Set() };
    breakdown[id].count++;
    breakdown[id].names.add(l.ward_name);
  }
  for (const [id, info] of Object.entries(breakdown).sort((a, b) => a[0] - b[0])) {
    const status = exactOldIds.has(Number(id)) ? 'exact-match-old' :
                   unmatchedOldIds.has(Number(id)) ? 'UNMATCHED-OLD' :
                   'unknown';
    console.log(`  ward_id ${id}: ${info.count} listing(s), names=[${[...info.names].join(', ')}], status=${status}`);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
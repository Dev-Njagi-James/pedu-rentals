// Read-only validation before any UPDATE.
// 1. Query listing_id 96 directly (was in original audit with ward_id 110 but missing from last reports).
// 2. For each old-scheme candidate, pull location text (property_location, ward_location)
//    and check whether the text actually names the claimed old ward (not the new-scheme ward
//    that happens to share the same number).
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

// Claimed old ward per row: listing_id -> { current_id, claimed_old_name }
const candidates = [
  { id: 84,  current_id: 106, claimed: 'Ruiru' },
  { id: 90,  current_id: 106, claimed: 'Ruiru' },
  { id: 43,  current_id: 141, claimed: 'Mlolongo' },
  { id: 91,  current_id: 106, claimed: 'Ruiru' },
  { id: 40,  current_id: 133, claimed: 'Kitengela' },
  { id: 85,  current_id: 106, claimed: 'Ruiru' },
  { id: 86,  current_id: 106, claimed: 'Ruiru' },
  { id: 87,  current_id: 106, claimed: 'Ruiru' },
  { id: 34,  current_id: 31,  claimed: 'Clay City' },
  { id: 88,  current_id: 106, claimed: 'Ruiru' },
  { id: 89,  current_id: 106, claimed: 'Ruiru' },
];

function norm(s) { return (s ?? '').toString().trim().toLowerCase(); }

async function main() {
  // 1. Locate listing 96
  const { data: l96, error: e96 } = await primary
    .from('Property_Listing')
    .select('listing_id, property_name, ward_id, ward_name, property_location, ward_location, description')
    .eq('listing_id', 96);
  if (e96) throw new Error('listing 96 query error: ' + e96.message);
  console.log('=== LISTING 96 CHECK ===');
  if (!l96 || l96.length === 0) {
    console.log('listing_id 96: NOT FOUND — row does not exist (deleted or never in current snapshot)');
  } else {
    console.log('listing_id 96 EXISTS:', JSON.stringify(l96[0], null, 2));
  }

  // 2. Pull full rows (with location text) for the 11 candidates
  const ids = candidates.map(c => c.id);
  const { data: rows, error } = await primary
    .from('Property_Listing')
    .select('listing_id, property_name, ward_id, ward_name, property_location, ward_location, description')
    .in('listing_id', ids);

  if (error) throw new Error('candidate query error: ' + error.message);

  const rowById = new Map((rows ?? []).map(r => [r.listing_id, r]));

  console.log('\n=== PER-ROW MATCH CHECK ===');
  console.log('listing_id | current ward_id | claimed old ward | actual location text | match?');
  console.log('-----------|-----------------|------------------|----------------------|-------');
  let matches = [];
  let mismatches = [];
  for (const c of candidates) {
    const r = rowById.get(c.id);
    if (!r) {
      console.log(`${String(c.id).padEnd(10)} | ${String(c.current_id).padEnd(15)} | ${String(c.claimed).padEnd(16)} | (ROW NOT FOUND) | AMBIGUOUS`);
      mismatches.push({ ...c, reason: 'row not found' });
      continue;
    }
    const locationText = [r.property_location, r.ward_location, r.description].join(' | ');
    const textLower = norm(locationText);
    const wardNameLower = norm(r.ward_name);
    // Does any text field actually mention the claimed old ward name?
    const matchesClaimed = textLower.includes(norm(c.claimed)) || wardNameLower.includes(norm(c.claimed));
    const status = matchesClaimed ? 'MATCH' : 'MISMATCH';
    console.log(`${String(c.id).padEnd(10)} | ${String(c.current_id).padEnd(15)} | ${String(c.claimed).padEnd(16)} | ${String(locationText.slice(0, 80)).padEnd(22)} | ${status}`);
    console.log(`    ward_name column: "${r.ward_name}"`);
    console.log(`    property_location: "${r.property_location}"`);
    console.log(`    ward_location: "${r.ward_location}"`);
    if (matchesClaimed) matches.push(c); else mismatches.push({ ...c, reason: 'text does not mention claimed ward' });
  }

  console.log(`\n=== SUMMARY ===`);
  console.log(`Confirmed OLD-scheme (text matches claimed ward): ${matches.length}`);
  for (const m of matches) console.log(`  #${m.id} ${m.claimed}`);
  console.log(`Ambiguous / mismatch (DO NOT UPDATE without decision): ${mismatches.length}`);
  for (const m of mismatches) console.log(`  #${m.id} ${m.claimed} — ${m.reason}`);
}

main().catch(e => { console.error(e); process.exit(1); });
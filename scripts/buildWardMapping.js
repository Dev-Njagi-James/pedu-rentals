// Step 1: Build ward_id mapping by matching ward_name across both projects
// Query both wards_table instances, match by ward_name, output old/new mapping
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load .env manually (node doesn't auto-load .env without dotenv)
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
  const [oldRes, newRes] = await Promise.all([
    primary.from('wards_table').select('ward_id, ward_name').order('ward_id'),
    payments.from('wards_table').select('ward_id, ward_name').order('ward_id'),
  ]);

  if (oldRes.error) throw new Error('Primary wards_table error: ' + oldRes.error.message);
  if (newRes.error) throw new Error('Payments wards_table error: ' + newRes.error.message);

  const oldWards = oldRes.data;
  const newWards = newRes.data;

  console.log(`Primary wards_table: ${oldWards.length} wards`);
  console.log(`Payments wards_table: ${newWards.length} wards`);

  // Match by ward_name (case-insensitive, trimmed)
  const newByName = new Map();
  for (const w of newWards) {
    const key = w.ward_name.trim().toLowerCase();
    if (!newByName.has(key)) newByName.set(key, []);
    newByName.get(key).push(w);
  }

  const rows = [];
  let exact = 0;
  let ambiguous = 0;
  let unmatchedOld = 0;
  let unmatchedNew = 0;

  const matchedNewKeys = new Set();

  for (const ow of oldWards) {
    const key = ow.ward_name.trim().toLowerCase();
    const candidates = newByName.get(key) ?? [];
    if (candidates.length === 1) {
      const nw = candidates[0];
      rows.push({
        old_ward_id: ow.ward_id,
        old_ward_name: ow.ward_name,
        new_ward_id: nw.ward_id,
        new_ward_name: nw.ward_name,
        match_confidence: 'exact',
      });
      matchedNewKeys.add(key);
      exact++;
    } else if (candidates.length > 1) {
      // ambiguous — multiple new wards with same name
      for (const nw of candidates) {
        rows.push({
          old_ward_id: ow.ward_id,
          old_ward_name: ow.ward_name,
          new_ward_id: nw.ward_id,
          new_ward_name: nw.ward_name,
          match_confidence: 'ambiguous',
        });
        matchedNewKeys.add(key);
      }
      ambiguous++;
    } else {
      rows.push({
        old_ward_id: ow.ward_id,
        old_ward_name: ow.ward_name,
        new_ward_id: null,
        new_ward_name: null,
        match_confidence: 'unmatched_old',
      });
      unmatchedOld++;
    }
  }

  // New wards that had no old match
  for (const nw of newWards) {
    const key = nw.ward_name.trim().toLowerCase();
    if (!matchedNewKeys.has(key)) {
      rows.push({
        old_ward_id: null,
        old_ward_name: null,
        new_ward_id: nw.ward_id,
        new_ward_name: nw.ward_name,
        match_confidence: 'unmatched_new',
      });
      unmatchedNew++;
    }
  }

  console.log(`\nExact matches: ${exact}`);
  console.log(`Ambiguous (old ward maps to multiple new): ${ambiguous}`);
  console.log(`Old wards with no new match: ${unmatchedOld}`);
  console.log(`New wards with no old match: ${unmatchedNew}`);

  // Output table
  console.log('\n=== MAPPING TABLE ===');
  console.log('old_ward_id | old_ward_name | new_ward_id | new_ward_name | match_confidence');
  console.log('------------|---------------|-------------|---------------|----------------');
  for (const r of rows) {
    console.log(`${String(r.old_ward_id ?? '').padEnd(12)} | ${String(r.old_ward_name ?? '').padEnd(13)} | ${String(r.new_ward_id ?? '').padEnd(11)} | ${String(r.new_ward_name ?? '').padEnd(13)} | ${r.match_confidence}`);
  }

  // Also dump JSON to a file for review
  const json = JSON.stringify(rows, null, 2);
  fs.writeFileSync(path.resolve(__dirname, 'wardMapping.json'), json);
  console.log('\nJSON written to scripts/wardMapping.json');
}

main().catch(e => { console.error(e); process.exit(1); });
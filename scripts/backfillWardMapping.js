// Step 2: Backfill ward_id_mapping (payments project) with the 167 exact matches.
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const envPath = path.resolve(__dirname, '..', '.env');
const env = fs.readFileSync(envPath, 'utf8');
for (const line of env.split('\n')) {
  const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*)\s*$/);
  if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}
const payments = createClient(
  process.env.PAYMENTS_SUPABASE_URL,
  process.env.PAYMENTS_SUPABASE_SERVICE_ROLE_KEY
);
async function main() {
  const mapping = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'wardMapping.json'), 'utf8'));
  const exact = mapping.filter(r => r.match_confidence === 'exact');
  console.log(`Exact matches to insert: ${exact.length}`);
  const bad = exact.filter(r => r.old_ward_id == null || r.new_ward_id == null || !r.new_ward_name);
  if (bad.length > 0) { console.error('Sanity fail:', bad); process.exit(1); }
  const rows = exact.map(r => ({ old_ward_id: r.old_ward_id, new_ward_id: r.new_ward_id, ward_name: r.new_ward_name }));
  const CHUNK = 100;
  let inserted = 0;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK);
    const { data, error } = await payments.from('ward_id_mapping').upsert(chunk, { onConflict: 'old_ward_id,new_ward_id' }).select();
    if (error) { console.error('Chunk error:', error.message); process.exit(1); }
    inserted += data?.length ?? 0;
  }
  console.log(`Inserted/updated rows: ${inserted}`);
  const { count, error: ce } = await payments.from('ward_id_mapping').select('*', { count: 'exact', head: true });
  if (ce) throw new Error('Count error: ' + ce.message);
  console.log(`Total rows now in ward_id_mapping: ${count}`);
}
main().catch(e => { console.error(e); process.exit(1); });
import fetch from "node-fetch";

const SUPABASE_URL = 'https://trgvsjirzofgkheaqzne.supabase.co';
const SUPABASE_KEY = 'sb_publishable_ZjOD9CABLbLXCmiIWVIqxg_3JEHzQv8';

// First, get ALL entries from 6_Dispatch that have real unique timestamps
async function run() {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/6_Dispatch?select=dispatch_id,created_at&order=created_at.desc&limit=100`, {
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
    });
    const records = JSON.parse(await res.text());

    // Filter only the entries that have a unique, real timestamp (not the bulk import)
    const bulkTimestamp = '2026-02-20T17:46:34';
    const realEntries = records.filter(r => !r.created_at.startsWith(bulkTimestamp));
    
    console.log(`Found ${realEntries.length} real portal-created entries to patch:`);
    
    for (const entry of realEntries) {
        console.log(`Patching dispatch_id: ${entry.dispatch_id} with created_at: ${entry.created_at}`);
        const patchRes = await fetch(
            `${SUPABASE_URL}/rest/v1/dispatches?dispatch_id=eq.${encodeURIComponent(entry.dispatch_id)}`,
            {
                method: 'PATCH',
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': `Bearer ${SUPABASE_KEY}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=minimal'
                },
                body: JSON.stringify({ created_at: entry.created_at })
            }
        );
        console.log(`  -> Status: ${patchRes.status}`);
    }
    console.log('Done!');
}

run();

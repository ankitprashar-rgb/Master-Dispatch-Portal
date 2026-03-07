import fetch from "node-fetch";

const SUPABASE_URL = 'https://trgvsjirzofgkheaqzne.supabase.co';
const SUPABASE_KEY = 'sb_publishable_ZjOD9CABLbLXCmiIWVIqxg_3JEHzQv8';

async function run() {
    // Get all dispatch_ids currently in Supabase
    const res = await fetch(`${SUPABASE_URL}/rest/v1/dispatches?select=dispatch_id,client_name,date&order=created_at.asc`, {
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
    });
    const data = JSON.parse(await res.text());
    
    console.log(`CURRENT COUNT: ${data.length} dispatches in Supabase`);
    const ids = data.map(d => d.dispatch_id);
    console.log("IDS:", JSON.stringify(ids));
}

run();

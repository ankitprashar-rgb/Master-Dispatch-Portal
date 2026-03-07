import fetch from "node-fetch";

const SUPABASE_URL = 'https://trgvsjirzofgkheaqzne.supabase.co';
const SUPABASE_KEY = 'sb_publishable_ZjOD9CABLbLXCmiIWVIqxg_3JEHzQv8';

async function check() {
    try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/6_Dispatch?select=dispatch_id,created_at,date,client_name&order=created_at.desc&limit=15`, {
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`
            }
        });
        const text = await res.text();
        console.log("Raw Response:", text);
    } catch (e) {
        console.error(e);
    }
}

check();

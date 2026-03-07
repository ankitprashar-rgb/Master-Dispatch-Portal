import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://trgvsjirzofgkheaqzne.supabase.co';
const SUPABASE_KEY = 'sb_publishable_ZjOD9CABLbLXCmiIWVIqxg_3JEHzQv8';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function run() {
    const { data, error } = await supabase
        .from('6_Dispatch')
        .select('dispatch_id, created_at, date')
        .order('created_at', { ascending: false })
        .limit(20);

    if (error) {
        console.error("Error:", error);
    } else {
        console.log("Found:", JSON.stringify(data, null, 2));
    }
}
run();

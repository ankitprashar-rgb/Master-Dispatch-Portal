import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '/Users/ankit/Developer/Antigravity/quality-pulse/.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://doyxeqbnhdbsmizomxyj.supabase.co'; // Fallback if dotenv config fails
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '...'; // I will retrieve it from the file

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    const { data: jobs, error: err } = await supabase
        .from('production_jobs')
        .select('*')
        .order('id', { ascending: false })
        .limit(5);
        
    console.log("Recent Jobs:", jobs);

    const { data: updates, error: err2 } = await supabase
        .from('production_updates')
        .select('*')
        .order('id', { ascending: false })
        .limit(5);

    console.log("Recent Updates:", updates);
}
check();

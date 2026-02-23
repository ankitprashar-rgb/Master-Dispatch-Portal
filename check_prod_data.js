import fs from 'fs';
import path from 'path';

const envContent = fs.readFileSync('.env.local', 'utf8');

let dbUrl = '';
let anonKey = '';
envContent.split('\n').forEach(line => {
    if (line.startsWith('VITE_SUPABASE_URL=')) dbUrl = line.split('=')[1].trim();
    if (line.startsWith('VITE_SUPABASE_ANON_KEY=')) anonKey = line.split('=')[1].trim();
});

import { createClient } from '@supabase/supabase-js';
const supabase = createClient(dbUrl, anonKey, { auth: { persistSession: false } });

async function check() {
    console.log("Checking production_jobs...");
    const { data: jobs, error: err1 } = await supabase.from('production_jobs').select('*').limit(5);
    console.log("Jobs found:", jobs?.length || 0);
    if(jobs?.length > 0) console.log("Sample Job:", jobs[0]);

    console.log("\nChecking production_updates...");
    const { data: updates, error: err2 } = await supabase.from('production_updates').select('*').limit(5);
    console.log("Updates found:", updates?.length || 0);
    if(updates?.length > 0) console.log("Sample Update:", updates[0]);
}
check();

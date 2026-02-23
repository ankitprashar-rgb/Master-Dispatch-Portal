const { createClient } = require("@supabase/supabase-js");

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;
if(!url || !key) { console.log("Missing env vars"); process.exit(1); }

const supabase = createClient(url, key, { auth: { persistSession: false } });

async function check() {
    console.log("Checking production_jobs...");
    const { data: jobs, error: err1 } = await supabase.from("production_jobs").select("*").limit(50);
    console.log("Jobs found:", jobs?.length || 0);
    if(jobs?.length > 0) {
        console.log("Sample Job 0 client_name:", jobs[0].client_name, "project_name:", jobs[0].project_name);
    }

    console.log("\nChecking production_updates...");
    const { data: updates, error: err2 } = await supabase.from("production_updates").select("*").limit(50);
    console.log("Updates found:", updates?.length || 0);
}
check();

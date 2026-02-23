import fs from 'fs';
import path from 'path';

const envPath = path.resolve('../quality-pulse/.env');
const envContent = fs.readFileSync(envPath, 'utf8');

let url = '';
let key = '';

envContent.split('\n').forEach(line => {
    if (line.startsWith('VITE_SUPABASE_URL=')) url = line.split('=')[1].trim();
    if (line.startsWith('VITE_SUPABASE_ANON_KEY=')) key = line.split('=')[1].trim();
});

async function run() {
    console.log("Fetching jobs from production_jobs...");

    // Fetch production_jobs
    const jobRes = await fetch(`${url}/rest/v1/production_jobs?select=id,project_name,product_name,created_at`, {
        headers: { 'apikey': key, 'Authorization': `Bearer ${key}` }
    });
    const jobs = await jobRes.json();

    // Fetch rejection log for dates
    const logRes = await fetch(`${url}/rest/v1/rejection_log?select=date,project_name,product`, {
        headers: { 'apikey': key, 'Authorization': `Bearer ${key}` }
    });
    const logs = await logRes.json();

    console.log(`Found ${jobs.length} total jobs to check.`);
    let fixed = 0;

    for (const j of jobs) {
        const project = j.project_name;
        const product = j.product_name;

        // Find matching log
        const match = logs.find(l => l.project_name === project && l.product === product);
        if (match && match.date) {
            const originalDate = new Date(match.date).toISOString();

            // If the job's created_at doesn't match the original date, update it
            // Only update if it's from recent migration (Feb 2026 roughly)
            const currentCreated = new Date(j.created_at);
            if (currentCreated.getFullYear() === 2026 && currentCreated.getMonth() === 1) {
                const r = await fetch(`${url}/rest/v1/production_jobs?id=eq.${j.id}`, {
                    method: 'PATCH',
                    headers: {
                        'apikey': key,
                        'Authorization': `Bearer ${key}`,
                        'Content-Type': 'application/json',
                        'Prefer': 'return=minimal'
                    },
                    body: JSON.stringify({ created_at: originalDate, updated_at: originalDate })
                });

                if (r.ok) {
                    fixed++;
                } else {
                    console.error("Failed to update Job ID", j.id);
                }
            }
        }
    }
    console.log(`Successfully restored actual dates for ${fixed} jobs created_at!`);
}

run();

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
    console.log("Fetching System updates from production_updates...");

    // Fetch production_updates
    const upRes = await fetch(`${url}/rest/v1/production_updates?select=id,timestamp,job_id&operator_name=eq.System`, {
        headers: { 'apikey': key, 'Authorization': `Bearer ${key}` }
    });
    const updates = await upRes.json();

    if (!Array.isArray(updates)) {
        console.error("Error fetching updates", updates);
        return;
    }

    // Fetch jobs
    const jobRes = await fetch(`${url}/rest/v1/production_jobs?select=id,project_name,product_name`, {
        headers: { 'apikey': key, 'Authorization': `Bearer ${key}` }
    });
    const jobs = await jobRes.json();
    const jobMap = {};
    for (const j of jobs) jobMap[j.id] = j;

    // Fetch rejection log for dates
    const logRes = await fetch(`${url}/rest/v1/rejection_log?select=date,project_name,product`, {
        headers: { 'apikey': key, 'Authorization': `Bearer ${key}` }
    });
    const logs = await logRes.json();

    console.log(`Found ${updates.length} historical System updates to fix.`);
    let fixed = 0;

    for (const u of updates) {
        const job = jobMap[u.job_id];
        if (!job) continue;

        const project = job.project_name;
        const product = job.product_name;

        // Find matching log
        const match = logs.find(l => l.project_name === project && l.product === product);
        if (match && match.date) {
            const originalDate = new Date(match.date).toISOString();

            // Update
            const r = await fetch(`${url}/rest/v1/production_updates?id=eq.${u.id}`, {
                method: 'PATCH',
                headers: {
                    'apikey': key,
                    'Authorization': `Bearer ${key}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=minimal'
                },
                body: JSON.stringify({ timestamp: originalDate })
            });

            if (r.ok) {
                fixed++;
            } else {
                console.error("Failed to update ID", u.id);
            }
        }
    }
    console.log(`Successfully restored actual dates for ${fixed} historical entries!`);
}

run();

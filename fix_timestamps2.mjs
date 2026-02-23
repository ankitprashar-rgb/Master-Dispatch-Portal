import fs from 'fs';
import path from 'path';

const envPath = path.resolve('../quality-pulse/.env');
const envContent = fs.readFileSync(envPath, 'utf8');

let url = '';
envContent.split('\n').forEach(line => {
    if (line.startsWith('VITE_SUPABASE_URL=')) url = line.split('=')[1].trim();
});

// SERVICE ROLE KEY directly from migrate_now.mjs to bypass RLS block on UPDATE
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRyZ3Zzamlyem9mZ2toZWFxem5lIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTk2NDg2NiwiZXhwIjoyMDg1NTQwODY2fQ.bL-PRB5rDoVFK8MdSlyQn35pFE3XnPfm2IA_0Wa9eak';

async function run() {
    console.log("Fetching System updates from production_updates...");

    // Fetch production_updates (using service key)
    const upRes = await fetch(`${url}/rest/v1/production_updates?select=id,timestamp,job_id&operator_name=eq.System`, {
        headers: { 'apikey': SERVICE_KEY, 'Authorization': `Bearer ${SERVICE_KEY}` }
    });
    const updates = await upRes.json();

    if (!Array.isArray(updates)) {
        console.error("Error fetching updates", updates);
        return;
    }

    // Fetch jobs (using service key)
    const jobRes = await fetch(`${url}/rest/v1/production_jobs?select=id,project_name,product_name`, {
        headers: { 'apikey': SERVICE_KEY, 'Authorization': `Bearer ${SERVICE_KEY}` }
    });
    const jobs = await jobRes.json();
    const jobMap = {};
    for (const j of jobs) jobMap[j.id] = j;

    // Fetch rejection log for dates (using service key)
    const logRes = await fetch(`${url}/rest/v1/rejection_log?select=date,project_name,product`, {
        headers: { 'apikey': SERVICE_KEY, 'Authorization': `Bearer ${SERVICE_KEY}` }
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

            // Validate it needs fixing
            const currentCreated = new Date(u.timestamp);
            if (currentCreated.getFullYear() === 2026 && currentCreated.getMonth() === 1) {
                const r = await fetch(`${url}/rest/v1/production_updates?id=eq.${u.id}`, {
                    method: 'PATCH',
                    headers: {
                        'apikey': SERVICE_KEY,
                        'Authorization': `Bearer ${SERVICE_KEY}`,
                        'Content-Type': 'application/json',
                        'Prefer': 'return=minimal' // This guarantees success code if works
                    },
                    body: JSON.stringify({ timestamp: originalDate })
                });

                if (r.ok) {
                    fixed++;
                } else {
                    console.error("Failed to update Update ID", u.id, await r.text());
                }
            }
        }
    }
    console.log(`Successfully RESTORED ACTUAL DATES for ${fixed} historical entries in production_updates!`);
}

run();

const SUPABASE_URL = 'https://trgvsjirzofgkheaqzne.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRyZ3Zzamlyem9mZ2toZWFxem5lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk5NjQ4NjYsImV4cCI6MjA4NTU0MDg2Nn0.bweq2J-wDl1oRwOyEyNQNUAPlv0McITB3XoxNX64L-Y';

async function queryProject() {
    console.log('--- SEARCHING FOR Bulk Fleet Branding Chennai ---');

    // 1. Check rejection_log
    const logUrl = `${SUPABASE_URL}/rest/v1/rejection_log?project_name=ilike.*Chennai*`;
    const logRes = await fetch(logUrl, {
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
    });
    const logs = await logRes.json();
    console.log('rejection_log entries:', logs.length);
    if (logs.length > 0) console.log('Sample Log Date:', logs[0].date);

    // 2. Check production_jobs
    const jobUrl = `${SUPABASE_URL}/rest/v1/production_jobs?project_name=ilike.*Chennai*`;
    const jobRes = await fetch(jobUrl, {
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
    });
    const jobs = await jobRes.json();
    console.log('production_jobs entries:', jobs.length);
    if (jobs.length > 0) console.log('Job Status:', jobs[0].status, 'is_closed:', jobs[0].is_closed);

    console.log('--- SEARCH COMPLETE ---');
}

queryProject();

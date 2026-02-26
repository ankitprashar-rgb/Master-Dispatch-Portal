const SUPABASE_URL = 'https://trgvsjirzofgkheaqzne.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRyZ3Zzamlyem9mZ2toZWFxem5lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk5NjQ4NjYsImV4cCI6MjA4NTU0MDg2Nn0.bweq2J-wDl1oRwOyEyNQNUAPlv0McITB3XoxNX64L-Y';

async function checkRapido() {
    console.log('--- CHECKING RAPIDO ENTRIES FOR FEB 25 ---');
    const today = "2026-02-25";

    // 1. Check rejection_log for Rapido today
    const url = `${SUPABASE_URL}/rest/v1/rejection_log?client_name=eq.Rapido&date=eq.${today}`;
    const res = await fetch(url, {
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
    });
    const logs = await res.json();
    console.log('Found logs:', logs.length);
    if (logs.length > 0) {
        logs.forEach(l => console.log(` Project: ${l.project_name}, Product: ${l.product}`));
    } else {
        console.log('No Rapido logs found for today.');
    }

    console.log('--- CHECK COMPLETE ---');
}

checkRapido();

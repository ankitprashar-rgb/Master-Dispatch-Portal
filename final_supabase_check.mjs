const BOT_TOKEN = '8639080150:AAFeTDcawhgG7vd5kpWAKB1zuXOQMrwD_3Y';
const CHAT_ID = '-5206959976';

// This is just a thought exercise since I can't easily fetch sheet data from MJS without g-auth
// But I can use the existing fetchSheetData logic if I hardcode the token (if I had one) or just trust the previous logs.

// Actually, I'll just check if there are ANY entries in Supabase again just in case.
const SUPABASE_URL = 'https://trgvsjirzofgkheaqzne.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRyZ3Zzamlyem9mZ2toZWFxem5lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk5NjQ4NjYsImV4cCI6MjA4NTU0MDg2Nn0.bweq2J-wDl1oRwOyEyNQNUAPlv0McITB3XoxNX64L-Y';

async function checkSupabase() {
    const today = "2026-02-25";
    const url = `${SUPABASE_URL}/rest/v1/rejection_log?date=eq.${today}`;
    const res = await fetch(url, {
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
    });
    const logs = await res.json();
    console.log('--- SUPABASE CHECK FEB 25 ---');
    console.log('Logs found:', logs.length);
    if (logs.length > 0) logs.forEach(l => console.log(`- ${l.project_name}: ${l.qty_rejected} rej`));
}

checkSupabase();

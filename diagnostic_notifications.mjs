const SUPABASE_URL = 'https://trgvsjirzofgkheaqzne.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRyZ3Zzamlyem9mZ2toZWFxem5lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk5NjQ4NjYsImV4cCI6MjA4NTU0MDg2Nn0.bweq2J-wDl1oRwOyEyNQNUAPlv0McITB3XoxNX64L-Y';
const BOT_TOKEN = '8639080150:AAFeTDcawhgG7vd5kpWAKB1zuXOQMrwD_3Y';
let CHAT_ID = '-5206959976';

if (CHAT_ID.startsWith('-') && !CHAT_ID.startsWith('-100')) {
    CHAT_ID = `-100${CHAT_ID.substring(1)}`;
}

async function sendTelegram(text) {
    const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: CHAT_ID, text, parse_mode: 'HTML' })
    });
    const result = await response.json();
    console.log(`Telegram Response (ID: ${CHAT_ID}):`, result);
    return result;
}

async function fetchSupabase(table, query = '') {
    const url = `${SUPABASE_URL}/rest/v1/${table}?${query}`;
    const response = await fetch(url, {
        headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`
        }
    });
    return response.json();
}

async function checkToday() {
    console.log('--- DIAGNOSING TODAY (FEB 25) ---');
    const now = new Date();
    console.log('Environment current time:', now.toString());

    // Explicitly check for Feb 25
    const feb25 = "2026-02-25";

    console.log('Checking Rejection Logs for:', feb25);
    const logs = await fetchSupabase('rejection_log', `date=eq.${feb25}`);
    console.log(`Found ${Array.isArray(logs) ? logs.length : 0} rejections.`);

    console.log('Checking Print Stage Updates for:', feb25);
    // Use timestamp gte Feb 25 00:00 UTC
    const updates = await fetchSupabase('production_updates', `stage=eq.print&timestamp=gte.2026-02-25T00:00:00Z&select=*,production_jobs(*)`);
    console.log(`Found ${Array.isArray(updates) ? updates.length : 0} print updates.`);

    if (Array.isArray(logs) && logs.length > 0) {
        console.log('Sending first rejection as test...');
        await sendTelegram(`<b>DIAGNOSTIC TEST</b>\nFound today's rejection: ${logs[0].project_name}`);
    } else {
        console.log('No rejections found for the 25th in Supabase.');
    }

    if (Array.isArray(updates) && updates.length > 0) {
        console.log('Sending first update as test...');
        await sendTelegram(`<b>DIAGNOSTIC TEST</b>\nFound today's print: ${updates[0].production_jobs?.project_name}`);
    } else {
        console.log('No print updates found for the 25th in Supabase.');
    }

    console.log('--- DIAGNOSTIC COMPLETE ---');
}

checkToday();

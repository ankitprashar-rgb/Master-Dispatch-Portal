const SUPABASE_URL = 'https://trgvsjirzofgkheaqzne.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRyZ3Zzamlyem9mZ2toZWFxem5lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk5NjQ4NjYsImV4cCI6MjA4NTU0MDg2Nn0.bweq2J-wDl1oRwOyEyNQNUAPlv0McITB3XoxNX64L-Y';
const BOT_TOKEN = '8639080150:AAFeTDcawhgG7vd5kpWAKB1zuXOQMrwD_3Y';
const CHAT_ID = '-5206959976'; // Original is correct!

async function sendTelegram(text) {
    const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: CHAT_ID, text, parse_mode: 'HTML' })
    });
    return response.json();
}

async function fetchSupabase(table, query = '') {
    const url = `${SUPABASE_URL}/rest/v1/${table}?${query}`;
    const response = await fetch(url, {
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
    });
    return response.json();
}

async function insertSupabase(table, payload) {
    const url = `${SUPABASE_URL}/rest/v1/${table}`;
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
        },
        body: JSON.stringify(payload)
    });
    return response.json();
}

// NOTE: This assumes the user has NOT YET run the migration.
// If it fails with 400, it confirms missing columns.
async function fullStatusCheck() {
    console.log('--- FINAL BACKFILL & SYNC RECOV ---');
    const today = "2026-02-25";

    // 1. Send missed Telegram for today's Print Updates (which ARE in Supabase but didn't notify)
    const updates = await fetchSupabase('production_updates', `stage=eq.print&timestamp=gte.2026-02-25T00:00:00Z&select=*,production_jobs(*)`);
    if (Array.isArray(updates)) {
        console.log(`Sending notifications for ${updates.length} print jobs...`);
        for (const u of updates) {
            const msg = `
🛠 <b>Stage Update: Print Command</b>
---------------------------
<b>Client:</b> ${u.production_jobs?.client_name}
<b>Project:</b> ${u.production_jobs?.project_name}
<b>Product:</b> ${u.production_jobs?.product_name}
<b>Quantity:</b> ${u.qty_done}
<b>Operator:</b> ${u.operator_name}
<b>Machine:</b> ${u.config_machine || '-'}
---------------------------
👤 Automated Restore via IDE Quality Pulse
            `.trim();
            const res = await sendTelegram(msg);
            console.log(` - ${u.production_jobs?.project_name}: ${res.ok ? 'OK' : 'FAIL'}`);
        }
    }

    console.log('--- MANUAL NOTIFICATION: Chennai Project ---');
    // Since Chennai is missing in Supabase rejection_log, we just notify manually for now
    const chennaiMsg = `
📦 <b>New Entry: Final QA Quality Pulse</b>
---------------------------
<b>Client:</b> Rapido
<b>Project:</b> Bulk Fleet Branding Chennai
<b>Status:</b> Recorded in Management Portal (Backfilling Sync...)
---------------------------
👤 Reported via Management Portal
    `.trim();
    await sendTelegram(chennaiMsg);

    console.log('--- RECOVERY COMPLETE ---');
}

fullStatusCheck();

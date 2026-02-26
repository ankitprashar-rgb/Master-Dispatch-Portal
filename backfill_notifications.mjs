const SUPABASE_URL = 'https://trgvsjirzofgkheaqzne.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRyZ3Zzamlyem9mZ2toZWFxem5lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk5NjQ4NjYsImV4cCI6MjA4NTU0MDg2Nn0.bweq2J-wDl1oRwOyEyNQNUAPlv0McITB3XoxNX64L-Y';
const BOT_TOKEN = '8639080150:AAFeTDcawhgG7vd5kpWAKB1zuXOQMrwD_3Y';
let CHAT_ID = '-5206959976';

// Fix CHAT_ID prefix
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
    return response.json();
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

async function backfill() {
    console.log('--- STARTING ZERO-DEP BACKFILL ---');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];

    // 1. Fetch Today's Rejections
    console.log('Fetching Rejection Logs for:', todayStr);
    const logs = await fetchSupabase('rejection_log', `date=gte.${todayStr}`);

    if (!Array.isArray(logs)) {
        console.error('Failed to fetch logs:', logs);
    } else {
        console.log(`Found ${logs.length} rejection entries.`);
        for (const entry of logs) {
            console.log(`Sending notification: ${entry.project_name}`);
            const msg = `
📦 <b>Missed Entry: Quality QA</b>
---------------------------
<b>Client:</b> ${entry.client_name}
<b>Project:</b> ${entry.project_name}
<b>Product:</b> ${entry.product}
<b>Delivered:</b> ${entry.qty_delivered} (Batch: ${entry.batch_qty})
<b>Rejected:</b> ${entry.qty_rejected} (${entry.rejection_percent}%)
---------------------------
👤 Backfilled by IDE Quality Pulse
            `.trim();
            await sendTelegram(msg);
        }
    }

    // 2. Fetch Today's Stage Updates (Print Commands)
    // We need to join manually or use Supabase select with link
    console.log('Fetching Stage Updates...');
    const updates = await fetchSupabase('production_updates', `stage=eq.print&timestamp=gte.${today.toISOString()}&select=*,production_jobs(*)`);

    if (!Array.isArray(updates)) {
        console.error('Failed to fetch updates:', updates);
    } else {
        console.log(`Found ${updates.length} print commands.`);
        for (const u of updates) {
            console.log(`Sending notification: ${u.production_jobs?.project_name}`);
            const msg = `
🛠 <b>Missed Update: Print Command</b>
---------------------------
<b>Client:</b> ${u.production_jobs?.client_name}
<b>Project:</b> ${u.production_jobs?.project_name}
<b>Product:</b> ${u.production_jobs?.product_name}
<b>Quantity:</b> ${u.qty_done}
<b>Operator:</b> ${u.operator_name}
<b>Machine:</b> ${u.config_machine || '-'}
---------------------------
👤 Backfilled via IDE Production Portal
            `.trim();
            await sendTelegram(msg);
        }
    }

    console.log('--- BACKFILL COMPLETE ---');
}

backfill();

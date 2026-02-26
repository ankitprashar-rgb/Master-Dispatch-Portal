import https from 'https';

const SUPABASE_URL = 'trgvsjirzofgkheaqzne.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRyZ3Zzamlyem9mZ2toZWFxem5lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk5NjQ4NjYsImV4cCI6MjA4NTU0MDg2Nn0.bweq2J-wDl1oRwOyEyNQNUAPlv0McITB3XoxNX64L-Y';
const BOT_TOKEN = '8639080150:AAFeTDcawhgG7vd5kpWAKB1zuXOQMrwD_3Y';
const CHAT_ID = '-5206959976';

function fetchSupabaseData() {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: SUPABASE_URL,
            port: 443,
            path: '/rest/v1/rejection_log?select=*&order=created_at.desc&limit=10',
            method: 'GET',
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`
            }
        };

        const req = https.request(options, res => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(JSON.parse(data)));
        });
        req.on('error', reject);
        req.end();
    });
}

function sendTelegramMessage(text) {
    return new Promise((resolve, reject) => {
        const payload = JSON.stringify({ chat_id: CHAT_ID, text, parse_mode: 'HTML' });
        const options = {
            hostname: 'api.telegram.org',
            port: 443,
            path: `/bot${BOT_TOKEN}/sendMessage`,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(payload)
            }
        };

        const req = https.request(options, res => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(JSON.parse(data)));
        });
        req.on('error', reject);
        req.write(payload);
        req.end();
    });
}

async function main() {
    try {
        console.log("Fetching last 10 entries from Supabase...");
        const entries = await fetchSupabaseData();
        if (!Array.isArray(entries)) {
            console.error("Not an array:", entries);
            return;
        }
        
        const reversed = entries.reverse();
        for (const entry of reversed) {
            const isRejection = entry.reason && (entry.reason.includes('Rejection') || entry.qty_rejected > 0);
            let message = ``;
            
            if (isRejection) {
                message = `
⚠️ <b>Rejection Logged: ${entry.reason || 'General'}</b>
---------------------------
<b>Client:</b> ${entry.client_name}
<b>Project:</b> ${entry.project_name}
<b>Product:</b> ${entry.product}
<b>Rejected Qty:</b> ${entry.qty_rejected}
---------------------------
👤 Rejection logged via Quality Pulse
                `.trim();
            } else {
                message = `
📦 <b>New Production Entry</b>
---------------------------
<b>Client:</b> ${entry.client_name}
<b>Project:</b> ${entry.project_name}
<b>Product:</b> ${entry.product}
<b>Delivered:</b> ${entry.qty_delivered} (Batch: ${entry.batch_qty})
<b>Rejected:</b> ${entry.qty_rejected} (${entry.rejection_percent}%)
---------------------------
👤 Recorded at IDE Quality Pulse
                `.trim();
            }
            const tgRes = await sendTelegramMessage(message);
            console.log(tgRes.ok ? "Sent" : "Failed", tgRes);
            await new Promise(r => setTimeout(r, 500));
        }
        console.log("Sent last 10 entries to Telegram.");
    } catch (e) {
        console.error("Failed:", e);
    }
}
main();

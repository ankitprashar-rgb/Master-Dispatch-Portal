import https from 'https';

const SUPABASE_URL = 'trgvsjirzofgkheaqzne.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRyZ3Zzamlyem9mZ2toZWFxem5lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk5NjQ4NjYsImV4cCI6MjA4NTU0MDg2Nn0.bweq2J-wDl1oRwOyEyNQNUAPlv0McITB3XoxNX64L-Y';
const BOT_TOKEN = '8639080150:AAFeTDcawhgG7vd5kpWAKB1zuXOQMrwD_3Y';
const CHAT_ID = '-5206959976';

function fetchSupabase(path) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: SUPABASE_URL,
            port: 443,
            path: path,
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

function generateTemplate(dispatchRecord) {
    let message = `
<b>Project Workflow Update:</b>
[New Product Dispatch]
<b>Client:</b> ${dispatchRecord.client_name || 'Unknown'}
---------------------------
<b>Project:</b> ${dispatchRecord.project_name || 'Unknown'}
<b>Dispatch ID:</b> ${dispatchRecord.dispatch_id}
<b>Destination:</b> ${dispatchRecord.ship_to_address || 'Not Provided'}
`;

    if (dispatchRecord.dispatch_data && dispatchRecord.dispatch_data.items) {
        const items = dispatchRecord.dispatch_data.items;
        if (items.length > 0) {
            message += `\n<b>Items Dispatched:</b>`;
            items.forEach((item, idx) => {
                message += `\n${idx + 1}. ${item.desc} (Qty: ${item.qty})`;
            });
        }
    }

    if (dispatchRecord.dispatch_data && dispatchRecord.dispatch_data.totals) {
        message += `\n\n<b>Total Qty:</b> ${dispatchRecord.dispatch_data.totals.qty}`;
    }

    message += `\n---------------------------`;
    message += `\n👤 Recorded at IDE Master Dispatch`;

    return message;
}

async function main() {
    try {
        const daysAgo = new Date();
        daysAgo.setDate(daysAgo.getDate() - 2);
        daysAgo.setHours(0,0,0,0);
        const dateStr = daysAgo.toISOString();
        
        console.log("Fetching dispatches from the last 2 days...");
        const dispatches = await fetchSupabase(`/rest/v1/dispatches?created_at=gte.${dateStr}&select=*&order=created_at.asc`);
        
        if (!Array.isArray(dispatches)) {
            console.error("Failed to parse array", dispatches);
            return;
        }

        console.log(`Found ${dispatches.length} dispatch entries! Sending to Telegram...`);
        for (const dispatch of dispatches) {
            const message = generateTemplate(dispatch);
            const tgRes = await sendTelegramMessage(message);
            console.log(tgRes.ok ? "Sent" : "Failed", dispatch.dispatch_id);
            await new Promise(r => setTimeout(r, 600)); 
        }
        console.log("Finished pushing last 2 days of logs.");
    } catch(err) {
        console.error(err);
    }
}
main();

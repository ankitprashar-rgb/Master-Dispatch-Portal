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

const STAGE_LABELS = {
    print: 'Print Command',
    lamination: 'Lamination',
    cutting: 'Plotter Cut',
    preparation: 'Preparation',
    packaging: 'Packaging'
};

function formatMsg(row) {
    const job = row.production_jobs || {};
    const stageLabel = STAGE_LABELS[row.stage] || row.stage;

    let message = `
<b>Project Workflow Update:</b>
[Production Portal - ${stageLabel}]
<b>Client:</b> ${job.client_name || 'Unknown'}
---------------------------
<b>Project:</b> ${job.project_name || 'Unknown'}
<b>Product:</b> ${job.product_name || 'Unknown'}
<b>Completed Qty:</b> ${row.qty_done || 0}`;

    message += `\n<b>Operator:</b> ${row.operator_name || 'N/A'}`;
    if (row.config_machine) {
        message += `\n<b>Machine:</b> ${row.config_machine}`;
    }

    message += `\n---------------------------`;
    return message;
}

async function main() {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayStr = today.toISOString();

        console.log("Fetching today's production entries...");
        const logs = await fetchSupabase(`/rest/v1/production_updates?timestamp=gte.${todayStr}&select=*,production_jobs(client_name,project_name,product_name)&order=timestamp.asc`);

        if (!Array.isArray(logs)) {
            console.error("Not an array:", logs);
            return;
        }

        console.log(`Found ${logs.length} entries. Processing...`);
        for (const entry of logs) {
            const message = formatMsg(entry);
            const tgRes = await sendTelegramMessage(message);
            console.log(tgRes.ok ? "Sent" : "Failed", tgRes);
            await new Promise(r => setTimeout(r, 600)); // sleep to respect rate limits
        }
        console.log("Finished sending today's entries.");
    } catch (err) {
        console.error(err);
    }
}
main();

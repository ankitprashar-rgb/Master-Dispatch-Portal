import https from 'https';

const SUPABASE_URL = 'trgvsjirzofgkheaqzne.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRyZ3Zzamlyem9mZ2toZWFxem5lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk5NjQ4NjYsImV4cCI6MjA4NTU0MDg2Nn0.bweq2J-wDl1oRwOyEyNQNUAPlv0McITB3XoxNX64L-Y';

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
        const today = new Date();
        today.setHours(0,0,0,0);
        const todayStr = today.toISOString();
        
        const dispatches = await fetchSupabase(`/rest/v1/dispatches?created_at=gte.${todayStr}&select=*&order=created_at.desc&limit=1`);
        
        if (dispatches && dispatches.length > 0) {
            console.log("=== TEMPLATE EXAMPLE ===");
            console.log(generateTemplate(dispatches[0]));
            console.log("========================");
        } else {
            console.log("No dispatches found for today. Here is a mock example:");
        }
    } catch(err) {
        console.error(err);
    }
}
main();

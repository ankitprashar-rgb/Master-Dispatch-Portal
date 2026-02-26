const BOT_TOKEN = import.meta.env.VITE_TELEGRAM_BOT_TOKEN;
const CHAT_ID = import.meta.env.VITE_TELEGRAM_CHAT_ID;

export async function sendTelegramMessage(text) {
    if (!BOT_TOKEN || !CHAT_ID) {
        console.error('Telegram API tokens are not configured. Skipping message.');
        return false;
    }

    const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: CHAT_ID,
                text,
                parse_mode: 'HTML'
            })
        });

        const data = await response.json();
        if (!data.ok) {
            console.error('Telegram API Error:', data.description);
        }
        return data.ok;
    } catch (error) {
        console.error('Telegram Network Error:', error);
        return false;
    }
}

export function notifyDispatchEntry(dispatchRecord) {
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

    return sendTelegramMessage(message);
}

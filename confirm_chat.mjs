const BOT_TOKEN = '8639080150:AAFeTDcawhgG7vd5kpWAKB1zuXOQMrwD_3Y';
const CHAT_ID = '-5206959976';

async function confirmChat() {
    const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: CHAT_ID, text: '<b>System Check</b>: Verifying group connectivity.', parse_mode: 'HTML' })
    });
    const result = await response.json();
    if (result.ok) {
        console.log(`Success! Message sent to: "${result.result.chat.title}" (ID: ${result.result.chat.id})`);
    } else {
        console.error('Failed to send message:', result);
    }
}

confirmChat();

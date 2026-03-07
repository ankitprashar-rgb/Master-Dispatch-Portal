const BOT_TOKEN = '8639080150:AAFeTDcawhgG7vd5kpWAKB1zuXOQMrwD_3Y';
const VARIATIONS = [
    '-5206959976',      // Original in .env
    '-1005206959976',   // Prepend -100 (Failed)
    '-2361732675',      // User mentioned a different ID maybe? 
    '-1002361732675'    // Supergroup version of that ID
];

async function testVariations() {
    console.log('--- TESTING TELEGRAM CHAT ID VARIATIONS ---');
    for (const cid of VARIATIONS) {
        const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chat_id: cid, text: `<b>STABILITY TEST</b>\nTesting Chat ID: ${cid}`, parse_mode: 'HTML' })
            });
            const result = await response.json();
            console.log(`Variation ${cid}:`, result.ok ? '✅ SUCCESS' : `❌ FAILED (${result.description})`);
        } catch (e) {
            console.log(`Variation ${cid}: ❌ ERROR (${e.message})`);
        }
    }
}

testVariations();

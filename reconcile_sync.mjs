import fetch from "node-fetch";

const SUPABASE_URL = 'https://trgvsjirzofgkheaqzne.supabase.co';
const SUPABASE_KEY = 'sb_publishable_ZjOD9CABLbLXCmiIWVIqxg_3JEHzQv8';
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxsQ8fQH3V2zGHc9R2E9wN3iP8g4fS4Y1Q5kH3eW2gqA/exec';

// 1. Get before state
const beforeRes = await fetch(`${SUPABASE_URL}/rest/v1/dispatches?select=dispatch_id`, {
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
});
const before = JSON.parse(await beforeRes.text());
const beforeIds = new Set(before.map(d => d.dispatch_id));
console.log(`BEFORE: ${beforeIds.size} dispatches in Supabase`);

// 2. Trigger sync via Apps Script doPost
console.log("Triggering sync...");
const syncRes = await fetch(APPS_SCRIPT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'syncSheetToSupabase' })
});
const syncText = await syncRes.text();
console.log("Sync response:", syncText);

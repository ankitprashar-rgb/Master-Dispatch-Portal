import fs from 'fs';

const envContent = fs.readFileSync('.env.local', 'utf8');

let dbUrl = '';
let anonKey = '';
envContent.split('\n').forEach(line => {
    if (line.startsWith('VITE_SUPABASE_URL=')) dbUrl = line.split('=')[1].trim();
    if (line.startsWith('VITE_SUPABASE_ANON_KEY=')) anonKey = line.split('=')[1].trim();
});

async function check() {
    const url = `${dbUrl}/rest/v1/production_jobs?select=*&client_name=ilike.*Client%20Test*`;
    
    try {
        const response = await fetch(url, {
            headers: {
                'apikey': anonKey,
                'Authorization': `Bearer ${anonKey}`
            }
        });
        
        const data = await response.json();
        console.log('Found jobs for Client Test:', data.length);
        if (data.length > 0) {
            console.log('--- JOBS ---');
            data.forEach(j => {
                console.log(`Job ID: ${j.id} | Project: ${j.project_name} | Product: ${j.product_name} | Master Qty: ${j.master_qty}`);
            });
            
            // Fetch updates for the first job
            const updatesUrl = `${dbUrl}/rest/v1/production_updates?select=*&job_id=eq.${data[0].id}`;
            const upRes = await fetch(updatesUrl, {
                headers: { 'apikey': anonKey, 'Authorization': `Bearer ${anonKey}` }
            });
            const updates = await upRes.json();
            console.log('\n--- UPDATES FOR JOB ' + data[0].id + ' ---');
            updates.forEach(u => {
                console.log(`- Stage: ${u.stage}, Qty: ${u.qty_done}`);
            });
        } else {
           const allUrl = `${dbUrl}/rest/v1/production_jobs?select=*&limit=5`;
           const allRes = await fetch(allUrl, { headers: { 'apikey': anonKey, 'Authorization': `Bearer ${anonKey}` } });
           const allData = await allRes.json();
           console.log('Recent jobs instead:');
           allData.forEach(j => console.log(`${j.client_name} - ${j.project_name}`));
        }
    } catch (e) {
        console.error('Fetch failed', e);
    }
}
check();

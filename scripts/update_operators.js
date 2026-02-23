const supabaseUrl = 'https://trgvsjirzofgkheaqzne.supabase.co';
const supabaseKey = 'sb_publishable_ZjOD9CABLbLXCmiIWVIqxg_3JEHzQv8';

const operators = [
    'Himanshu Atrey',
    'Danish',
    'Narinder',
    'MD Firoz',
    'Akhtar Ali',
    'Jawed',
    'Warish',
    'Rakesh',
    'Suraj',
    'Rohit',
    'Shivam',
    'Jaskaran Singh',
    'Tanmay Patinge',
    'Varij Sharma'
];

async function run() {
    console.log('Fetching existing operators...');
    const getRes = await fetch(`${supabaseUrl}/rest/v1/masters?select=id,category,name&category=in.(operator,operators,installer,installers)`, {
        headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`
        }
    });

    if (!getRes.ok) {
        console.error('Error fetching:', await getRes.text());
        return;
    }

    const existing = await getRes.json();
    console.log(`Found ${existing.length} existing operators. Deleting them...`);

    if (existing.length > 0) {
        const ids = existing.map(e => e.id).join(',');
        const delRes = await fetch(`${supabaseUrl}/rest/v1/masters?id=in.(${ids})`, {
            method: 'DELETE',
            headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`
            }
        });

        if (!delRes.ok) {
            console.error('Error deleting:', await delRes.text());
            return;
        }
        console.log('Deleted existing operators.');
    }

    console.log('Inserting new operators...');
    const payload = operators.map(op => ({ category: 'operator', name: op }));
    const insRes = await fetch(`${supabaseUrl}/rest/v1/masters`, {
        method: 'POST',
        headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
        },
        body: JSON.stringify(payload)
    });

    if (!insRes.ok) {
        console.error('Error inserting:', await insRes.text());
    } else {
        console.log('Successfully inserted new operators into Supabase!');
    }
}

run();

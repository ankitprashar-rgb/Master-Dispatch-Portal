import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function updateAmazonCourier() {
    console.log('Starting Amazon Courier Partner update...');

    // Update records where ship_to_poc is 'Amazon Seller Service'
    const { data, error, count } = await supabase
        .from('6_Dispatch')
        .update({ courier_company: 'Amazon Courier Service' })
        .or('ship_to_poc.eq."Amazon Seller Service",dispatch_data->>shipToPoc.eq."Amazon Seller Service"')
        .select('id, dispatch_id');

    if (error) {
        console.error('Error updating records:', error);
        process.exit(1);
    }

    console.log(`Successfully updated ${data.length} records.`);
    data.forEach(d => console.log(`- Updated: ${d.dispatch_id}`));

    process.exit(0);
}

updateAmazonCourier();

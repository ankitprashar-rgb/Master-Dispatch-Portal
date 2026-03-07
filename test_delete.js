import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: '../quality-pulse/.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testDelete() {
    console.log('Testing delete on production_updates...');
    // Try deleting a fake row to see if RLS throws an error or just returns count 0
    const { data, error, count } = await supabase
        .from('production_updates')
        .delete({ count: 'exact' })
        .eq('id', 9999999);
    
    console.log('Delete result:', { error, count });
}
testDelete();

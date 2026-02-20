import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://trgvsjirzofgkheaqzne.supabase.co';
const SUPABASE_KEY = 'sb_publishable_ZjOD9CABLbLXCmiIWVIqxg_3JEHzQv8';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function cleanup() {
    console.log('Fetching dispatches...');
    const { data, error } = await supabase
        .from('dispatches')
        .select('id, dispatch_id')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching data:', error);
        return;
    }

    const seen = new Set();
    const toDelete = [];

    data.forEach(d => {
        if (seen.has(d.dispatch_id)) {
            toDelete.push(d.id);
        } else {
            seen.add(d.dispatch_id);
        }
    });

    if (toDelete.length === 0) {
        console.log('No duplicates found.');
        return;
    }

    console.log(`Deleting ${toDelete.length} duplicates...`);
    const { error: delError } = await supabase
        .from('dispatches')
        .delete()
        .in('id', toDelete);

    if (delError) {
        console.error('Error deleting duplicates:', delError);
    } else {
        console.log('Cleanup successful.');
    }
}

cleanup();

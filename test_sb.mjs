import { createClient } from 'https://esm.sh/@supabase/supabase-js';

const supabaseUrl = 'https://trgvsjirzofgkheaqzne.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRyZ3Zzamlyem9mZ2toZWFxem5lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk5NjQ4NjYsImV4cCI6MjA4NTU0MDg2Nn0.bweq2J-wDl1oRwOyEyNQNUAPlv0McITB3XoxNX64L-Y';
const supabase = createClient(supabaseUrl, supabaseKey);

async function testSB() {
    console.log('Testing connection...');
    const { data, error } = await supabase.from('production_jobs').select('id').limit(1);
    console.log('Result:', { data, error });
}
testSB();

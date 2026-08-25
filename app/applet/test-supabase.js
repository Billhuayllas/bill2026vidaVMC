const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://iosdslhikguqyhspbpbn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlvc2RzbGhpa2d1cXloc3BicGJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwOTMzNjMsImV4cCI6MjA2ODY2OTM2M30.HbgX9g1e4kYZf1jn0-8RR8BctYZctVopigZgZVXBaJY';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function main() {
    try {
        console.log("Fetching programs for congregation_id = 1...");
        const { data: c1, error: e1 } = await supabase.from('programas').select('*').eq('congregation_id', 1).limit(3);
        console.log("C1 length:", c1 ? c1.length : 0, "Error 1:", e1);
        if (c1 && c1.length > 0) {
            console.log("C1 keys:", Object.keys(c1[0]));
        }

        console.log("Fetching programs for all other congregations...");
        const { data: c2, error: e2 } = await supabase.from('programas').select('*').neq('congregation_id', 1).limit(5);
        console.log("C2 length:", c2 ? c2.length : 0, "Error 2:", e2);
        if (c2 && c2.length > 0) {
            console.log("Sample C2 data:", JSON.stringify(c2[0], null, 2));
        }
    } catch (e) {
        console.error("Error running script:", e);
    }
}

main();

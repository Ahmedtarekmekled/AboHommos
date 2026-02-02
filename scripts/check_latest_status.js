
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1. Load Env
const envPath = path.resolve(__dirname, '../.env');
const envConfig = {};
try {
  if (fs.existsSync(envPath)) {
    const envFile = fs.readFileSync(envPath, 'utf8');
    envFile.split('\n').forEach(line => {
      const parts = line.split('=');
      if (parts.length >= 2) {
        envConfig[parts[0].trim()] = parts.slice(1).join('=').trim();
      }
    });
  }
} catch (e) {}

// 2. Connect
const supabaseUrl = envConfig.VITE_SUPABASE_URL;
const supabaseKey = envConfig.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkLatest() {
    console.log("Checking latest Parent Order...");
    
    // We try to fetch the latest parent order. 
    // Note: If RLS hides it, this might return empty for Anon, but let's try.
    // If this returns empty, we know RLS is hiding it even from a simple query.
    const { data: parents, error } = await supabase
        .from('parent_orders')
        .select(`
            id, 
            status, 
            created_at, 
            delivery_user_id
        `)
        .order('created_at', { ascending: false })
        .limit(1);

    if (error) {
        console.error("Error query:", error);
        return;
    }
    
    if (!parents || parents.length === 0) {
        console.log("❌ No parent orders visible to Anon client.");
        return;
    }

    const p = parents[0];
    console.log(`\nLATEST PARENT ORDER: ${p.id}`);
    console.log(`Status: [ ${p.status} ]`); // <--- Critical Check
    console.log(`Created: ${p.created_at}`);
    
    // Check Suborders (if possible)
    const { data: subs } = await supabase.from('orders').select('status, shop_id').eq('parent_order_id', p.id);
    if (subs) {
        subs.forEach((s, i) => console.log(`  SubOrder ${i+1}: [ ${s.status} ]`));
    }

    if (p.status === 'PLACED' && subs.some(s => s.status === 'READY_FOR_PICKUP')) {
        console.log("\n🚨 DIAGNOSIS: TRIGGER FAILURE. Parent is stuck at PLACED.");
    } else if (p.status === 'READY_FOR_PICKUP') {
        console.log("\n✅ DIAGNOSIS: TRIGGER OK. Parent is READY.");
        console.log("   If you can't see it in dashboard, it's a FILTER or RLS issue.");
    }
}

checkLatest();

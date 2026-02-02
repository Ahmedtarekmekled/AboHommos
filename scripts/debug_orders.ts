

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Load env vars manually
const envPath = path.resolve(__dirname, '../.env');
const envConfig: any = {};
if (fs.existsSync(envPath)) {
    const envFile = fs.readFileSync(envPath, 'utf8');
    envFile.split('\n').forEach(line => {
        const [key, value] = line.split('=');
        if (key && value) {
            envConfig[key.trim()] = value.trim();
        }
    });
}

const supabaseUrl = envConfig.VITE_SUPABASE_URL;
const supabaseKey = envConfig.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugOrders() {
  console.log("--- DEBUGGING ORDERS ---");

  // 1. Check Parent Orders
  console.log("\n1. PARENT ORDERS (limit 5):");
  const { data: parents, error: pError } = await supabase
    .from('parent_orders')
    .select('id, order_number, status, delivery_user_id')
    .order('created_at', { ascending: false })
    .limit(5);

  if (pError) console.error("Error fetching parent_orders:", pError.message);
  else console.table(parents);

  // 2. Check Sub Orders (Orders table)
  console.log("\n2. SUB ORDERS (Orders table - limit 10):");
  const { data: subs, error: sError } = await supabase
    .from('orders')
    .select('id, order_number, status, parent_order_id, shop_id')
    .order('created_at', { ascending: false })
    .limit(10);
    
  if (sError) console.error("Error fetching orders:", sError.message);
  else console.table(subs);

  // 3. Check for Orphaned Ready Orders
  // Orders that are READY_FOR_PICKUP but their parent is NOT
  if (subs && subs.length > 0) {
     const readySubIds = subs.filter(s => s.status === 'READY_FOR_PICKUP').map(s => s.parent_order_id);
     if (readySubIds.length > 0) {
        console.log("\n3. Checking Parents of 'READY_FOR_PICKUP' suborders:");
        const { data: readyParents } = await supabase
            .from('parent_orders')
            .select('id, order_number, status')
            .in('id', readySubIds);
        console.table(readyParents);
     }
  }
}

debugOrders();


import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Manually parse .env 
const envPath = path.resolve(__dirname, '../.env');
const envConfig = {};

try {
  if (fs.existsSync(envPath)) {
    const envFile = fs.readFileSync(envPath, 'utf8');
    envFile.split('\n').forEach(line => {
      const parts = line.split('=');
      if (parts.length >= 2) {
        const key = parts[0].trim();
        const value = parts.slice(1).join('=').trim();
        envConfig[key] = value;
      }
    });
  }
} catch (e) {
  console.error("Error reading .env", e);
}

const supabaseUrl = envConfig.VITE_SUPABASE_URL;
const supabaseKey = envConfig.VITE_SUPABASE_ANON_KEY;
// Start with Anon, but if we have Service Role, use it for better visibility
const startKey = envConfig.SUPABASE_SERVICE_ROLE_KEY || supabaseKey; 

console.log("Connecting to:", supabaseUrl);
console.log("Using key type:", startKey === envConfig.SUPABASE_SERVICE_ROLE_KEY ? "SERVICE_ROLE (Full Access)" : "ANON (Restricted)");

const supabase = createClient(supabaseUrl, startKey);

async function diagnose() {
  console.log("\n--- RECENT PARENT ORDERS DIAGNOSTIC ---");

  // Fetch last 5 parent orders
  const { data: parents, error: pError } = await supabase
    .from('parent_orders')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);

  if (pError) {
      console.error("Error fetching parent_orders:", pError);
      return;
  }

  if (!parents || parents.length === 0) {
      console.log("No parent orders found.");
      return;
  }

  for (const p of parents) {
      console.log(`\nParent Order: ${p.order_number || p.id}`);
      console.log(`  ID: ${p.id}`);
      console.log(`  Status: ${p.status}`); // THIS IS THE CRITICAL FIELD
      console.log(`  Delivery User: ${p.delivery_user_id || 'unassigned'}`);
      console.log(`  Created: ${p.created_at}`);

      // Fetch sub-orders for this parent
      const { data: subs, error: sError } = await supabase
        .from('orders')
        .select('id, order_number, status, shop_id, total')
        .eq('parent_order_id', p.id);

      if (sError) {
          console.error("  Error fetching sub-orders:", sError.message);
      } else {
          subs.forEach(s => {
              console.log(`    -> SubOrder ${s.order_number || s.id}: Status='${s.status}'`);
          });
          
          // Analysis
          const hasReady = subs.some(s => s.status === 'READY_FOR_PICKUP');
          if (hasReady && p.status !== 'READY_FOR_PICKUP' && p.status !== 'OUT_FOR_DELIVERY' && p.status !== 'DELIVERED') {
              console.log("  ⚠️  MISMATCH DETECTED: SubOrder is READY but Parent is " + p.status);
              console.log("      (The Trigger is NOT updating the parent status!)");
          } else if (hasReady && p.status === 'READY_FOR_PICKUP') {
              console.log("  ✅  STATUS SYNC OK: Parent is Ready.");
              if (p.delivery_user_id) console.log("      (But already assigned/taken?)");
          }
      }
  }
}

diagnose();

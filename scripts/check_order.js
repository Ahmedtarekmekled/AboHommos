
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Manually parse .env because we don't want to rely on dotenv package availability
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
const supabaseKey = envConfig.VITE_SUPABASE_ANON_KEY; // Using Anon key for RLS check (or Service Role if available for truth)

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkOrder() {
  console.log("Checking database...");

  // 1. Fetch the specific order from the screenshot (which is likely a SUB-ORDER if it is in Shop Dashboard)
  // Screenshot ID: PO-1769880093435-GFSTRN-879E
  const targetOrderNumber = "PO-1769880093435-GFSTRN-879E";
  
  console.log(`Looking for Order Number: ${targetOrderNumber}`);

  // Fetch from orders (sub-orders)
  const { data: subOrder, error: subError } = await supabase
    .from('orders')
    .select('*')
    .eq('order_number', targetOrderNumber)
    .single();

  if (subError) {
      console.log("Not found in 'orders' table (Sub-Order)");
  } else {
      console.log("\n--- SUB ORDER FOUND ---");
      console.log(`ID: ${subOrder.id}`);
      console.log(`Status: ${subOrder.status}`);
      console.log(`Parent ID: ${subOrder.parent_order_id}`);
      
      if (subOrder.parent_order_id) {
          // Fetch Parent
          const { data: parent, error: pError } = await supabase
            .from('parent_orders')
            .select('*')
            .eq('id', subOrder.parent_order_id)
            .single();
            
          if (parent) {
              console.log("\n--- PARENT ORDER FOUND ---");
              console.log(`ID: ${parent.id}`);
              console.log(`Status: ${parent.status}`);
              console.log(`Delivery User: ${parent.delivery_user_id}`);
          } else {
              console.log("\n--- PARENT ORDER NOT FOUND ---");
              console.log("Error:", pError?.message);
          }
      }
  }
  
  // Also check if this ID exists directly in parent_orders (maybe user is confused)
  const { data: directParent, error: dpError } = await supabase
    .from('parent_orders')
    .select('*')
    .eq('order_number', targetOrderNumber)
    .single();
    
   if (directParent) {
       console.log("\n--- MATCHING PARENT ORDER FOUND (Direct ID Match) ---");
       console.log(`ID: ${directParent.id}`);
       console.log(`Status: ${directParent.status}`);
       console.log(`Delivery User: ${directParent.delivery_user_id}`);
   }
}

checkOrder();

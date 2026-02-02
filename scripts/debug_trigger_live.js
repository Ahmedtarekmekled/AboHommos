
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
// Need SERVICE ROLE KEY to bypass RLS for setup, but verified query should use ANON
// Use service role if available in env, else try anon (might fail for insert if strict)
const serviceKey = envConfig.SUPABASE_SERVICE_ROLE_KEY || supabaseKey; 
const supabaseAdmin = createClient(supabaseUrl, serviceKey);
const supabaseAnon = createClient(supabaseUrl, supabaseKey);

async function runTest() {
  console.log("--- STARTING TRIGGER DIAGNOSTIC ---");
  
  // 1. Create a dummy Parent Order
  const parentId = crypto.randomUUID();
  const userId = "00000000-0000-0000-0000-000000000000"; 
  const { data: profiles } = await supabaseAdmin.from('profiles').select('id').limit(1);
  const realUserId = profiles?.[0]?.id || userId;

  console.log(`Using User ID: ${realUserId}`);

  // Note: Adjust column names based on your actual schema if they differ (e.g. total_price vs total_amount)
  const { data: parent, error: pError } = await supabaseAdmin
    .from('parent_orders')
    .insert({
        id: parentId,
        user_id: realUserId,
        status: 'PLACED',
        total: 100, // Changed from total_amount to total based on common schema
        delivery_address: 'Test Trigger Address | GPS: 10,10',
        customer_phone: '1234567890'
    })
    .select()
    .single();

  if (pError) {
      console.error("Failed to create parent order:", pError);
      return;
  }
  console.log(`Step 1: Parent Order Created. Status: ${parent.status}`);

  // 2. Create a dummy Sub Order
  const { data: shops } = await supabaseAdmin.from('shops').select('id').limit(1);
  const shopId = shops?.[0]?.id;
  
  if (!shopId) {
      console.error("No shops found to create order");
      return;
  }

  const { data: order, error: oError } = await supabaseAdmin
    .from('orders')
    .insert({
        parent_order_id: parentId,
        user_id: realUserId,
        shop_id: shopId,
        status: 'PLACED',
        total: 50,
        delivery_fee: 10
    })
    .select()
    .single();
    
  if (oError) {
      console.error("Failed to create sub order:", oError);
      return;
  }
  console.log(`Step 2: Sub Order Created. Status: ${order.status}`);

  // 3. Simulate Shop updating status to PREPARING
  await supabaseAdmin.from('orders').update({ status: 'PREPARING' }).eq('id', order.id);
  console.log("Step 3: Update Sub Order -> PREPARING");
  
  // Check Parent
  let { data: pCheck1 } = await supabaseAdmin.from('parent_orders').select('status').eq('id', parentId).single();
  console.log(`   Parent Status Check 1: ${pCheck1.status}`);

  // 4. Simulate Shop updating status to READY_FOR_PICKUP
  await supabaseAdmin.from('orders').update({ status: 'READY_FOR_PICKUP' }).eq('id', order.id);
  console.log("Step 4: Update Sub Order -> READY_FOR_PICKUP");

  // Check Parent
  let { data: pCheck2 } = await supabaseAdmin.from('parent_orders').select('status').eq('id', parentId).single();
  console.log(`   Parent Status Check 2: ${pCheck2.status}`);

  if (pCheck2.status === 'READY_FOR_PICKUP') {
      console.log("✅ TRIGGER SUCCESS: Parent updated to READY_FOR_PICKUP");
  } else {
      console.log("❌ TRIGGER FAILED: Parent stuck at " + pCheck2.status);
  }

  // 5. Test Visibility for Courier (ANON/Auth Sim)
  // We can't fully sim auth here easily without login, but we can check the RLS policy field query
  console.log("\n--- Checking RLS Visibility ---");
  const { data: visibleOrders, error: vError } = await supabaseAnon
    .from('parent_orders')
    .select('*')
    .eq('status', 'READY_FOR_PICKUP')
    .is('delivery_user_id', null)
    .eq('id', parentId); // Target our specific test order

  if (vError) {
      console.log("RLS/Query Error:", vError);
  } else if (visibleOrders && visibleOrders.length > 0) {
      console.log("✅ VISIBILITY SUCCESS: Order found by public/anon client (Simulating Courier view)");
  } else {
      console.log("❌ VISIBILITY FAILED: Order NOT found by public/anon client");
  }

  // Cleanup
  console.log("\nCleaning up test data...");
  await supabaseAdmin.from('orders').delete().eq('id', order.id);
  await supabaseAdmin.from('parent_orders').delete().eq('id', parent.id);
}

runTest();

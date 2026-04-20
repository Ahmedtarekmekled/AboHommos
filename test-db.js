import { createClient } from '@supabase/supabase-js';

import fs from 'fs';
import path from 'path';

const envContent = fs.readFileSync(path.resolve('.env'), 'utf8');
const envVars = Object.fromEntries(
  envContent.split('\n').filter(line => line && !line.startsWith('#')).map(line => {
    const [key, ...value] = line.split('=');
    return [key.trim(), value.join('=').trim()];
  })
);

const supabase = createClient(envVars.VITE_SUPABASE_URL, envVars.VITE_SUPABASE_ANON_KEY);

async function main() {
  const { data: parentOrders, error: pError } = await supabase
    .from("parent_orders")
    .select("id, status, delivery_user_id, created_at")
    .order("created_at", { ascending: false })
    .limit(5);

  console.log("Parent Orders Error:", pError);
  console.log("Parent Orders:", parentOrders);

  const { data: orders, error: oError } = await supabase
    .from("orders")
    .select("id, status, parent_order_id, created_at")
    .order("created_at", { ascending: false })
    .limit(5);

  console.log("Orders Error:", oError);
  console.log("Orders:", orders);
}

main().catch(console.error);

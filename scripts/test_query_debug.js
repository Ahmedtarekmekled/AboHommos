
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://oxaepmflhjtiifwdjgdc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im94YWVwbWZsaGp0aWlmd2RqZ2RjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkxMDM0MjUsImV4cCI6MjA4NDY3OTQyNX0.fwu-1yupHNa-UHJsBTQSou09z9kJMKXa6NL9GlGw11U';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testQuery() {
  console.log('Testing getShopOrdersEnhanced query...');
  
  // We need a valid shop ID.
  const { data: shops } = await supabase.from('shops').select('id').limit(1);
  if (!shops || shops.length === 0) {
      console.log('No shops found to test with.');
      return;
  }
  const shopId = shops[0].id;
  console.log(`Using shop ID: ${shopId}`);

  // 1. Original Query
  console.log('--- Attempt 1: Original Query ---');
  const { data: data1, error: error1 } = await supabase
    .from("orders")
    .select(
      `
      *,
      shop:shops(id, name, slug, logo_url, phone),
      items:order_items(*),
      status_history:order_status_history(*),
      parent_order:parent_orders(
          id, 
          status, 
          delivery_user_id, 
          delivery_user:profiles!delivery_user_id(id, full_name, phone_number, avatar_url)
      )
    `
    )
    .eq("shop_id", shopId)
    .limit(1);

  if (error1) {
    console.error('Error 1:', JSON.stringify(error1, null, 2));
  } else {
    console.log('Success 1!');
  }

  // 2. Fixed Query with Explicit FKs
  console.log('--- Attempt 2: Explicit FKs ---');
  const { data: data2, error: error2 } = await supabase
    .from("orders")
    .select(
      `
      *,
      shop:shops(id, name, slug, logo_url, phone),
      items:order_items(*),
      status_history:order_status_history(*),
      parent_order:parent_orders!parent_order_id(
          id, 
          status, 
          delivery_user_id, 
          delivery_user:profiles!delivery_user_id(id, full_name, phone_number, avatar_url)
      )
    `
    )
    .eq("shop_id", shopId)
    .limit(1);

  if (error2) {
    console.error('Error 2:', JSON.stringify(error2, null, 2));
  } else {
    console.log('Success 2!');
  }
}

testQuery();

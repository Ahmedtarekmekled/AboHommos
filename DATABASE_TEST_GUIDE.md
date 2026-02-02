# Database Migration Test Guide

## Step 1: Run the Migration

1. Open your **Supabase Dashboard**
2. Go to **SQL Editor**
3. Copy and paste the contents of `sql/multi-store-setup.sql`
4. Click **Run** or press `Ctrl+Enter`

**Expected Result:** ✅ "Success. No rows returned"

## Step 2: Verify Migration

Run each test query from `sql/verify-multi-store-migration.sql` one by one:

### Quick Verification Checklist

Run this single query to check everything at once:

```sql
-- Quick health check
SELECT 
  'shops.latitude' as check_name,
  CASE WHEN COUNT(*) = 1 THEN '✅ PASS' ELSE '❌ FAIL' END as status
FROM information_schema.columns
WHERE table_name = 'shops' AND column_name = 'latitude'

UNION ALL

SELECT 
  'parent_orders table',
  CASE WHEN COUNT(*) = 1 THEN '✅ PASS' ELSE '❌ FAIL' END
FROM information_schema.tables
WHERE table_name = 'parent_orders'

UNION ALL

SELECT 
  'delivery_settings row',
  CASE WHEN COUNT(*) = 1 THEN '✅ PASS' ELSE '❌ FAIL' END
FROM delivery_settings

UNION ALL

SELECT 
  'carts.shop_id nullable',
  CASE WHEN is_nullable = 'YES' THEN '✅ PASS' ELSE '❌ FAIL' END
FROM information_schema.columns
WHERE table_name = 'carts' AND column_name = 'shop_id';
```

**Expected Result:** All rows should show "✅ PASS"

## Step 3: View Delivery Settings

```sql
SELECT * FROM delivery_settings;
```

**Expected Result:**
```
id: true
base_fee: 20.00
km_rate: 3.00
pickup_stop_fee: 10.00
min_fee: 20.00
max_fee: 200.00
rounding_rule: nearest_int
fallback_mode: fixed_fee
fixed_fallback_fee: 50.00
routing_algorithm: nearest_neighbor
return_to_customer: true
mapbox_profile: driving
max_shops_per_order: 10
```

## Step 4: Check Parent Orders Table Structure

```sql
SELECT 
  column_name, 
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'parent_orders'
ORDER BY ordinal_position;
```

**Expected Columns (25 total):**
- id (uuid)
- order_number (character varying)
- user_id (uuid)
- status (character varying)
- subtotal (numeric)
- total_delivery_fee (numeric)
- discount (numeric)
- total (numeric)
- route_km (numeric)
- route_minutes (integer)
- pickup_sequence (jsonb)
- delivery_fee_breakdown (jsonb)
- delivery_settings_snapshot (jsonb)
- customer_name (character varying)
- customer_phone (character varying)
- delivery_address (text)
- delivery_latitude (numeric)
- delivery_longitude (numeric)
- delivery_notes (text)
- payment_method (character varying)
- payment_status (character varying)
- delivery_user_id (uuid)
- created_at (timestamp with time zone)
- updated_at (timestamp with time zone)

## Step 5: Test Data Insertion (Optional)

Only if you want to test inserting sample data:

```sql
-- Insert a test parent order (will fail if user doesn't exist, that's OK)
INSERT INTO parent_orders (
  order_number,
  user_id,
  subtotal,
  total_delivery_fee,
  total,
  customer_name,
  customer_phone,
  delivery_address
) VALUES (
  'TEST-PO-001',
  (SELECT id FROM profiles LIMIT 1),
  100.00,
  30.00,
  130.00,
  'Test Customer',
  '01234567890',
  'Test Address'
)
RETURNING *;

-- Clean up test data
DELETE FROM parent_orders WHERE order_number = 'TEST-PO-001';
```

## Common Issues & Solutions

### Issue: "relation 'parent_orders' already exists"
**Solution:** Migration already ran successfully. Skip to verification.

### Issue: "permission denied for table"
**Solution:** Make sure you're running as the database owner or have proper permissions.

### Issue: "column 'shop_id' of relation 'carts' contains null values"
**Solution:** This is expected after making shop_id nullable. Existing carts are fine.

### Issue: RLS policy errors
**Solution:** Make sure the `profiles` table has the `role` column with 'ADMIN' value.

## ✅ All Tests Passed?

If all verification queries pass, you can proceed to:
1. Add Mapbox token to `.env`
2. Test the services in the frontend
3. Build the admin UI

## 🚨 Need to Rollback?

If something went wrong and you need to rollback:

```sql
-- WARNING: This will delete all multi-store data!
DROP TABLE IF EXISTS parent_orders CASCADE;
DROP TABLE IF EXISTS delivery_settings CASCADE;

ALTER TABLE orders 
  DROP COLUMN IF EXISTS parent_order_id,
  DROP COLUMN IF EXISTS is_critical,
  DROP COLUMN IF EXISTS pickup_sequence_index,
  DROP COLUMN IF EXISTS cancelled_by,
  DROP COLUMN IF EXISTS refund_amount;

ALTER TABLE shops 
  DROP COLUMN IF EXISTS latitude,
  DROP COLUMN IF EXISTS longitude;

ALTER TABLE addresses 
  DROP COLUMN IF EXISTS latitude,
  DROP COLUMN IF EXISTS longitude;

ALTER TABLE carts ALTER COLUMN shop_id SET NOT NULL;
```

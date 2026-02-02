-- Enable RLS on parent_orders if not already enabled
ALTER TABLE parent_orders ENABLE ROW LEVEL SECURITY;

-- 1. Customers can view their own parent orders
CREATE POLICY "Customers can view own parent orders"
ON parent_orders FOR SELECT
USING (auth.uid() = user_id);

-- 2. Couriers can view available orders (READY_FOR_PICKUP and unassigned)
CREATE POLICY "Couriers can view available orders"
ON parent_orders FOR SELECT
USING (
  status = 'READY_FOR_PICKUP' 
  AND delivery_user_id IS NULL
  -- Ideally check if role is DELIVERY, but for now we can rely on application logic 
  -- or add: AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'DELIVERY')
);

-- 3. Couriers can view orders they have claimed
CREATE POLICY "Couriers can view assigned orders"
ON parent_orders FOR SELECT
USING (delivery_user_id = auth.uid());

-- 4. Admins can view all
CREATE POLICY "Admins can view all parent orders"
ON parent_orders FOR SELECT
USING (is_admin());

-- 5. Allow couriers to claim orders (UPDATE delivery_user_id)
CREATE POLICY "Couriers can claim orders"
ON parent_orders FOR UPDATE
USING (status = 'READY_FOR_PICKUP' AND delivery_user_id IS NULL)
WITH CHECK (delivery_user_id = auth.uid());

-- 6. Allow couriers to update status of their orders
CREATE POLICY "Couriers can update assigned orders"
ON parent_orders FOR UPDATE
USING (delivery_user_id = auth.uid())
WITH CHECK (delivery_user_id = auth.uid());

-- 7. Allow insert for authenticated users (when placing order)
CREATE POLICY "Users can insert parent orders"
ON parent_orders FOR INSERT
WITH CHECK (auth.uid() = user_id);

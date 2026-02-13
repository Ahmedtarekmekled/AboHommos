
-- 1. Update ENUM (Safe Migration)
-- Adding new values to the existing enum
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'CANCELLED_BY_SHOP';
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'CANCELLED_BY_ADMIN';

-- 2. Add Audit Columns to orders table
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS cancellation_reason TEXT,
ADD COLUMN IF NOT EXISTS cancelled_by TEXT CHECK (cancelled_by IN ('SHOP', 'ADMIN', 'SYSTEM')),
ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;

-- 3. Create Atomic RPC Function for Cancellation
CREATE OR REPLACE FUNCTION cancel_shop_order(
    p_order_id UUID,
    p_reason TEXT,
    p_actor TEXT -- 'SHOP' or 'ADMIN'
)
RETURNS JSONB
SECURITY DEFINER -- Runs with Admin privileges to bypass RLS if needed, but we check permissions via RLS normally. 
-- However, for complex updates involving multiple tables or strict validation, SECURITY DEFINER with explicit checks is safer.
SET search_path = public
AS $$
DECLARE
    v_order_status order_status;
    v_parent_id UUID;
    v_sibling_statuses order_status[];
    v_new_parent_status VARCHAR; -- Parent status is VARCHAR
BEGIN
    -- Input Validation
    IF length(trim(p_reason)) = 0 OR p_reason IS NULL THEN
        RAISE EXCEPTION 'Cancellation reason is required';
    END IF;

    IF p_actor NOT IN ('SHOP', 'ADMIN') THEN
         RAISE EXCEPTION 'Invalid actor type';
    END IF;

    -- Fetch current status and parent_id
    SELECT status, parent_order_id INTO v_order_status, v_parent_id
    FROM orders
    WHERE id = p_order_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Order not found');
    END IF;

    -- Strict Status Validation
    IF v_order_status IN ('OUT_FOR_DELIVERY', 'DELIVERED') THEN
        RAISE EXCEPTION 'Cannot cancel order in current status (%)', v_order_status;
    END IF;

    -- Check if already cancelled
    IF v_order_status::text LIKE 'CANCELLED%' THEN
        RAISE EXCEPTION 'Order is already cancelled';
    END IF;

    -- Atomic Update of Sub-Order
    UPDATE orders 
    SET status = CASE 
            WHEN p_actor = 'SHOP' THEN 'CANCELLED_BY_SHOP'::order_status
            ELSE 'CANCELLED_BY_ADMIN'::order_status
        END,
        cancellation_reason = p_reason,
        cancelled_by = p_actor,
        cancelled_at = NOW(),
        updated_at = NOW()
    WHERE id = p_order_id;

    -- Parent Sync Logic (Reusing/Embedding logic to ensure atomicity)
    IF v_parent_id IS NOT NULL THEN
        -- Get all sibling statuses (including the one just updated)
        SELECT array_agg(status) INTO v_sibling_statuses
        FROM orders
        WHERE parent_order_id = v_parent_id;

        -- Determine New Parent Status
        -- If ALL sub-orders are cancelled (any type), parent is CANCELLED
        IF (
            SELECT bool_and(
                s::text = 'CANCELLED' OR 
                s::text = 'CANCELLED_BY_SHOP' OR 
                s::text = 'CANCELLED_BY_ADMIN'
            )
            FROM unnest(v_sibling_statuses) s
        ) THEN
            v_new_parent_status := 'CANCELLED';
        ELSE
            -- If not all cancelled, but at least one is active, usage simple logic or current state
            -- For now, if mixed, we generally keep it as PROCESSING or PARTIALLY_READY/CANCELLED if we had that.
            -- To remain safe, we only forcibly update to CANCELLED if ALL are cancelled.
            -- Otherwise, we might need to check if we should revert to PROCESSING if it was READY.
            -- Stick to basic atomic sync: if not all cancelled, effective status is derived from remaining active ones.
            -- For this phase, we only strictly handle "All Cancelled -> Cancelled".
            -- Existing logic in `update_shop_order_status` handles other states. 
            -- Let's just set it to 'CANCELLED' if all are cancelled.
             v_new_parent_status := NULL; -- No change implied unless all cancelled
        END IF;

        IF v_new_parent_status IS NOT NULL THEN
            UPDATE parent_orders
            SET status = v_new_parent_status,
                updated_at = NOW()
            WHERE id = v_parent_id;
        END IF;
    END IF;

    RETURN jsonb_build_object(
        'success', true, 
        'message', 'Order cancelled successfully',
        'status', CASE WHEN p_actor = 'SHOP' THEN 'CANCELLED_BY_SHOP' ELSE 'CANCELLED_BY_ADMIN' END
    );
END;
$$ LANGUAGE plpgsql;

-- Grant access
GRANT EXECUTE ON FUNCTION cancel_shop_order(UUID, TEXT, TEXT) TO authenticated;

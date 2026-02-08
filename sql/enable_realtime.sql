
-- Ensure parent_orders is part of the realtime publication
-- This is often key for specific table events to fire to clients
BEGIN;
  -- Remove from publication first to avoid errors if it's already there (optional safe-guard)
  -- ALTER PUBLICATION supabase_realtime DROP TABLE parent_orders;
  
  -- Add to publication
  ALTER PUBLICATION supabase_realtime ADD TABLE parent_orders;
  
  -- Set Replica Identity to FULL to ensure we get the full row on updates
  -- This helps clients filtering on columns that might not be changed
  ALTER TABLE parent_orders REPLICA IDENTITY FULL;
COMMIT;

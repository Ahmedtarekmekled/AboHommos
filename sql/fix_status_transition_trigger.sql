-- Update validate_order_status_transition to support new cancellation statuses

CREATE OR REPLACE FUNCTION validate_order_status_transition()
RETURNS TRIGGER AS $$
BEGIN
  -- Allow any transition for new orders
  IF TG_OP = 'INSERT' THEN
    RETURN NEW;
  END IF;
  
  -- Handle Cancellation Transitions (Allow from any non-terminal state)
  IF NEW.status IN ('CANCELLED', 'CANCELLED_BY_SHOP', 'CANCELLED_BY_ADMIN') THEN
     IF OLD.status IN ('DELIVERED', 'CANCELLED', 'CANCELLED_BY_SHOP', 'CANCELLED_BY_ADMIN') THEN
        RAISE EXCEPTION 'Cannot cancel order that is already %', OLD.status;
     END IF;
     -- Allow cancellation
     RETURN NEW;
  END IF;

  -- Validate specific status transitions
  IF OLD.status = 'PLACED' AND NEW.status NOT IN ('CONFIRMED') THEN
    RAISE EXCEPTION 'Invalid status transition from PLACED to %', NEW.status;
  END IF;
  
  IF OLD.status = 'CONFIRMED' AND NEW.status NOT IN ('PREPARING') THEN
    RAISE EXCEPTION 'Invalid status transition from CONFIRMED to %', NEW.status;
  END IF;
  
  -- PREPARING can go to READY_FOR_PICKUP or OUT_FOR_DELIVERY (direct delivery)
  IF OLD.status = 'PREPARING' AND NEW.status NOT IN ('READY_FOR_PICKUP', 'OUT_FOR_DELIVERY') THEN
    RAISE EXCEPTION 'Invalid status transition from PREPARING to %', NEW.status;
  END IF;
  
  -- READY_FOR_PICKUP can go to OUT_FOR_DELIVERY
  IF OLD.status = 'READY_FOR_PICKUP' AND NEW.status NOT IN ('OUT_FOR_DELIVERY') THEN
     RAISE EXCEPTION 'Invalid status transition from READY_FOR_PICKUP to %', NEW.status;
  END IF;
  
  IF OLD.status = 'OUT_FOR_DELIVERY' AND NEW.status NOT IN ('DELIVERED') THEN
    RAISE EXCEPTION 'Invalid status transition from OUT_FOR_DELIVERY to %', NEW.status;
  END IF;
  
  -- Prevent changes to terminal states
  IF OLD.status IN ('DELIVERED', 'CANCELLED', 'CANCELLED_BY_SHOP', 'CANCELLED_BY_ADMIN') THEN
    RAISE EXCEPTION 'Cannot change status of % order', OLD.status;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

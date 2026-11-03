-- ==============================================================================
-- Migration: 20260308100000_fix_rpc_item_status_cast.sql
-- Description:
-- Fix explicit enum type casting to public.item_status in RPCs:
-- 1. kiosk_checkout
-- 2. kiosk_return
-- 3. update_item_repair_status
-- ==============================================================================

-- 1. kiosk_checkout
CREATE OR REPLACE FUNCTION public.kiosk_checkout(
  p_item_id UUID,
  p_due_date TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days')
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_item RECORD;
  v_issued_id UUID;
  v_new_qty INT;
  v_new_status public.item_status;
  v_due_date DATE;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Authentication required to check out items');
  END IF;

  IF p_due_date IS NULL THEN
    v_due_date := (NOW() + INTERVAL '7 days')::DATE;
  ELSE
    v_due_date := p_due_date::DATE;
  END IF;

  -- Lock item row for atomic concurrency protection
  SELECT id, current_quantity, status, name
  INTO v_item
  FROM public.items
  WHERE id = p_item_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Item not found');
  END IF;

  IF v_item.current_quantity <= 0 OR v_item.status::text NOT IN ('available', 'low_stock') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Item is not available for checkout');
  END IF;

  -- Decrement quantity and update status if depleted
  v_new_qty := GREATEST(0, v_item.current_quantity - 1);
  v_new_status := CASE WHEN v_new_qty = 0 THEN 'borrowed'::public.item_status ELSE v_item.status END;

  UPDATE public.items
  SET current_quantity = v_new_qty,
      status = v_new_status,
      updated_at = NOW()
  WHERE id = p_item_id;

  -- Insert checkout record into issued_items
  INSERT INTO public.issued_items (
    item_id,
    issued_to,
    issued_by,
    due_date,
    status,
    condition_at_issue,
    quantity_issued
  ) VALUES (
    p_item_id,
    v_user_id,
    v_user_id,
    v_due_date,
    'active',
    'Good',
    1
  ) RETURNING id INTO v_issued_id;

  RETURN jsonb_build_object(
    'success', true,
    'issued_item_id', v_issued_id,
    'message', 'Item checked out successfully'
  );
END;
$$;

-- 2. kiosk_return
CREATE OR REPLACE FUNCTION public.kiosk_return(
  p_issued_item_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_issued RECORD;
  v_item RECORD;
  v_new_qty INT;
  v_new_status public.item_status;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Authentication required to return items');
  END IF;

  -- Lock issued item
  SELECT id, item_id, issued_to, status, returned_date
  INTO v_issued
  FROM public.issued_items
  WHERE id = p_issued_item_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Checkout record not found');
  END IF;

  IF v_issued.status = 'returned' OR v_issued.returned_date IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Item has already been returned');
  END IF;

  -- Only borrower or staff/admin can return
  IF v_issued.issued_to <> v_user_id AND NOT public.is_admin_or_staff(v_user_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'You can only return items issued to you');
  END IF;

  -- Mark returned in issued_items
  UPDATE public.issued_items
  SET status = 'returned',
      returned_date = CURRENT_DATE
  WHERE id = p_issued_item_id;

  -- Increment item quantity and restore status
  SELECT id, current_quantity, status
  INTO v_item
  FROM public.items
  WHERE id = v_issued.item_id
  FOR UPDATE;

  IF FOUND THEN
    v_new_qty := COALESCE(v_item.current_quantity, 0) + 1;
    v_new_status := CASE WHEN v_item.status = 'borrowed'::public.item_status THEN 'available'::public.item_status ELSE v_item.status END;

    UPDATE public.items
    SET current_quantity = v_new_qty,
        status = v_new_status,
        updated_at = NOW()
    WHERE id = v_issued.item_id;
  END IF;

  RETURN jsonb_build_object('success', true, 'message', 'Item returned successfully');
END;
$$;

-- 3. update_item_repair_status
CREATE OR REPLACE FUNCTION public.update_item_repair_status(
  p_item_id UUID,
  p_status TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id UUID := auth.uid();
  v_role TEXT;
BEGIN
  IF v_caller_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  SELECT role INTO v_role
  FROM public.user_roles
  WHERE user_id = v_caller_id;

  IF v_role NOT IN ('admin', 'staff', 'technician') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Permission denied: must be technician, staff, or admin');
  END IF;

  IF p_status NOT IN ('available', 'under_maintenance', 'damaged', 'disposed', 'archived') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid item status');
  END IF;

  UPDATE public.items
  SET status = p_status::public.item_status,
      updated_at = NOW()
  WHERE id = p_item_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Item not found');
  END IF;

  RETURN jsonb_build_object('success', true, 'message', 'Item status updated successfully');
END;
$$;

GRANT EXECUTE ON FUNCTION public.kiosk_checkout(UUID, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION public.kiosk_return(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_item_repair_status(UUID, TEXT) TO authenticated;

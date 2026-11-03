-- ==============================================================================
-- Migration: 20260306_comprehensive_backend_fixes.sql
-- Description:
-- 1. Storage bucket item-images creation & RLS policies
-- 2. otp_verifications RLS tightening & secure OTP RPCs (create_otp, verify_otp)
-- 3. Kiosk self-service checkout & return SECURITY DEFINER RPCs (kiosk_checkout, kiosk_return) & RLS
-- 4. Technician repair status RPC (update_item_repair_status) & technician item update RLS
-- 5. Public catalog / QR scan RLS policy allowing view of borrowed/under_maintenance items
-- 6. Foreign key cascade / nullification compliance across issued_items, damage_reports, etc.
-- ==============================================================================

-- ==========================================
-- PART 1: STORAGE BUCKET 'item-images'
-- ==========================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'item-images',
  'item-images',
  true,
  5242880, -- 5 MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];

-- Storage RLS Policies
DROP POLICY IF EXISTS "Public can view item images" ON storage.objects;
CREATE POLICY "Public can view item images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'item-images');

DROP POLICY IF EXISTS "Authenticated users can upload item images" ON storage.objects;
CREATE POLICY "Authenticated users can upload item images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'item-images');

DROP POLICY IF EXISTS "Authenticated users can update item images" ON storage.objects;
CREATE POLICY "Authenticated users can update item images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'item-images');

DROP POLICY IF EXISTS "Admin and staff can delete item images" ON storage.objects;
CREATE POLICY "Admin and staff can delete item images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'item-images' 
    AND EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = (SELECT auth.uid()) AND role IN ('admin', 'staff')
    )
  );

-- ==========================================
-- PART 2: OTP VERIFICATIONS RLS TIGHTENING & SECURE RPCs
-- ==========================================

-- Revoke any overly permissive anonymous SELECT on otp_verifications
DROP POLICY IF EXISTS "Anon can read OTPs for verification" ON public.otp_verifications;
DROP POLICY IF EXISTS "Users can read their own OTP" ON public.otp_verifications;

-- Only authenticated users can read their own OTPs (or admin)
CREATE POLICY "Users can read their own OTP"
  ON public.otp_verifications FOR SELECT
  TO authenticated
  USING (
    email = (SELECT email FROM auth.users WHERE id = (SELECT auth.uid()))
    OR EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = (SELECT auth.uid()) AND role IN ('admin', 'staff')
    )
  );

-- Secure OTP Generation Function
DROP FUNCTION IF EXISTS public.create_otp(TEXT, TEXT);
DROP FUNCTION IF EXISTS public.create_otp(TEXT);
CREATE OR REPLACE FUNCTION public.create_otp(
  p_email TEXT,
  p_otp TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_otp_id UUID;
  v_recent_count INT;
  v_generated_otp TEXT;
BEGIN
  IF p_email IS NULL OR p_email = '' THEN
    RAISE EXCEPTION 'Email is required';
  END IF;

  -- Rate limit: max 5 OTPs per email per hour
  SELECT COUNT(*) INTO v_recent_count
  FROM public.otp_verifications
  WHERE email = p_email
    AND created_at > NOW() - INTERVAL '1 hour';

  IF v_recent_count >= 5 THEN
    RAISE EXCEPTION 'Too many OTP requests. Please try again later.';
  END IF;

  -- Invalidate any existing unverified OTPs for this email
  UPDATE public.otp_verifications
  SET verified = true
  WHERE email = p_email AND verified = false;

  -- If OTP is not passed or empty, generate a cryptographically random 6-digit number
  IF p_otp IS NULL OR p_otp = '' THEN
    v_generated_otp := LPAD(FLOOR(random() * 900000 + 100000)::TEXT, 6, '0');
  ELSE
    v_generated_otp := p_otp;
  END IF;

  -- Create new OTP record valid for 10 minutes
  INSERT INTO public.otp_verifications (email, otp, expires_at)
  VALUES (p_email, v_generated_otp, NOW() + INTERVAL '10 minutes')
  RETURNING id INTO v_otp_id;

  RETURN v_otp_id;
END;
$$;

-- Secure OTP Verification Function
CREATE OR REPLACE FUNCTION public.verify_otp(
  p_email TEXT,
  p_otp TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_valid BOOLEAN;
BEGIN
  IF p_email IS NULL OR p_otp IS NULL THEN
    RETURN false;
  END IF;

  -- Check for valid, unexpired, unverified OTP
  UPDATE public.otp_verifications
  SET verified = true
  WHERE email = p_email
    AND otp = p_otp
    AND verified = false
    AND expires_at > NOW();

  v_valid := FOUND;
  RETURN v_valid;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_otp(TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_otp(TEXT, TEXT) TO anon, authenticated;

-- ==========================================
-- PART 3: KIOSK SELF-CHECKOUT & RETURN RPCs & RLS
-- ==========================================

-- Kiosk Self-Checkout RPC
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
  v_new_status TEXT;
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
  v_new_status := CASE WHEN v_new_qty = 0 THEN 'borrowed' ELSE v_item.status END;

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

-- Kiosk Return RPC
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
  v_new_status TEXT;
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
    v_new_status := CASE WHEN v_item.status = 'borrowed' THEN 'available' ELSE v_item.status END;

    UPDATE public.items
    SET current_quantity = v_new_qty,
        status = v_new_status,
        updated_at = NOW()
    WHERE id = v_issued.item_id;
  END IF;

  RETURN jsonb_build_object('success', true, 'message', 'Item returned successfully');
END;
$$;

GRANT EXECUTE ON FUNCTION public.kiosk_checkout(UUID, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION public.kiosk_return(UUID) TO authenticated;

-- Ensure issued_items RLS allows students to view and manage their own checkout records
DROP POLICY IF EXISTS "Staff can manage issued items" ON public.issued_items;
DROP POLICY IF EXISTS "Users can view own issued items" ON public.issued_items;
DROP POLICY IF EXISTS "Users can insert own issued items" ON public.issued_items;
DROP POLICY IF EXISTS "Users can update own issued items" ON public.issued_items;

CREATE POLICY "Users can view own issued items"
  ON public.issued_items FOR SELECT
  TO authenticated
  USING (
    issued_to = (SELECT auth.uid())
    OR public.is_admin_or_staff((SELECT auth.uid()))
  );

CREATE POLICY "Users can insert own issued items"
  ON public.issued_items FOR INSERT
  TO authenticated
  WITH CHECK (
    issued_to = (SELECT auth.uid())
    OR public.is_admin_or_staff((SELECT auth.uid()))
  );

CREATE POLICY "Users can update own issued items"
  ON public.issued_items FOR UPDATE
  TO authenticated
  USING (
    issued_to = (SELECT auth.uid())
    OR public.is_admin_or_staff((SELECT auth.uid()))
  )
  WITH CHECK (
    issued_to = (SELECT auth.uid())
    OR public.is_admin_or_staff((SELECT auth.uid()))
  );

-- ==========================================
-- PART 4: TECHNICIAN REPAIR STATUS UPDATE RPC & RLS
-- ==========================================

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
  SET status = p_status,
      updated_at = NOW()
  WHERE id = p_item_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Item not found');
  END IF;

  RETURN jsonb_build_object('success', true, 'message', 'Item status updated successfully');
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_item_repair_status(UUID, TEXT) TO authenticated;

-- Allow technicians to update item maintenance status directly in items table
DROP POLICY IF EXISTS "Technicians can update items for maintenance" ON public.items;
CREATE POLICY "Technicians can update items for maintenance"
  ON public.items FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = (SELECT auth.uid()) AND role = 'technician'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = (SELECT auth.uid()) AND role = 'technician'
    )
  );

-- ==========================================
-- PART 5: PUBLIC CATALOG & QR SCAN RLS POLICY
-- ==========================================

-- Allow anonymous users to view available, borrowed, under_maintenance, and low_stock items
DROP POLICY IF EXISTS "Anon can view available items for public catalog" ON public.items;
DROP POLICY IF EXISTS "Anon can view items for public catalog" ON public.items;

CREATE POLICY "Anon can view items for public catalog"
  ON public.items FOR SELECT
  TO anon
  USING (status::text IN ('available', 'borrowed', 'under_maintenance', 'low_stock'));

-- ==========================================
-- PART 6: FOREIGN KEY COMPLIANCE FOR USER DELETION
-- ==========================================

DO $$
BEGIN
  -- 1. issued_items.issued_by: Make nullable and ON DELETE SET NULL
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'issued_items' AND column_name = 'issued_by'
  ) THEN
    ALTER TABLE public.issued_items ALTER COLUMN issued_by DROP NOT NULL;
    IF EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'issued_items_issued_by_fkey' AND table_name = 'issued_items'
    ) THEN
      ALTER TABLE public.issued_items DROP CONSTRAINT issued_items_issued_by_fkey;
    END IF;
    ALTER TABLE public.issued_items 
      ADD CONSTRAINT issued_items_issued_by_fkey 
      FOREIGN KEY (issued_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;

  -- 2. issued_items.borrow_request_id: ON DELETE SET NULL
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'issued_items' AND column_name = 'borrow_request_id'
  ) THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'issued_items_borrow_request_id_fkey' AND table_name = 'issued_items'
    ) THEN
      ALTER TABLE public.issued_items DROP CONSTRAINT issued_items_borrow_request_id_fkey;
    END IF;
    ALTER TABLE public.issued_items 
      ADD CONSTRAINT issued_items_borrow_request_id_fkey 
      FOREIGN KEY (borrow_request_id) REFERENCES public.borrow_requests(id) ON DELETE SET NULL;
  END IF;

  -- 3. return_logs.returned_by_staff: Make nullable and ON DELETE SET NULL
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'return_logs' AND column_name = 'returned_by_staff'
  ) THEN
    ALTER TABLE public.return_logs ALTER COLUMN returned_by_staff DROP NOT NULL;
    IF EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'return_logs_returned_by_staff_fkey' AND table_name = 'return_logs'
    ) THEN
      ALTER TABLE public.return_logs DROP CONSTRAINT return_logs_returned_by_staff_fkey;
    END IF;
    ALTER TABLE public.return_logs 
      ADD CONSTRAINT return_logs_returned_by_staff_fkey 
      FOREIGN KEY (returned_by_staff) REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;

  -- 4. damage_reports.reported_by: Make nullable and ON DELETE SET NULL
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'damage_reports' AND column_name = 'reported_by'
  ) THEN
    ALTER TABLE public.damage_reports ALTER COLUMN reported_by DROP NOT NULL;
    IF EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'damage_reports_reported_by_fkey' AND table_name = 'damage_reports'
    ) THEN
      ALTER TABLE public.damage_reports DROP CONSTRAINT damage_reports_reported_by_fkey;
    END IF;
    ALTER TABLE public.damage_reports 
      ADD CONSTRAINT damage_reports_reported_by_fkey 
      FOREIGN KEY (reported_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;

  -- 5. damage_reports.reviewed_by: ON DELETE SET NULL
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'damage_reports_reviewed_by_fkey' AND table_name = 'damage_reports'
  ) THEN
    ALTER TABLE public.damage_reports DROP CONSTRAINT damage_reports_reviewed_by_fkey;
    ALTER TABLE public.damage_reports 
      ADD CONSTRAINT damage_reports_reviewed_by_fkey 
      FOREIGN KEY (reviewed_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;

  -- 6. maintenance_records.assigned_to: ON DELETE SET NULL
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'maintenance_records_assigned_to_fkey' AND table_name = 'maintenance_records'
  ) THEN
    ALTER TABLE public.maintenance_records DROP CONSTRAINT maintenance_records_assigned_to_fkey;
    ALTER TABLE public.maintenance_records 
      ADD CONSTRAINT maintenance_records_assigned_to_fkey 
      FOREIGN KEY (assigned_to) REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;

  -- 7. purchase_orders: created_by, approved_by, rejected_by ON DELETE SET NULL
  IF EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'purchase_orders'
  ) THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'purchase_orders_created_by_fkey' AND table_name = 'purchase_orders'
    ) THEN
      ALTER TABLE public.purchase_orders DROP CONSTRAINT purchase_orders_created_by_fkey;
      ALTER TABLE public.purchase_orders 
        ADD CONSTRAINT purchase_orders_created_by_fkey 
        FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
    END IF;
    IF EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'purchase_orders_approved_by_fkey' AND table_name = 'purchase_orders'
    ) THEN
      ALTER TABLE public.purchase_orders DROP CONSTRAINT purchase_orders_approved_by_fkey;
      ALTER TABLE public.purchase_orders 
        ADD CONSTRAINT purchase_orders_approved_by_fkey 
        FOREIGN KEY (approved_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
    END IF;
    IF EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'purchase_orders_rejected_by_fkey' AND table_name = 'purchase_orders'
    ) THEN
      ALTER TABLE public.purchase_orders DROP CONSTRAINT purchase_orders_rejected_by_fkey;
      ALTER TABLE public.purchase_orders 
        ADD CONSTRAINT purchase_orders_rejected_by_fkey 
        FOREIGN KEY (rejected_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
    END IF;
  END IF;

  -- 8. vendors.created_by: ON DELETE SET NULL
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'vendors_created_by_fkey' AND table_name = 'vendors'
  ) THEN
    ALTER TABLE public.vendors DROP CONSTRAINT vendors_created_by_fkey;
    ALTER TABLE public.vendors 
      ADD CONSTRAINT vendors_created_by_fkey 
      FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;

  -- 9. departments.head_user_id: ON DELETE SET NULL
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'departments_head_user_id_fkey' AND table_name = 'departments'
  ) THEN
    ALTER TABLE public.departments DROP CONSTRAINT departments_head_user_id_fkey;
    ALTER TABLE public.departments 
      ADD CONSTRAINT departments_head_user_id_fkey 
      FOREIGN KEY (head_user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

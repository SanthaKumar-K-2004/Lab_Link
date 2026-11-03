-- ==============================================================================
-- LabLink Security Audit Remediation Migration
-- Date: 2026-03-07
-- Remediates: SEC-03, SEC-04, SEC-06, SEC-12
-- ==============================================================================

-- ==============================================================================
-- 1. SEC-03: RESTRICT DIRECT DML ON ISSUED_ITEMS TO STAFF & ADMINS
-- Students must interact with checkouts/returns exclusively via audited RPCs:
-- (public.kiosk_checkout, public.kiosk_return)
-- ==============================================================================

DROP POLICY IF EXISTS "Users can insert own issued items" ON public.issued_items;
DROP POLICY IF EXISTS "Users can update own issued items" ON public.issued_items;
DROP POLICY IF EXISTS "Staff can manage issued items" ON public.issued_items;

-- Students may view their own issued items; staff/admins may view all
DROP POLICY IF EXISTS "Users can view own issued items" ON public.issued_items;
CREATE POLICY "Users can view own issued items"
  ON public.issued_items FOR SELECT
  TO authenticated
  USING (
    issued_to = (SELECT auth.uid())
    OR public.is_admin_or_staff((SELECT auth.uid()))
  );

-- Only staff and administrators may directly insert or update checkout custody records
CREATE POLICY "Staff can manage issued items"
  ON public.issued_items FOR ALL
  TO authenticated
  USING (public.is_admin_or_staff((SELECT auth.uid())))
  WITH CHECK (public.is_admin_or_staff((SELECT auth.uid())));

-- ==============================================================================
-- 2. SEC-04: PREVENT PRIVILEGE ESCALATION & DELETION IMMUNITY ON PROFILES
-- Non-admin users cannot alter is_default_admin, is_verified, or is_active
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.restrict_profile_security_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If updater is not an administrator, prevent mutation of security-critical flags
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    NEW.is_default_admin := OLD.is_default_admin;
    NEW.is_verified := OLD.is_verified;
    NEW.is_active := OLD.is_active;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_restrict_profile_fields ON public.profiles;
CREATE TRIGGER trg_restrict_profile_fields
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.restrict_profile_security_fields();

-- ==============================================================================
-- 3. SEC-06: SECURE ITEM-IMAGES STORAGE BUCKET (REMOVE SVG & RESTRICT DML)
-- ==============================================================================

-- Remove SVG from allowed mime types to prevent Stored XSS vectors
UPDATE storage.buckets
SET 
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'],
  file_size_limit = 5242880
WHERE id = 'item-images';

-- Restrict upload, update, and deletion to staff and administrators
DROP POLICY IF EXISTS "Authenticated users can upload item images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update item images" ON storage.objects;
DROP POLICY IF EXISTS "Admin and staff can delete item images" ON storage.objects;
DROP POLICY IF EXISTS "Staff can manage item images" ON storage.objects;

CREATE POLICY "Staff can manage item images"
  ON storage.objects FOR ALL
  TO authenticated
  USING (
    bucket_id = 'item-images' 
    AND public.is_admin_or_staff((SELECT auth.uid()))
  )
  WITH CHECK (
    bucket_id = 'item-images' 
    AND public.is_admin_or_staff((SELECT auth.uid()))
  );

-- ==============================================================================
-- 4. SEC-12: ATOMIC DATABASE TRANSACTION FOR CASCADING USER DELETION
-- Replaces non-transactional REST loop in delete-user Edge Function
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.admin_delete_user_cascade(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id UUID := auth.uid();
  v_target_profile RECORD;
BEGIN
  -- Verify caller is admin
  IF v_caller_id IS NOT NULL AND NOT public.has_role(v_caller_id, 'admin') THEN
    RAISE EXCEPTION 'Only administrators can execute cascading user deletion';
  END IF;

  -- Verify target is not default admin
  SELECT is_default_admin, full_name, email INTO v_target_profile
  FROM public.profiles
  WHERE id = p_user_id;

  IF v_target_profile.is_default_admin = TRUE THEN
    RAISE EXCEPTION 'Cannot delete the default admin account';
  END IF;

  -- 1. Departments head_user_id
  UPDATE public.departments SET head_user_id = NULL WHERE head_user_id = p_user_id;

  -- 2. Return logs
  UPDATE public.return_logs SET returned_by_staff = NULL WHERE returned_by_staff = p_user_id;

  -- 3. Issued items references
  UPDATE public.issued_items SET issued_by = NULL WHERE issued_by = p_user_id;
  DELETE FROM public.issued_items WHERE issued_to = p_user_id;

  -- 4. Damage reports
  UPDATE public.damage_reports SET reported_by = NULL WHERE reported_by = p_user_id;
  UPDATE public.damage_reports SET reviewed_by = NULL WHERE reviewed_by = p_user_id;

  -- 5. Maintenance records
  UPDATE public.maintenance_records SET assigned_to = NULL WHERE assigned_to = p_user_id;

  -- 6. Purchase orders & vendors
  UPDATE public.purchase_orders SET created_by = NULL WHERE created_by = p_user_id;
  UPDATE public.purchase_orders SET approved_by = NULL WHERE approved_by = p_user_id;
  UPDATE public.purchase_orders SET rejected_by = NULL WHERE rejected_by = p_user_id;
  UPDATE public.vendors SET created_by = NULL WHERE created_by = p_user_id;
  UPDATE public.tally_config SET created_by = NULL WHERE created_by = p_user_id;
  UPDATE public.tally_sync_logs SET created_by = NULL WHERE created_by = p_user_id;

  -- 7. Items & chemicals audit fields
  UPDATE public.items SET created_by = NULL WHERE created_by = p_user_id;
  UPDATE public.chemicals SET created_by = NULL WHERE created_by = p_user_id;
  UPDATE public.stock_transactions SET recorded_by = NULL WHERE recorded_by = p_user_id;

  -- 8. User departments & roles
  DELETE FROM public.user_departments WHERE user_id = p_user_id;
  DELETE FROM public.user_roles WHERE user_id = p_user_id;

  -- 9. Login logs & notifications
  DELETE FROM public.login_logs WHERE user_id = p_user_id;
  DELETE FROM public.notifications WHERE user_id = p_user_id;

  -- 10. Audit & activity logs: preserve audit history by setting user_id = NULL
  UPDATE public.audit_logs SET user_id = NULL WHERE user_id = p_user_id;
  UPDATE public.activity_logs SET user_id = NULL WHERE user_id = p_user_id;
  UPDATE public.activity_logs SET performed_by = NULL WHERE performed_by = p_user_id;

  -- 11. Borrow requests: unlink approved_by or delete student requests
  UPDATE public.borrow_requests SET approved_by = NULL WHERE approved_by = p_user_id;
  DELETE FROM public.borrow_requests WHERE student_id = p_user_id;

  -- 12. OTP verifications
  IF v_target_profile.email IS NOT NULL THEN
    DELETE FROM public.otp_verifications WHERE email = v_target_profile.email;
  END IF;

  -- 13. Profile record
  DELETE FROM public.profiles WHERE id = p_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'User data cascading cleanup completed atomically'
  );
END;
$$;


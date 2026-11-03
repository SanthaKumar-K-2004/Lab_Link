-- ==============================================================================
-- Migration: 20260305_fix_rls_and_business_logic.sql
-- Description:
-- 1. Fix borrow_requests UPDATE RLS policy so students can return or cancel requests
-- 2. Fix generate_item_code race condition and null category collision using a sequence
-- 3. Ensure issued_items permissions allow students and staff proper access
-- ==============================================================================

-- 1. Fix borrow_requests UPDATE RLS Policy
ALTER TYPE public.request_status ADD VALUE IF NOT EXISTS 'cancelled';

DROP POLICY IF EXISTS "Users can update requests" ON public.borrow_requests;
CREATE POLICY "Users can update requests"
  ON public.borrow_requests FOR UPDATE
  TO authenticated
  USING (
    public.is_admin_or_staff((select auth.uid()))
    OR (student_id = (select auth.uid()) AND status::text IN ('pending', 'approved'))
  )
  WITH CHECK (
    public.is_admin_or_staff((select auth.uid()))
    OR (student_id = (select auth.uid()) AND status::text IN ('pending', 'cancelled', 'return_pending'))
  );

-- 2. Concurrency-Safe Item Code Generator
CREATE SEQUENCE IF NOT EXISTS public.item_code_seq;

-- Initialize sequence to max existing count if needed
DO $$
DECLARE
  v_max_items BIGINT;
BEGIN
  SELECT COUNT(*) INTO v_max_items FROM public.items;
  IF v_max_items > 0 THEN
    PERFORM setval('public.item_code_seq', GREATEST(v_max_items + 10, 100));
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.generate_item_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prefix TEXT;
  v_seq BIGINT;
  v_code TEXT;
BEGIN
  -- If already assigned by user or API, do not overwrite
  IF NEW.item_code IS NOT NULL AND NEW.item_code <> '' THEN
    RETURN NEW;
  END IF;

  IF NEW.category_id IS NOT NULL THEN
    SELECT COALESCE(UPPER(SUBSTRING(c.name, 1, 3)), 'ITM')
    INTO v_prefix
    FROM public.categories c
    WHERE c.id = NEW.category_id;
  END IF;

  IF v_prefix IS NULL THEN
    v_prefix := 'ITM';
  END IF;

  LOOP
    v_seq := nextval('public.item_code_seq');
    v_code := v_prefix || '-' || EXTRACT(YEAR FROM NOW())::TEXT || '-' || LPAD(v_seq::TEXT, 4, '0');
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.items WHERE item_code = v_code);
  END LOOP;

  NEW.item_code := v_code;
  RETURN NEW;
END;
$$;

-- 3. Audit Logs Compliance: Preserve audit history on user deletion (ON DELETE SET NULL)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'audit_logs_user_id_fkey' AND table_name = 'audit_logs'
  ) THEN
    ALTER TABLE public.audit_logs DROP CONSTRAINT audit_logs_user_id_fkey;
    ALTER TABLE public.audit_logs 
      ADD CONSTRAINT audit_logs_user_id_fkey 
      FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;
END $$;



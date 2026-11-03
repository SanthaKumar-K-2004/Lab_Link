-- ==========================================
-- Fix Security Advisor Warnings
-- 1. Function Search Path Mutable (5 functions)
-- 2. RLS Policy Always True on qr_scan_logs
-- ==========================================

-- ==========================================
-- FIX 1: generate_ten_code - Set search_path
-- This function exists in the DB but not in migrations
-- ==========================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'generate_ten_code'
    AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  ) THEN
    ALTER FUNCTION public.generate_ten_code() SET search_path = public;
  END IF;
END $$;

-- ==========================================
-- FIX 2: check_stock_alerts - Set search_path
-- ==========================================
CREATE OR REPLACE FUNCTION public.check_stock_alerts()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check for low stock
  IF NEW.current_quantity <= NEW.reorder_threshold AND NEW.current_quantity > 0 THEN
    INSERT INTO public.stock_alerts (item_id, alert_type, message)
    VALUES (NEW.id, 'low_stock', 'Item "' || NEW.name || '" is running low. Current: ' || NEW.current_quantity)
    ON CONFLICT DO NOTHING;
  END IF;
  
  -- Check for out of stock
  IF NEW.current_quantity <= 0 THEN
    INSERT INTO public.stock_alerts (item_id, alert_type, message)
    VALUES (NEW.id, 'out_of_stock', 'Item "' || NEW.name || '" is out of stock!')
    ON CONFLICT DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

-- ==========================================
-- FIX 3: update_tally_updated_at - Set search_path
-- ==========================================
CREATE OR REPLACE FUNCTION update_tally_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ==========================================
-- FIX 4: update_user_settings_timestamp - Set search_path
-- ==========================================
CREATE OR REPLACE FUNCTION public.update_user_settings_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- ==========================================
-- FIX 5: update_damage_reports_updated_at - Set search_path
-- ==========================================
CREATE OR REPLACE FUNCTION public.update_damage_reports_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- ==========================================
-- FIX 6: RLS Policy Always True on qr_scan_logs
-- Replace overly permissive "Anon can create scan logs" policy
-- that uses WITH CHECK (true) with a more restrictive version
-- ==========================================
DROP POLICY IF EXISTS "Anon can create scan logs" ON public.qr_scan_logs;
CREATE POLICY "Anon can create scan logs"
  ON public.qr_scan_logs FOR INSERT
  TO anon
  WITH CHECK (scanned_by IS NULL);

-- ==========================================
-- DONE - Security advisor warnings fixed
-- ==========================================

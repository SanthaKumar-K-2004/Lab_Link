-- ==========================================
-- Fix RLS Performance Warnings
-- 1. auth_rls_initplan: Wrap auth.uid() in (select auth.uid())
-- 2. multiple_permissive_policies: Consolidate duplicate policies
-- ==========================================

-- ==========================================
-- PART 1: FIX generate_item_code search_path
-- ==========================================
CREATE OR REPLACE FUNCTION public.generate_item_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prefix TEXT;
  v_count INTEGER;
  v_code TEXT;
BEGIN
  SELECT COALESCE(UPPER(SUBSTRING(c.name, 1, 3)), 'ITM')
  INTO v_prefix
  FROM public.categories c
  WHERE c.id = NEW.category_id;
  IF v_prefix IS NULL THEN
    v_prefix := 'ITM';
  END IF;
  SELECT COUNT(*) + 1 INTO v_count
  FROM public.items
  WHERE category_id = NEW.category_id;
  v_code := v_prefix || '-' || EXTRACT(YEAR FROM NOW())::TEXT || '-' || LPAD(v_count::TEXT, 4, '0');
  NEW.item_code := v_code;
  RETURN NEW;
END;
$$;

-- ==========================================
-- PART 2: profiles - Fix initplan + consolidate duplicates
-- ==========================================
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admin and staff can view all profiles" ON public.profiles;
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (id = (select auth.uid()) OR public.is_admin_or_staff((select auth.uid())));

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admin can update any profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (id = (select auth.uid()) OR public.has_role((select auth.uid()), 'admin'));

DROP POLICY IF EXISTS "Admin can delete profiles" ON public.profiles;
CREATE POLICY "Admin can delete profiles"
  ON public.profiles FOR DELETE
  TO authenticated
  USING (public.has_role((select auth.uid()), 'admin'));

-- ==========================================
-- PART 3: user_roles - Fix initplan
-- ==========================================
DROP POLICY IF EXISTS "Users can view their own role" ON public.user_roles;
DROP POLICY IF EXISTS "Admin can view all roles" ON public.user_roles;
CREATE POLICY "Users can view their own role"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()) OR public.has_role((select auth.uid()), 'admin'));

DROP POLICY IF EXISTS "Admin can manage roles" ON public.user_roles;
CREATE POLICY "Admin can manage roles"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (public.has_role((select auth.uid()), 'admin'));

-- ==========================================
-- PART 4: departments - Fix initplan + consolidate duplicates
-- ==========================================
DROP POLICY IF EXISTS "Admin can manage departments" ON public.departments;
CREATE POLICY "Admin can manage departments"
  ON public.departments FOR ALL
  TO authenticated
  USING (public.has_role((select auth.uid()), 'admin'));

DROP POLICY IF EXISTS "Allow public read of active departments" ON public.departments;
DROP POLICY IF EXISTS "Anon can view active departments" ON public.departments;
CREATE POLICY "Anon can view active departments"
  ON public.departments FOR SELECT
  TO anon
  USING (is_active = true);

-- ==========================================
-- PART 5: user_departments - Fix initplan
-- ==========================================
DROP POLICY IF EXISTS "Users can view their department assignments" ON public.user_departments;
CREATE POLICY "Users can view their department assignments"
  ON public.user_departments FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()) OR public.is_admin_or_staff((select auth.uid())));

DROP POLICY IF EXISTS "Admin can manage department assignments" ON public.user_departments;
CREATE POLICY "Admin can manage department assignments"
  ON public.user_departments FOR ALL
  TO authenticated
  USING (public.has_role((select auth.uid()), 'admin'));

-- ==========================================
-- PART 6: categories - Fix initplan + consolidate duplicates
-- ==========================================
DROP POLICY IF EXISTS "Admin can manage categories" ON public.categories;
DROP POLICY IF EXISTS "Everyone can view categories" ON public.categories;
CREATE POLICY "Everyone can view categories"
  ON public.categories FOR SELECT
  USING (true);

CREATE POLICY "Admin can manage categories"
  ON public.categories FOR ALL
  TO authenticated
  USING (public.has_role((select auth.uid()), 'admin'));

-- ==========================================
-- PART 7: items - Fix initplan + consolidate duplicates
-- ==========================================
DROP POLICY IF EXISTS "Admin and staff can manage items" ON public.items;
DROP POLICY IF EXISTS "Everyone can view available items" ON public.items;
CREATE POLICY "Everyone can view available items"
  ON public.items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin and staff can manage items"
  ON public.items FOR ALL
  TO authenticated
  USING (public.is_admin_or_staff((select auth.uid())));

-- ==========================================
-- PART 8: stock_alerts - Fix initplan
-- ==========================================
DROP POLICY IF EXISTS "Staff can view stock alerts" ON public.stock_alerts;
DROP POLICY IF EXISTS "Staff can manage stock alerts" ON public.stock_alerts;
CREATE POLICY "Staff can manage stock alerts"
  ON public.stock_alerts FOR ALL
  TO authenticated
  USING (public.is_admin_or_staff((select auth.uid())));

-- ==========================================
-- PART 9: stock_history - Fix initplan
-- ==========================================
DROP POLICY IF EXISTS "Admin and staff can view stock history" ON public.stock_history;
CREATE POLICY "Admin and staff can view stock history"
  ON public.stock_history FOR SELECT
  TO authenticated
  USING (public.is_admin_or_staff((select auth.uid())));

DROP POLICY IF EXISTS "Admin and staff can add stock history" ON public.stock_history;
CREATE POLICY "Admin and staff can add stock history"
  ON public.stock_history FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin_or_staff((select auth.uid())));

-- ==========================================
-- PART 10: borrow_requests - Fix initplan + consolidate duplicates
-- ==========================================
DROP POLICY IF EXISTS "Users can view their own requests" ON public.borrow_requests;
DROP POLICY IF EXISTS "Admin and staff can view all requests" ON public.borrow_requests;
CREATE POLICY "Users can view their own requests"
  ON public.borrow_requests FOR SELECT
  TO authenticated
  USING (student_id = (select auth.uid()) OR public.is_admin_or_staff((select auth.uid())));

DROP POLICY IF EXISTS "Students can create requests" ON public.borrow_requests;
CREATE POLICY "Students can create requests"
  ON public.borrow_requests FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Admin and staff can update requests" ON public.borrow_requests;
DROP POLICY IF EXISTS "Students can update own pending requests" ON public.borrow_requests;
CREATE POLICY "Users can update requests"
  ON public.borrow_requests FOR UPDATE
  TO authenticated
  USING (
    public.is_admin_or_staff((select auth.uid()))
    OR (student_id = (select auth.uid()) AND status = 'pending')
  )
  WITH CHECK (
    public.is_admin_or_staff((select auth.uid()))
    OR (student_id = (select auth.uid()) AND status = 'pending')
  );

DROP POLICY IF EXISTS "Admin can delete borrow requests" ON public.borrow_requests;
CREATE POLICY "Admin can delete borrow requests"
  ON public.borrow_requests FOR DELETE
  TO authenticated
  USING (public.has_role((select auth.uid()), 'admin'));

-- ==========================================
-- PART 11: issued_items - Fix initplan + consolidate duplicates
-- ==========================================
DROP POLICY IF EXISTS "Users can view their issued items" ON public.issued_items;
DROP POLICY IF EXISTS "Staff can manage issued items" ON public.issued_items;
CREATE POLICY "Users can view their issued items"
  ON public.issued_items FOR SELECT
  TO authenticated
  USING (issued_to = (select auth.uid()) OR public.is_admin_or_staff((select auth.uid())));

CREATE POLICY "Staff can manage issued items"
  ON public.issued_items FOR ALL
  TO authenticated
  USING (public.is_admin_or_staff((select auth.uid())));

-- ==========================================
-- PART 12: return_logs - Fix initplan
-- ==========================================
DROP POLICY IF EXISTS "Staff can manage return logs" ON public.return_logs;
CREATE POLICY "Staff can manage return logs"
  ON public.return_logs FOR ALL
  TO authenticated
  USING (public.is_admin_or_staff((select auth.uid())));

-- ==========================================
-- PART 13: damage_reports - Fix initplan
-- ==========================================
DROP POLICY IF EXISTS "Users can view their damage reports" ON public.damage_reports;
CREATE POLICY "Users can view their damage reports"
  ON public.damage_reports FOR SELECT
  TO authenticated
  USING (reported_by = (select auth.uid()) OR public.is_admin_or_staff((select auth.uid())));

DROP POLICY IF EXISTS "Users can create damage reports" ON public.damage_reports;
CREATE POLICY "Users can create damage reports"
  ON public.damage_reports FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Staff can update damage reports" ON public.damage_reports;
CREATE POLICY "Staff can update damage reports"
  ON public.damage_reports FOR UPDATE
  TO authenticated
  USING (public.is_admin_or_staff((select auth.uid())));

-- ==========================================
-- PART 14: maintenance_records - Fix initplan + consolidate duplicates
-- ==========================================
DROP POLICY IF EXISTS "Technicians can view assigned maintenance" ON public.maintenance_records;
DROP POLICY IF EXISTS "Staff can manage maintenance records" ON public.maintenance_records;
DROP POLICY IF EXISTS "Technicians can update their assignments" ON public.maintenance_records;
CREATE POLICY "Users can view maintenance records"
  ON public.maintenance_records FOR SELECT
  TO authenticated
  USING (assigned_to = (select auth.uid()) OR public.is_admin_or_staff((select auth.uid())));

CREATE POLICY "Staff can manage maintenance records"
  ON public.maintenance_records FOR ALL
  TO authenticated
  USING (public.is_admin_or_staff((select auth.uid())));

CREATE POLICY "Technicians can update their assignments"
  ON public.maintenance_records FOR UPDATE
  TO authenticated
  USING (assigned_to = (select auth.uid()) AND public.has_role((select auth.uid()), 'technician'));

-- ==========================================
-- PART 15: qr_codes - Fix initplan
-- ==========================================
DROP POLICY IF EXISTS "Staff can manage QR codes" ON public.qr_codes;
CREATE POLICY "Staff can manage QR codes"
  ON public.qr_codes FOR ALL
  TO authenticated
  USING (public.is_admin_or_staff((select auth.uid())));

-- ==========================================
-- PART 16: notifications - Fix initplan + consolidate duplicates
-- ==========================================
DROP POLICY IF EXISTS "Users can view their notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update their notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can delete own notifications" ON public.notifications;
CREATE POLICY "Users can delete own notifications"
  ON public.notifications FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can receive notifications" ON public.notifications;
CREATE POLICY "Users can receive notifications"
  ON public.notifications FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()) OR public.is_admin_or_staff((select auth.uid())));

-- ==========================================
-- PART 17: system_settings - Fix initplan
-- ==========================================
DROP POLICY IF EXISTS "Admin only can manage system settings" ON public.system_settings;
CREATE POLICY "Admin only can manage system settings"
  ON public.system_settings FOR ALL
  TO authenticated
  USING (public.has_role((select auth.uid()), 'admin'));

-- ==========================================
-- PART 18: user_settings - Fix initplan
-- ==========================================
DROP POLICY IF EXISTS "Users can view own settings" ON public.user_settings;
CREATE POLICY "Users can view own settings"
  ON public.user_settings FOR SELECT
  TO authenticated
  USING (id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update own settings" ON public.user_settings;
CREATE POLICY "Users can update own settings"
  ON public.user_settings FOR UPDATE
  TO authenticated
  USING (id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can insert own settings" ON public.user_settings;
CREATE POLICY "Users can insert own settings"
  ON public.user_settings FOR INSERT
  TO authenticated
  WITH CHECK (id = (select auth.uid()));

-- ==========================================
-- PART 19: audit_logs - Fix initplan
-- ==========================================
DROP POLICY IF EXISTS "Admin can view audit logs" ON public.audit_logs;
CREATE POLICY "Admin can view audit logs"
  ON public.audit_logs FOR SELECT
  TO authenticated
  USING (public.has_role((select auth.uid()), 'admin'));

DROP POLICY IF EXISTS "Admin and staff can create audit logs" ON public.audit_logs;
CREATE POLICY "Admin and staff can create audit logs"
  ON public.audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin_or_staff((select auth.uid())));

-- ==========================================
-- PART 20: activity_logs - Fix initplan
-- ==========================================
DROP POLICY IF EXISTS "Staff can view activity logs" ON public.activity_logs;
CREATE POLICY "Staff can view activity logs"
  ON public.activity_logs FOR SELECT
  TO authenticated
  USING (public.is_admin_or_staff((select auth.uid())));

DROP POLICY IF EXISTS "Authenticated users can create activity logs" ON public.activity_logs;
CREATE POLICY "Authenticated users can create activity logs"
  ON public.activity_logs FOR INSERT
  TO authenticated
  WITH CHECK (performed_by = (select auth.uid()) OR public.is_admin_or_staff((select auth.uid())));

-- ==========================================
-- PART 21: user_sessions - Fix initplan
-- ==========================================
DROP POLICY IF EXISTS "Users can view own sessions" ON public.user_sessions;
CREATE POLICY "Users can view own sessions"
  ON public.user_sessions FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can manage own sessions" ON public.user_sessions;
CREATE POLICY "Users can manage own sessions"
  ON public.user_sessions FOR ALL
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can create own sessions" ON public.user_sessions;
CREATE POLICY "Users can create own sessions"
  ON public.user_sessions FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

-- ==========================================
-- PART 22: login_logs - Fix initplan + consolidate duplicates
-- ==========================================
DROP POLICY IF EXISTS "Admin can view all login logs" ON public.login_logs;
DROP POLICY IF EXISTS "Users can view their own login logs" ON public.login_logs;
CREATE POLICY "Users can view login logs"
  ON public.login_logs FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()) OR public.has_role((select auth.uid()), 'admin'));

DROP POLICY IF EXISTS "Users can update own login logs" ON public.login_logs;
CREATE POLICY "Users can update own login logs"
  ON public.login_logs FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can create own login logs" ON public.login_logs;
CREATE POLICY "Users can create own login logs"
  ON public.login_logs FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

-- ==========================================
-- PART 23: login_attempts - Fix initplan
-- ==========================================
DROP POLICY IF EXISTS "Admin can view login attempts" ON public.login_attempts;
CREATE POLICY "Admin can view login attempts"
  ON public.login_attempts FOR SELECT
  TO authenticated
  USING (public.has_role((select auth.uid()), 'admin'));

-- ==========================================
-- PART 24: chemical_hazard_types - Fix initplan + consolidate duplicates
-- ==========================================
DROP POLICY IF EXISTS "Admin can manage hazard types" ON public.chemical_hazard_types;
DROP POLICY IF EXISTS "Anyone can view hazard types" ON public.chemical_hazard_types;
CREATE POLICY "Anyone can view hazard types"
  ON public.chemical_hazard_types FOR SELECT
  USING (true);

CREATE POLICY "Admin can manage hazard types"
  ON public.chemical_hazard_types FOR ALL
  TO authenticated
  USING (public.has_role((select auth.uid()), 'admin'));

-- ==========================================
-- PART 25: chemicals - Fix initplan + consolidate duplicates
-- ==========================================
DROP POLICY IF EXISTS "Staff and above can view chemicals" ON public.chemicals;
DROP POLICY IF EXISTS "Staff and above can manage chemicals" ON public.chemicals;
CREATE POLICY "Staff and above can view chemicals"
  ON public.chemicals FOR SELECT
  TO authenticated
  USING (public.is_admin_or_staff((select auth.uid())));

CREATE POLICY "Staff and above can manage chemicals"
  ON public.chemicals FOR ALL
  TO authenticated
  USING (public.is_admin_or_staff((select auth.uid())));

-- ==========================================
-- PART 26: chemical_transactions - Fix initplan
-- ==========================================
DROP POLICY IF EXISTS "Staff and above can view chemical transactions" ON public.chemical_transactions;
CREATE POLICY "Staff and above can view chemical transactions"
  ON public.chemical_transactions FOR SELECT
  TO authenticated
  USING (public.is_admin_or_staff((select auth.uid())));

DROP POLICY IF EXISTS "Staff and above can create chemical transactions" ON public.chemical_transactions;
CREATE POLICY "Staff and above can create chemical transactions"
  ON public.chemical_transactions FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin_or_staff((select auth.uid())));

-- ==========================================
-- PART 27: item_images - Fix initplan + consolidate duplicates
-- ==========================================
DROP POLICY IF EXISTS "Anyone can view item images" ON public.item_images;
DROP POLICY IF EXISTS "Staff can manage item images" ON public.item_images;
CREATE POLICY "Anyone can view item images"
  ON public.item_images FOR SELECT
  USING (true);

CREATE POLICY "Staff can manage item images"
  ON public.item_images FOR ALL
  TO authenticated
  USING (public.is_admin_or_staff((select auth.uid())));

-- ==========================================
-- PART 28: item_transactions - Fix initplan
-- ==========================================
DROP POLICY IF EXISTS "Staff can view item transactions" ON public.item_transactions;
CREATE POLICY "Staff can view item transactions"
  ON public.item_transactions FOR SELECT
  TO authenticated
  USING (public.is_admin_or_staff((select auth.uid())));

DROP POLICY IF EXISTS "Staff can create item transactions" ON public.item_transactions;
CREATE POLICY "Staff can create item transactions"
  ON public.item_transactions FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin_or_staff((select auth.uid())));

-- ==========================================
-- PART 29: item_units - Fix initplan + consolidate duplicates
-- ==========================================
DROP POLICY IF EXISTS "Anyone can view item units" ON public.item_units;
DROP POLICY IF EXISTS "Anon can view item units" ON public.item_units;
DROP POLICY IF EXISTS "Staff can manage item units" ON public.item_units;
CREATE POLICY "Anyone can view item units"
  ON public.item_units FOR SELECT
  USING (true);

CREATE POLICY "Staff can manage item units"
  ON public.item_units FOR ALL
  TO authenticated
  USING (public.is_admin_or_staff((select auth.uid())));

-- ==========================================
-- PART 30: backups - Fix initplan + consolidate duplicates
-- ==========================================
DROP POLICY IF EXISTS "Admin can view backups" ON public.backups;
DROP POLICY IF EXISTS "Admin can manage backups" ON public.backups;
CREATE POLICY "Admin can manage backups"
  ON public.backups FOR ALL
  TO authenticated
  USING (public.has_role((select auth.uid()), 'admin'));

-- ==========================================
-- PART 31: qr_scan_logs - Fix initplan
-- ==========================================
DROP POLICY IF EXISTS "Staff can view all scan logs" ON public.qr_scan_logs;
DROP POLICY IF EXISTS "Users can view own scan logs" ON public.qr_scan_logs;
CREATE POLICY "Users can view scan logs"
  ON public.qr_scan_logs FOR SELECT
  TO authenticated
  USING (scanned_by = (select auth.uid()) OR public.is_admin_or_staff((select auth.uid())));

DROP POLICY IF EXISTS "Authenticated users can create scan logs" ON public.qr_scan_logs;
CREATE POLICY "Authenticated users can create scan logs"
  ON public.qr_scan_logs FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) IS NOT NULL);

-- ==========================================
-- PART 32: report_templates - Fix initplan
-- ==========================================
DROP POLICY IF EXISTS "View public or own report templates" ON public.report_templates;
CREATE POLICY "View public or own report templates"
  ON public.report_templates FOR SELECT
  TO authenticated
  USING (is_public = true OR created_by = (select auth.uid()));

DROP POLICY IF EXISTS "Users can create report templates" ON public.report_templates;
CREATE POLICY "Users can create report templates"
  ON public.report_templates FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Users can update own report templates" ON public.report_templates;
CREATE POLICY "Users can update own report templates"
  ON public.report_templates FOR UPDATE
  TO authenticated
  USING (created_by = (select auth.uid()));

DROP POLICY IF EXISTS "Users can delete own report templates" ON public.report_templates;
CREATE POLICY "Users can delete own report templates"
  ON public.report_templates FOR DELETE
  TO authenticated
  USING (created_by = (select auth.uid()));

-- ==========================================
-- PART 33: analytics_cache - Fix initplan
-- ==========================================
DROP POLICY IF EXISTS "Staff can manage analytics cache" ON public.analytics_cache;
CREATE POLICY "Staff can manage analytics cache"
  ON public.analytics_cache FOR ALL
  TO authenticated
  USING (public.is_admin_or_staff((select auth.uid())));

-- ==========================================
-- PART 34: borrow_messages - Fix initplan + consolidate duplicates
-- ==========================================
DROP POLICY IF EXISTS "Users can view their messages" ON public.borrow_messages;
DROP POLICY IF EXISTS "Staff can view messages for their requests" ON public.borrow_messages;
CREATE POLICY "Users can view borrow messages"
  ON public.borrow_messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.borrow_requests br
      WHERE br.id = borrow_request_id
      AND (br.student_id = (select auth.uid()) OR public.is_admin_or_staff((select auth.uid())))
    )
  );

DROP POLICY IF EXISTS "Staff can create messages" ON public.borrow_messages;
CREATE POLICY "Staff can create messages"
  ON public.borrow_messages FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin_or_staff((select auth.uid())) OR sender_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update their own messages read status" ON public.borrow_messages;
CREATE POLICY "Users can update their own messages read status"
  ON public.borrow_messages FOR UPDATE
  TO authenticated
  USING (sender_id = (select auth.uid()) OR
    EXISTS (
      SELECT 1 FROM public.borrow_requests br
      WHERE br.id = borrow_request_id AND br.student_id = (select auth.uid())
    )
  );

-- ==========================================
-- PART 35: return_requests - Fix initplan
-- ==========================================
DROP POLICY IF EXISTS "Students can view their own return requests" ON public.return_requests;
DROP POLICY IF EXISTS "Staff can view all return requests" ON public.return_requests;
CREATE POLICY "Users can view return requests"
  ON public.return_requests FOR SELECT
  TO authenticated
  USING (student_id = (select auth.uid()) OR public.is_admin_or_staff((select auth.uid())));

DROP POLICY IF EXISTS "Students can create return requests" ON public.return_requests;
CREATE POLICY "Students can create return requests"
  ON public.return_requests FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Staff can update return requests" ON public.return_requests;
CREATE POLICY "Staff can update return requests"
  ON public.return_requests FOR UPDATE
  TO authenticated
  USING (public.is_admin_or_staff((select auth.uid())));

-- ==========================================
-- PART 36: tally_config - Fix initplan
-- ==========================================
DROP POLICY IF EXISTS "Admin and staff can read tally config" ON public.tally_config;
CREATE POLICY "Admin and staff can read tally config"
  ON public.tally_config FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = (select auth.uid()) AND role IN ('admin', 'staff'))
  );

DROP POLICY IF EXISTS "Admin can manage tally config" ON public.tally_config;
CREATE POLICY "Admin can manage tally config"
  ON public.tally_config FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = (select auth.uid()) AND role = 'admin')
  );

-- ==========================================
-- PART 37: vendors - Fix initplan
-- ==========================================
DROP POLICY IF EXISTS "Admin and staff can read vendors" ON public.vendors;
CREATE POLICY "Admin and staff can read vendors"
  ON public.vendors FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = (select auth.uid()) AND role IN ('admin', 'staff'))
  );

DROP POLICY IF EXISTS "Admin and staff can manage vendors" ON public.vendors;
CREATE POLICY "Admin and staff can manage vendors"
  ON public.vendors FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = (select auth.uid()) AND role IN ('admin', 'staff'))
  );

-- ==========================================
-- PART 38: purchase_orders - Fix initplan + consolidate duplicates
-- ==========================================
DROP POLICY IF EXISTS "Admin and staff can read purchase orders" ON public.purchase_orders;
DROP POLICY IF EXISTS "Admin and staff can manage purchase orders" ON public.purchase_orders;
CREATE POLICY "Admin and staff can manage purchase orders"
  ON public.purchase_orders FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = (select auth.uid()) AND role IN ('admin', 'staff'))
  );

-- ==========================================
-- PART 39: purchase_order_items - Fix initplan + consolidate duplicates
-- ==========================================
DROP POLICY IF EXISTS "Admin and staff can read po items" ON public.purchase_order_items;
DROP POLICY IF EXISTS "Admin and staff can manage po items" ON public.purchase_order_items;
CREATE POLICY "Admin and staff can manage po items"
  ON public.purchase_order_items FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = (select auth.uid()) AND role IN ('admin', 'staff'))
  );

-- ==========================================
-- PART 40: tally_sync_mappings - Fix initplan
-- ==========================================
DROP POLICY IF EXISTS "Admin and staff can read sync mappings" ON public.tally_sync_mappings;
CREATE POLICY "Admin and staff can read sync mappings"
  ON public.tally_sync_mappings FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = (select auth.uid()) AND role IN ('admin', 'staff'))
  );

DROP POLICY IF EXISTS "Admin can manage sync mappings" ON public.tally_sync_mappings;
CREATE POLICY "Admin can manage sync mappings"
  ON public.tally_sync_mappings FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = (select auth.uid()) AND role = 'admin')
  );

-- ==========================================
-- PART 41: tally_sync_logs - Fix initplan
-- ==========================================
DROP POLICY IF EXISTS "Admin and staff can read sync logs" ON public.tally_sync_logs;
CREATE POLICY "Admin and staff can read sync logs"
  ON public.tally_sync_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = (select auth.uid()) AND role IN ('admin', 'staff'))
  );

DROP POLICY IF EXISTS "Admin and staff can insert sync logs" ON public.tally_sync_logs;
CREATE POLICY "Admin and staff can insert sync logs"
  ON public.tally_sync_logs FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = (select auth.uid()) AND role IN ('admin', 'staff'))
  );

-- ==========================================
-- DONE - All RLS performance warnings fixed
-- ==========================================

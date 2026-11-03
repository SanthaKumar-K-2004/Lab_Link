-- Create the sso_trusted_domains table for SSO Domain Whitelist feature
CREATE TABLE IF NOT EXISTS public.sso_trusted_domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain TEXT NOT NULL UNIQUE,
  auto_role TEXT NOT NULL DEFAULT 'student',
  is_active BOOLEAN NOT NULL DEFAULT true,
  auto_approve BOOLEAN NOT NULL DEFAULT false,
  preferred_provider TEXT DEFAULT NULL,
  notes TEXT DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sso_trusted_domains ENABLE ROW LEVEL SECURITY;

-- Only admins can manage trusted domains
CREATE POLICY "Admins can manage sso_trusted_domains"
  ON public.sso_trusted_domains
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Allow authenticated users to read active trusted domains (for registration auto-verify)
CREATE POLICY "Authenticated users can read active sso_trusted_domains"
  ON public.sso_trusted_domains
  FOR SELECT
  TO authenticated
  USING (is_active = true);

DROP POLICY IF EXISTS "Anyone can read sa_app_config" ON public.sa_app_config;

CREATE POLICY "Public can read non-sensitive config"
  ON public.sa_app_config
  FOR SELECT
  TO public
  USING (key NOT IN ('admin_emails'));
-- Add sign_up_enabled setting to the settings table
INSERT INTO public.settings (key, value) VALUES 
  ('sign_up_enabled', '{"enabled": true}')
ON CONFLICT (key) DO NOTHING;

-- Add IP address and MAC address fields to activity_logs table
ALTER TABLE public.activity_logs 
ADD COLUMN ip_address INET,
ADD COLUMN mac_address TEXT,
ADD COLUMN user_agent TEXT,
ADD COLUMN device_info JSONB;

-- Create function to get client IP address
CREATE OR REPLACE FUNCTION public.get_client_ip()
RETURNS INET AS $$
BEGIN
  -- Try to get IP from various headers
  RETURN COALESCE(
    inet(current_setting('request.headers.x-forwarded-for', true)),
    inet(current_setting('request.headers.x-real-ip', true)),
    inet(current_setting('request.headers.cf-connecting-ip', true)),
    inet(current_setting('request.headers.x-client-ip', true)),
    inet(current_setting('request.headers.x-forwarded', true)),
    inet(current_setting('request.headers.forwarded-for', true)),
    inet(current_setting('request.headers.forwarded', true))
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create function to log user login activity
CREATE OR REPLACE FUNCTION public.log_user_login(
  p_user_id UUID,
  p_action TEXT DEFAULT 'user_login',
  p_details JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  log_id UUID;
  client_ip INET;
  user_agent_text TEXT;
BEGIN
  -- Get client IP
  client_ip := public.get_client_ip();
  
  -- Get user agent
  user_agent_text := current_setting('request.headers.user-agent', true);
  
  -- Insert login activity log
  INSERT INTO public.activity_logs (
    user_id, 
    action, 
    details, 
    ip_address, 
    user_agent,
    device_info
  )
  VALUES (
    p_user_id,
    p_action,
    COALESCE(p_details, '{}'::jsonb) || jsonb_build_object(
      'login_time', NOW(),
      'session_id', gen_random_uuid()
    ),
    client_ip,
    user_agent_text,
    jsonb_build_object(
      'browser', CASE 
        WHEN user_agent_text ILIKE '%chrome%' THEN 'Chrome'
        WHEN user_agent_text ILIKE '%firefox%' THEN 'Firefox'
        WHEN user_agent_text ILIKE '%safari%' THEN 'Safari'
        WHEN user_agent_text ILIKE '%edge%' THEN 'Edge'
        ELSE 'Unknown'
      END,
      'os', CASE
        WHEN user_agent_text ILIKE '%windows%' THEN 'Windows'
        WHEN user_agent_text ILIKE '%mac%' THEN 'macOS'
        WHEN user_agent_text ILIKE '%linux%' THEN 'Linux'
        WHEN user_agent_text ILIKE '%android%' THEN 'Android'
        WHEN user_agent_text ILIKE '%ios%' THEN 'iOS'
        ELSE 'Unknown'
      END,
      'device_type', CASE
        WHEN user_agent_text ILIKE '%mobile%' OR user_agent_text ILIKE '%android%' OR user_agent_text ILIKE '%iphone%' THEN 'Mobile'
        WHEN user_agent_text ILIKE '%tablet%' OR user_agent_text ILIKE '%ipad%' THEN 'Tablet'
        ELSE 'Desktop'
      END
    )
  )
  RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to log user logout activity
CREATE OR REPLACE FUNCTION public.log_user_logout(
  p_user_id UUID,
  p_session_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  log_id UUID;
  client_ip INET;
BEGIN
  -- Get client IP
  client_ip := public.get_client_ip();
  
  -- Insert logout activity log
  INSERT INTO public.activity_logs (
    user_id, 
    action, 
    details, 
    ip_address
  )
  VALUES (
    p_user_id,
    'user_logout',
    jsonb_build_object(
      'logout_time', NOW(),
      'session_id', p_session_id
    ),
    client_ip
  )
  RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the existing log_activity function to include IP address
CREATE OR REPLACE FUNCTION public.log_activity()
RETURNS TRIGGER AS $$
DECLARE
  client_ip INET;
BEGIN
  -- Get client IP
  client_ip := public.get_client_ip();
  
  INSERT INTO public.activity_logs (user_id, action, details, ip_address)
  VALUES (
    NEW.registered_by,
    CASE TG_OP
      WHEN 'INSERT' THEN 'registration_created'
      WHEN 'UPDATE' THEN 'registration_updated'
      WHEN 'DELETE' THEN 'registration_deleted'
    END,
    jsonb_build_object(
      'table_name', TG_TABLE_NAME,
      'operation', TG_OP,
      'record_id', COALESCE(NEW.id, OLD.id)
    ),
    client_ip
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

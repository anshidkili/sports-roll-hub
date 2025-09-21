-- Create enums for user roles and years
CREATE TYPE public.user_role AS ENUM ('admin', 'first_year_coordinator', 'second_year_coordinator', 'third_year_coordinator', 'fourth_year_coordinator');
CREATE TYPE public.academic_year AS ENUM ('first', 'second', 'third', 'fourth');
CREATE TYPE public.sport_type AS ENUM ('game', 'athletic');
CREATE TYPE public.registration_status AS ENUM ('pending', 'approved', 'rejected');

-- Create profiles table for user management
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role user_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create students table
CREATE TABLE public.students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  roll_number TEXT UNIQUE NOT NULL,
  department TEXT NOT NULL,
  year academic_year NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create sports table
CREATE TABLE public.sports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type sport_type NOT NULL,
  description TEXT,
  max_participants INTEGER,
  registration_deadline TIMESTAMP WITH TIME ZONE,
  event_date TIMESTAMP WITH TIME ZONE,
  venue TEXT,
  created_by UUID REFERENCES public.profiles(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create registrations table
CREATE TABLE public.registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE NOT NULL,
  sport_id UUID REFERENCES public.sports(id) ON DELETE CASCADE NOT NULL,
  registered_by UUID REFERENCES public.profiles(id),
  status registration_status DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(student_id, sport_id)
);

-- Create activity logs table
CREATE TABLE public.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id),
  action TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create settings table for registration limits
CREATE TABLE public.settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL,
  updated_by UUID REFERENCES public.profiles(id),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default settings
INSERT INTO public.settings (key, value) VALUES 
  ('max_game_registrations', '{"limit": 2}'),
  ('max_athletic_registrations', '{"limit": 2}');

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for timestamp updates
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_students_updated_at BEFORE UPDATE ON public.students
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sports_updated_at BEFORE UPDATE ON public.sports
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_registrations_updated_at BEFORE UPDATE ON public.registrations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to log activities
CREATE OR REPLACE FUNCTION public.log_activity()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.activity_logs (user_id, action, details)
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
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for activity logging
CREATE TRIGGER log_registration_activity
  AFTER INSERT OR UPDATE OR DELETE ON public.registrations
  FOR EACH ROW EXECUTE FUNCTION public.log_activity();

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Admin can view all profiles"
  ON public.profiles FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid() AND role = 'admin'
  ));

-- Students policies
CREATE POLICY "Admin can manage all students"
  ON public.students FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid() AND role = 'admin'
  ));

CREATE POLICY "Coordinators can view students of their year"
  ON public.students FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid() AND (
      (p.role = 'first_year_coordinator' AND year = 'first') OR
      (p.role = 'second_year_coordinator' AND year = 'second') OR
      (p.role = 'third_year_coordinator' AND year = 'third') OR
      (p.role = 'fourth_year_coordinator' AND year = 'fourth')
    )
  ));

-- Sports policies
CREATE POLICY "Everyone can view active sports"
  ON public.sports FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admin can manage all sports"
  ON public.sports FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid() AND role = 'admin'
  ));

-- Registrations policies
CREATE POLICY "Admin can view all registrations"
  ON public.registrations FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid() AND role = 'admin'
  ));

CREATE POLICY "Coordinators can manage registrations for their year students"
  ON public.registrations FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.profiles p, public.students s
    WHERE p.user_id = auth.uid() 
    AND s.id = student_id
    AND (
      (p.role = 'first_year_coordinator' AND s.year = 'first') OR
      (p.role = 'second_year_coordinator' AND s.year = 'second') OR
      (p.role = 'third_year_coordinator' AND s.year = 'third') OR
      (p.role = 'fourth_year_coordinator' AND s.year = 'fourth') OR
      p.role = 'admin'
    )
  ));

-- Activity logs policies
CREATE POLICY "Admin can view all activity logs"
  ON public.activity_logs FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid() AND role = 'admin'
  ));

CREATE POLICY "Users can view their own activity logs"
  ON public.activity_logs FOR SELECT
  USING (user_id IN (
    SELECT id FROM public.profiles WHERE user_id = auth.uid()
  ));

CREATE POLICY "System can insert activity logs"
  ON public.activity_logs FOR INSERT
  WITH CHECK (true);

-- Settings policies
CREATE POLICY "Admin can manage settings"
  ON public.settings FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid() AND role = 'admin'
  ));

CREATE POLICY "Everyone can view settings"
  ON public.settings FOR SELECT
  USING (true);

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'first_year_coordinator')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
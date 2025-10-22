-- Reset all data
DELETE FROM public.guests;
DELETE FROM public.admin_face_auth;
DELETE FROM public.user_roles;

-- Drop and recreate user_roles table with new structure
DROP TABLE IF EXISTS public.user_roles CASCADE;

CREATE TABLE public.user_roles (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE,
  email text,
  username text,
  role app_role NOT NULL,
  approved boolean DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_roles
CREATE POLICY "Admins can view all user roles"
  ON public.user_roles
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin') OR auth.uid() = user_id);

CREATE POLICY "Users can view their own role"
  ON public.user_roles
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Only system can insert roles"
  ON public.user_roles
  FOR INSERT
  WITH CHECK (false);

CREATE POLICY "Admins can update user approvals"
  ON public.user_roles
  FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can update roles"
  ON public.user_roles
  FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can delete roles"
  ON public.user_roles
  FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- Update handle_new_user function to support both admin and staff
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if it's an admin signup (has email)
  IF NEW.email IS NOT NULL AND NEW.email != '' THEN
    INSERT INTO public.user_roles (user_id, role, approved, email)
    VALUES (NEW.id, 'admin', false, NEW.email);
  ELSE
    -- Staff signup (username from metadata)
    INSERT INTO public.user_roles (user_id, role, approved, username)
    VALUES (NEW.id, 'staff', false, NEW.raw_user_meta_data->>'username');
  END IF;
  
  RETURN NEW;
END;
$$;

-- Recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
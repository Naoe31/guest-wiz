-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'staff');

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create function to get user role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- RLS policies for user_roles table
CREATE POLICY "Users can view their own role"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles"
ON public.user_roles
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Update guests table RLS policies
DROP POLICY IF EXISTS "Allow authenticated users to delete guests" ON public.guests;
DROP POLICY IF EXISTS "Allow authenticated users to insert guests" ON public.guests;
DROP POLICY IF EXISTS "Allow authenticated users to update guests" ON public.guests;

-- All authenticated users can read guests
CREATE POLICY "All authenticated users can read guests"
ON public.guests
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Only admins can insert guests
CREATE POLICY "Only admins can insert guests"
ON public.guests
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Only admins can delete guests
CREATE POLICY "Only admins can delete guests"
ON public.guests
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- Admins can update everything, staff can only update checked_in and checked_in_at
CREATE POLICY "Admins can update all guest fields"
ON public.guests
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Staff can update check-in status"
ON public.guests
FOR UPDATE
USING (
  public.has_role(auth.uid(), 'staff') 
  AND checked_in = false
)
WITH CHECK (
  public.has_role(auth.uid(), 'staff')
  AND checked_in = true
);

-- Function to automatically assign admin role to first user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_count INTEGER;
BEGIN
  -- Count existing users with roles
  SELECT COUNT(*) INTO user_count FROM public.user_roles;
  
  -- If this is the first user, make them admin, otherwise staff
  IF user_count = 0 THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin');
  ELSE
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'staff');
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger to assign role on user creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
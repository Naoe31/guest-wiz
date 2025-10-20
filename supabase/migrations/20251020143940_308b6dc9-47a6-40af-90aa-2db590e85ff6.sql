-- Add email column to user_roles table
ALTER TABLE public.user_roles
ADD COLUMN email TEXT;

-- Update the trigger to store email
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
  
  -- If this is the first user, make them admin and auto-approve
  IF user_count = 0 THEN
    INSERT INTO public.user_roles (user_id, role, approved, email)
    VALUES (NEW.id, 'admin', true, NEW.email);
  ELSE
    -- All new users are staff but need approval
    INSERT INTO public.user_roles (user_id, role, approved, email)
    VALUES (NEW.id, 'staff', false, NEW.email);
  END IF;
  
  RETURN NEW;
END;
$$;

-- Update existing records with emails (will be NULL but that's ok)
-- In production, existing users would need to re-authenticate or have their emails manually added
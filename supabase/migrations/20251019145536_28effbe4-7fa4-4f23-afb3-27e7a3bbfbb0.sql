-- Add approved column to user_roles
ALTER TABLE public.user_roles
ADD COLUMN approved BOOLEAN DEFAULT false;

-- Update existing users to be approved
UPDATE public.user_roles
SET approved = true;

-- Update the trigger function to handle approval
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
    INSERT INTO public.user_roles (user_id, role, approved)
    VALUES (NEW.id, 'admin', true);
  ELSE
    -- All new users are staff but need approval
    INSERT INTO public.user_roles (user_id, role, approved)
    VALUES (NEW.id, 'staff', false);
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create function to check if user is approved
CREATE OR REPLACE FUNCTION public.is_user_approved(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT approved
  FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- Update RLS policy for admins to manage user approvals
CREATE POLICY "Admins can view all user roles"
ON public.user_roles
FOR SELECT
USING (
  public.has_role(auth.uid(), 'admin')
  OR auth.uid() = user_id
);

CREATE POLICY "Admins can update user approvals"
ON public.user_roles
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));
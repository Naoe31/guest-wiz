-- Drop existing trigger first
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Update the handle_new_user function to only make naoe31.dev@proton.me admin
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Only naoe31.dev@proton.me can be admin and is auto-approved
  IF NEW.email = 'naoe31.dev@proton.me' THEN
    INSERT INTO public.user_roles (user_id, role, approved, email)
    VALUES (NEW.id, 'admin', true, NEW.email);
  ELSE
    -- All other users are staff and need approval
    INSERT INTO public.user_roles (user_id, role, approved, email)
    VALUES (NEW.id, 'staff', false, NEW.email);
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Drop the overly broad ALL policy
DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;

-- Add explicit INSERT policy that only allows the trigger function (no direct user inserts)
CREATE POLICY "Only system can insert roles"
ON public.user_roles
FOR INSERT
WITH CHECK (false);

-- Add explicit UPDATE policy for admins only
CREATE POLICY "Only admins can update roles"
ON public.user_roles
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add explicit DELETE policy for admins only
CREATE POLICY "Only admins can delete roles"
ON public.user_roles
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));
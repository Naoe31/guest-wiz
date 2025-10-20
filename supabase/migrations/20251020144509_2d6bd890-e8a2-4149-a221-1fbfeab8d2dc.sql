-- Remove email and phone columns from guests table
ALTER TABLE public.guests
DROP COLUMN IF EXISTS email,
DROP COLUMN IF EXISTS phone;

-- Fix RLS policies - remove overly permissive policies
DROP POLICY IF EXISTS "Allow authenticated users to read guests" ON public.guests;
DROP POLICY IF EXISTS "All authenticated users can read guests" ON public.guests;

-- Create proper role-based SELECT policy
CREATE POLICY "Only admin and staff can read guests"
ON public.guests
FOR SELECT
USING (
  public.has_role(auth.uid(), 'admin') 
  OR public.has_role(auth.uid(), 'staff')
);
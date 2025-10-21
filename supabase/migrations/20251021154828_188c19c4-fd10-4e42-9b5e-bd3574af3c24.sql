-- Clear existing data except admin
DELETE FROM guests;
DELETE FROM user_roles WHERE email != 'naoe31.dev@proton.me';

-- Create table for admin face authentication
CREATE TABLE IF NOT EXISTS public.admin_face_auth (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  face_image_data text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.admin_face_auth ENABLE ROW LEVEL SECURITY;

-- Only admins can manage their own face data
CREATE POLICY "Admins can manage their own face data"
ON public.admin_face_auth
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) AND user_id = auth.uid())
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) AND user_id = auth.uid());

-- Add updated_at trigger
CREATE TRIGGER update_admin_face_auth_updated_at
BEFORE UPDATE ON public.admin_face_auth
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
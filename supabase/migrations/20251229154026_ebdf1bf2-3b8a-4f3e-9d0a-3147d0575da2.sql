-- Update handle_new_user function to also assign a default role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Insert profile
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    new.id, 
    new.email,
    new.raw_user_meta_data ->> 'full_name'
  );
  
  -- Assign default role (sales_associate)
  INSERT INTO public.user_roles (user_id, role)
  VALUES (new.id, 'sales_associate');
  
  RETURN new;
END;
$$;
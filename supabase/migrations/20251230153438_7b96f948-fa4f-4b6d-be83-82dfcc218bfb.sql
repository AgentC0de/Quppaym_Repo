
-- Fix profiles table RLS policies
-- Drop existing restrictive policies and create permissive ones
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

-- Create permissive policies for profiles
CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
ON public.profiles FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = id);

-- Fix customers table RLS policies
DROP POLICY IF EXISTS "Authenticated employees can manage customers" ON public.customers;

CREATE POLICY "Authenticated employees can view customers"
ON public.customers FOR SELECT
USING (public.is_authenticated_employee(auth.uid()));

CREATE POLICY "Authenticated employees can insert customers"
ON public.customers FOR INSERT
WITH CHECK (public.is_authenticated_employee(auth.uid()));

CREATE POLICY "Authenticated employees can update customers"
ON public.customers FOR UPDATE
USING (public.is_authenticated_employee(auth.uid()));

CREATE POLICY "Authenticated employees can delete customers"
ON public.customers FOR DELETE
USING (public.is_authenticated_employee(auth.uid()));

-- Fix inventory table RLS policies
DROP POLICY IF EXISTS "Admins and managers can manage inventory" ON public.inventory;
DROP POLICY IF EXISTS "Authenticated employees can view inventory" ON public.inventory;

CREATE POLICY "Authenticated employees can view inventory"
ON public.inventory FOR SELECT
USING (public.is_authenticated_employee(auth.uid()));

CREATE POLICY "Authenticated employees can insert inventory"
ON public.inventory FOR INSERT
WITH CHECK (public.is_authenticated_employee(auth.uid()));

CREATE POLICY "Authenticated employees can update inventory"
ON public.inventory FOR UPDATE
USING (public.is_authenticated_employee(auth.uid()));

CREATE POLICY "Authenticated employees can delete inventory"
ON public.inventory FOR DELETE
USING (public.is_authenticated_employee(auth.uid()));

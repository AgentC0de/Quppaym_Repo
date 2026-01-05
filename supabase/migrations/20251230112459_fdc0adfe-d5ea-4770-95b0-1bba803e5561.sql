-- Add measurement_id to orders table for order-level measurements
ALTER TABLE public.orders
ADD COLUMN measurement_id uuid REFERENCES public.measurements(id);

-- Add measurement_version_id to orders table for tracking specific version
ALTER TABLE public.orders
ADD COLUMN measurement_version_id uuid REFERENCES public.measurement_versions(id);
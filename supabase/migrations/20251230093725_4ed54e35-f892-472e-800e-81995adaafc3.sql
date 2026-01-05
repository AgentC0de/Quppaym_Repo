-- Create measurement_versions table to track all changes
CREATE TABLE public.measurement_versions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  measurement_id UUID NOT NULL REFERENCES public.measurements(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL DEFAULT 1,
  -- Snapshot of all measurement values at this version
  chest NUMERIC,
  waist NUMERIC,
  hips NUMERIC,
  shoulder_width NUMERIC,
  sleeve_length NUMERIC,
  inseam NUMERIC,
  outseam NUMERIC,
  neck NUMERIC,
  back_length NUMERIC,
  front_length NUMERIC,
  garment_type TEXT NOT NULL,
  custom_notes TEXT,
  -- Metadata
  changed_by UUID REFERENCES public.employees(id),
  change_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add version tracking to order_items
ALTER TABLE public.order_items 
ADD COLUMN measurement_version_id UUID REFERENCES public.measurement_versions(id);

-- Enable RLS
ALTER TABLE public.measurement_versions ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Authenticated employees can manage measurement versions"
ON public.measurement_versions
FOR ALL
USING (is_authenticated_employee(auth.uid()));

-- Create index for efficient lookups
CREATE INDEX idx_measurement_versions_measurement_id ON public.measurement_versions(measurement_id);
CREATE INDEX idx_measurement_versions_created_at ON public.measurement_versions(created_at DESC);

-- Create function to auto-create version on measurement update
CREATE OR REPLACE FUNCTION public.create_measurement_version()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_version INTEGER;
BEGIN
  -- Get next version number
  SELECT COALESCE(MAX(version_number), 0) + 1 INTO next_version
  FROM public.measurement_versions
  WHERE measurement_id = NEW.id;
  
  -- Create version snapshot
  INSERT INTO public.measurement_versions (
    measurement_id, version_number, chest, waist, hips, shoulder_width,
    sleeve_length, inseam, outseam, neck, back_length, front_length,
    garment_type, custom_notes
  ) VALUES (
    NEW.id, next_version, NEW.chest, NEW.waist, NEW.hips, NEW.shoulder_width,
    NEW.sleeve_length, NEW.inseam, NEW.outseam, NEW.neck, NEW.back_length, NEW.front_length,
    NEW.garment_type, NEW.custom_notes
  );
  
  RETURN NEW;
END;
$$;

-- Create trigger to auto-version on insert/update
CREATE TRIGGER measurement_version_trigger
AFTER INSERT OR UPDATE ON public.measurements
FOR EACH ROW
EXECUTE FUNCTION public.create_measurement_version();
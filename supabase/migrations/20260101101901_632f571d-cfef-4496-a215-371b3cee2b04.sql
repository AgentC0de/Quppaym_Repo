
-- Create measurement_templates table for customizable field configurations
CREATE TABLE public.measurement_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  garment_type TEXT NOT NULL UNIQUE,
  fields JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.measurement_templates ENABLE ROW LEVEL SECURITY;

-- RLS policies for measurement_templates
CREATE POLICY "Authenticated employees can view measurement templates"
ON public.measurement_templates
FOR SELECT
USING (is_authenticated_employee(auth.uid()));

CREATE POLICY "Admins can manage measurement templates"
ON public.measurement_templates
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add order_id to measurements table
ALTER TABLE public.measurements ADD COLUMN order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE;

-- Add materials columns to measurements
ALTER TABLE public.measurements ADD COLUMN materials_provided_by_customer BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.measurements ADD COLUMN materials_images TEXT[] DEFAULT '{}';

-- Drop customer_id foreign key and column (after migrating data if needed)
ALTER TABLE public.measurements DROP CONSTRAINT IF EXISTS measurements_customer_id_fkey;
ALTER TABLE public.measurements DROP COLUMN IF EXISTS customer_id;

-- Create index for order_id lookups
CREATE INDEX idx_measurements_order_id ON public.measurements(order_id);

-- Create storage bucket for materials images
INSERT INTO storage.buckets (id, name, public) VALUES ('materials', 'materials', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for materials bucket
CREATE POLICY "Authenticated users can upload materials"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'materials' AND auth.role() = 'authenticated');

CREATE POLICY "Materials are publicly accessible"
ON storage.objects
FOR SELECT
USING (bucket_id = 'materials');

CREATE POLICY "Authenticated users can update their materials"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'materials' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete materials"
ON storage.objects
FOR DELETE
USING (bucket_id = 'materials' AND auth.role() = 'authenticated');

-- Insert default measurement templates
INSERT INTO public.measurement_templates (garment_type, fields) VALUES
('suit', '[{"name": "chest", "label": "Chest", "enabled": true}, {"name": "waist", "label": "Waist", "enabled": true}, {"name": "hips", "label": "Hips", "enabled": true}, {"name": "shoulder_width", "label": "Shoulder Width", "enabled": true}, {"name": "sleeve_length", "label": "Sleeve Length", "enabled": true}, {"name": "neck", "label": "Neck", "enabled": true}, {"name": "back_length", "label": "Back Length", "enabled": true}, {"name": "front_length", "label": "Front Length", "enabled": true}]'),
('shirt', '[{"name": "chest", "label": "Chest", "enabled": true}, {"name": "waist", "label": "Waist", "enabled": true}, {"name": "shoulder_width", "label": "Shoulder Width", "enabled": true}, {"name": "sleeve_length", "label": "Sleeve Length", "enabled": true}, {"name": "neck", "label": "Neck", "enabled": true}, {"name": "back_length", "label": "Back Length", "enabled": true}]'),
('pants', '[{"name": "waist", "label": "Waist", "enabled": true}, {"name": "hips", "label": "Hips", "enabled": true}, {"name": "inseam", "label": "Inseam", "enabled": true}, {"name": "outseam", "label": "Outseam", "enabled": true}]'),
('dress', '[{"name": "chest", "label": "Chest", "enabled": true}, {"name": "waist", "label": "Waist", "enabled": true}, {"name": "hips", "label": "Hips", "enabled": true}, {"name": "shoulder_width", "label": "Shoulder Width", "enabled": true}, {"name": "back_length", "label": "Back Length", "enabled": true}, {"name": "front_length", "label": "Front Length", "enabled": true}]'),
('other', '[{"name": "chest", "label": "Chest", "enabled": true}, {"name": "waist", "label": "Waist", "enabled": true}, {"name": "hips", "label": "Hips", "enabled": true}, {"name": "shoulder_width", "label": "Shoulder Width", "enabled": true}, {"name": "sleeve_length", "label": "Sleeve Length", "enabled": true}, {"name": "inseam", "label": "Inseam", "enabled": true}, {"name": "outseam", "label": "Outseam", "enabled": true}, {"name": "neck", "label": "Neck", "enabled": true}, {"name": "back_length", "label": "Back Length", "enabled": true}, {"name": "front_length", "label": "Front Length", "enabled": true}]');

-- Add trigger for updated_at
CREATE TRIGGER update_measurement_templates_updated_at
BEFORE UPDATE ON public.measurement_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

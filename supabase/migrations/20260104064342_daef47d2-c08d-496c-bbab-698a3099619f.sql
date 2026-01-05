-- Add new measurement fields to measurements table
ALTER TABLE public.measurements
ADD COLUMN IF NOT EXISTS full_length numeric,
ADD COLUMN IF NOT EXISTS blouse_length numeric,
ADD COLUMN IF NOT EXISTS shoulder numeric,
ADD COLUMN IF NOT EXISTS bust numeric,
ADD COLUMN IF NOT EXISTS yoke_length numeric,
ADD COLUMN IF NOT EXISTS yoke_round numeric,
ADD COLUMN IF NOT EXISTS slit_length numeric,
ADD COLUMN IF NOT EXISTS slit_width numeric,
ADD COLUMN IF NOT EXISTS stomach_length numeric,
ADD COLUMN IF NOT EXISTS stomach_round numeric,
ADD COLUMN IF NOT EXISTS bust_point_length numeric,
ADD COLUMN IF NOT EXISTS bust_distance numeric,
ADD COLUMN IF NOT EXISTS fc numeric,
ADD COLUMN IF NOT EXISTS bc numeric,
ADD COLUMN IF NOT EXISTS sleeve_round numeric,
ADD COLUMN IF NOT EXISTS bicep_round numeric,
ADD COLUMN IF NOT EXISTS armhole numeric,
ADD COLUMN IF NOT EXISTS shoulder_balance numeric,
ADD COLUMN IF NOT EXISTS front_neck_depth numeric,
ADD COLUMN IF NOT EXISTS back_neck_depth numeric,
ADD COLUMN IF NOT EXISTS collar_round numeric,
ADD COLUMN IF NOT EXISTS bottom_length numeric,
ADD COLUMN IF NOT EXISTS skirt_length numeric,
ADD COLUMN IF NOT EXISTS waist_round numeric,
ADD COLUMN IF NOT EXISTS hip_round numeric,
ADD COLUMN IF NOT EXISTS seat_round numeric,
ADD COLUMN IF NOT EXISTS thigh_round numeric,
ADD COLUMN IF NOT EXISTS knee_round numeric,
ADD COLUMN IF NOT EXISTS ankle_round numeric;

-- Drop old unused columns from measurements
ALTER TABLE public.measurements
DROP COLUMN IF EXISTS chest,
DROP COLUMN IF EXISTS waist,
DROP COLUMN IF EXISTS hips,
DROP COLUMN IF EXISTS shoulder_width,
DROP COLUMN IF EXISTS sleeve_length,
DROP COLUMN IF EXISTS inseam,
DROP COLUMN IF EXISTS outseam,
DROP COLUMN IF EXISTS neck,
DROP COLUMN IF EXISTS back_length,
DROP COLUMN IF EXISTS front_length;

-- Add new measurement fields to measurement_versions table
ALTER TABLE public.measurement_versions
ADD COLUMN IF NOT EXISTS full_length numeric,
ADD COLUMN IF NOT EXISTS blouse_length numeric,
ADD COLUMN IF NOT EXISTS shoulder numeric,
ADD COLUMN IF NOT EXISTS bust numeric,
ADD COLUMN IF NOT EXISTS yoke_length numeric,
ADD COLUMN IF NOT EXISTS yoke_round numeric,
ADD COLUMN IF NOT EXISTS slit_length numeric,
ADD COLUMN IF NOT EXISTS slit_width numeric,
ADD COLUMN IF NOT EXISTS stomach_length numeric,
ADD COLUMN IF NOT EXISTS stomach_round numeric,
ADD COLUMN IF NOT EXISTS bust_point_length numeric,
ADD COLUMN IF NOT EXISTS bust_distance numeric,
ADD COLUMN IF NOT EXISTS fc numeric,
ADD COLUMN IF NOT EXISTS bc numeric,
ADD COLUMN IF NOT EXISTS sleeve_round numeric,
ADD COLUMN IF NOT EXISTS bicep_round numeric,
ADD COLUMN IF NOT EXISTS armhole numeric,
ADD COLUMN IF NOT EXISTS shoulder_balance numeric,
ADD COLUMN IF NOT EXISTS front_neck_depth numeric,
ADD COLUMN IF NOT EXISTS back_neck_depth numeric,
ADD COLUMN IF NOT EXISTS collar_round numeric,
ADD COLUMN IF NOT EXISTS bottom_length numeric,
ADD COLUMN IF NOT EXISTS skirt_length numeric,
ADD COLUMN IF NOT EXISTS waist_round numeric,
ADD COLUMN IF NOT EXISTS hip_round numeric,
ADD COLUMN IF NOT EXISTS seat_round numeric,
ADD COLUMN IF NOT EXISTS thigh_round numeric,
ADD COLUMN IF NOT EXISTS knee_round numeric,
ADD COLUMN IF NOT EXISTS ankle_round numeric;

-- Drop old unused columns from measurement_versions
ALTER TABLE public.measurement_versions
DROP COLUMN IF EXISTS chest,
DROP COLUMN IF EXISTS waist,
DROP COLUMN IF EXISTS hips,
DROP COLUMN IF EXISTS shoulder_width,
DROP COLUMN IF EXISTS sleeve_length,
DROP COLUMN IF EXISTS inseam,
DROP COLUMN IF EXISTS outseam,
DROP COLUMN IF EXISTS neck,
DROP COLUMN IF EXISTS back_length,
DROP COLUMN IF EXISTS front_length;

-- Update the create_measurement_version function to use new fields
CREATE OR REPLACE FUNCTION public.create_measurement_version()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  next_version INTEGER;
BEGIN
  -- Get next version number
  SELECT COALESCE(MAX(version_number), 0) + 1 INTO next_version
  FROM public.measurement_versions
  WHERE measurement_id = NEW.id;
  
  -- Create version snapshot with new fields
  INSERT INTO public.measurement_versions (
    measurement_id, version_number, garment_type, custom_notes,
    full_length, blouse_length, shoulder, bust, waist_round,
    yoke_length, yoke_round, slit_length, slit_width,
    stomach_length, stomach_round, bust_point_length, bust_distance,
    fc, bc, sleeve_round, bicep_round, armhole, shoulder_balance,
    front_neck_depth, back_neck_depth, collar_round, bottom_length,
    skirt_length, hip_round, seat_round, thigh_round, knee_round, ankle_round
  ) VALUES (
    NEW.id, next_version, NEW.garment_type, NEW.custom_notes,
    NEW.full_length, NEW.blouse_length, NEW.shoulder, NEW.bust, NEW.waist_round,
    NEW.yoke_length, NEW.yoke_round, NEW.slit_length, NEW.slit_width,
    NEW.stomach_length, NEW.stomach_round, NEW.bust_point_length, NEW.bust_distance,
    NEW.fc, NEW.bc, NEW.sleeve_round, NEW.bicep_round, NEW.armhole, NEW.shoulder_balance,
    NEW.front_neck_depth, NEW.back_neck_depth, NEW.collar_round, NEW.bottom_length,
    NEW.skirt_length, NEW.hip_round, NEW.seat_round, NEW.thigh_round, NEW.knee_round, NEW.ankle_round
  );
  
  RETURN NEW;
END;
$function$;
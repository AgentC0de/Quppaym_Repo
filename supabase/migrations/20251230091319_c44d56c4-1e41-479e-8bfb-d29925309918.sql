-- Create order_status_settings table for full CRUD of order statuses
CREATE TABLE public.order_status_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  label text NOT NULL,
  color text NOT NULL DEFAULT 'gray',
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  is_system boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create vip_status_settings table for labels and ordering
CREATE TABLE public.vip_status_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  label text NOT NULL,
  color text NOT NULL DEFAULT 'gray',
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.order_status_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vip_status_settings ENABLE ROW LEVEL SECURITY;

-- RLS policies - Admins can manage, everyone can view
CREATE POLICY "Admins can manage order status settings"
ON public.order_status_settings
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated employees can view order status settings"
ON public.order_status_settings
FOR SELECT
USING (is_authenticated_employee(auth.uid()));

CREATE POLICY "Admins can manage vip status settings"
ON public.vip_status_settings
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated employees can view vip status settings"
ON public.vip_status_settings
FOR SELECT
USING (is_authenticated_employee(auth.uid()));

-- Seed initial order statuses from current enum
INSERT INTO public.order_status_settings (code, label, color, sort_order, is_system) VALUES
('draft', 'Draft', 'slate', 0, true),
('pending', 'Pending', 'amber', 1, true),
('deposit_paid', 'Deposit Paid', 'blue', 2, false),
('materials_ordered', 'Materials Ordered', 'purple', 3, false),
('in_production', 'In Production', 'indigo', 4, false),
('ready_for_fitting', 'Ready for Fitting', 'cyan', 5, false),
('ready_for_pickup', 'Ready for Pickup', 'emerald', 6, false),
('completed', 'Completed', 'green', 7, true),
('cancelled', 'Cancelled', 'red', 8, true);

-- Seed initial VIP statuses from current enum
INSERT INTO public.vip_status_settings (code, label, color, sort_order) VALUES
('regular', 'Regular', 'slate', 0),
('silver', 'Silver', 'zinc', 1),
('gold', 'Gold', 'amber', 2),
('platinum', 'Platinum', 'violet', 3);

-- Add updated_at triggers
CREATE TRIGGER update_order_status_settings_updated_at
BEFORE UPDATE ON public.order_status_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_vip_status_settings_updated_at
BEFORE UPDATE ON public.vip_status_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
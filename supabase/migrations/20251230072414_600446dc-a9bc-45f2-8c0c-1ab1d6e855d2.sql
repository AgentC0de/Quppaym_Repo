-- Create payment_history table to track individual payments and refunds
CREATE TABLE public.payment_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  payment_type TEXT NOT NULL CHECK (payment_type IN ('payment', 'refund')),
  notes TEXT,
  recorded_by UUID REFERENCES public.employees(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.payment_history ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated employees
CREATE POLICY "Authenticated employees can manage payment history"
ON public.payment_history
FOR ALL
USING (is_authenticated_employee(auth.uid()));

-- Create index for faster lookups by order
CREATE INDEX idx_payment_history_order_id ON public.payment_history(order_id);
CREATE INDEX idx_payment_history_created_at ON public.payment_history(created_at DESC);
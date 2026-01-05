-- Add is_settled column to orders table for tracking settlement of cancelled orders
ALTER TABLE public.orders ADD COLUMN is_settled boolean NOT NULL DEFAULT false;
-- Migration: add service_id to order_items
-- Generated: 2026-01-09

alter table if exists public.order_items
  add column if not exists service_id uuid references public.services(id) on delete set null;

-- allow service_id in triggers/functions that compute totals if needed (no-op here)

-- Add 'draft' to order_status enum
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'draft' BEFORE 'pending';
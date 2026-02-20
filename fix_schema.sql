-- RUN THIS IN YOUR SUPABASE SQL EDITOR TO FIX DATA FETCHING

-- 1. Add missing archiving and data snapshot columns
ALTER TABLE dispatches 
ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS dispatch_data JSONB,
ADD COLUMN IF NOT EXISTS ship_to_email TEXT,
ADD COLUMN IF NOT EXISTS ship_to_mode TEXT DEFAULT 'client';

-- FIX: Add master_qty to dispatch_items for historical tracking
ALTER TABLE public.dispatch_items 
ADD COLUMN IF NOT EXISTS master_qty numeric DEFAULT 0;

-- Optional: Migrate existing items if available
-- UPDATE public.dispatch_items SET master_qty = 100 WHERE description ILIKE '%example%';

-- 2. Optional: Add index for performance on date filtering
CREATE INDEX IF NOT EXISTS idx_dispatches_date ON dispatches(date);
CREATE INDEX IF NOT EXISTS idx_dispatches_archived ON dispatches(is_archived);

-- 3. Verify the table structure
-- SELECT * FROM dispatches LIMIT 1;

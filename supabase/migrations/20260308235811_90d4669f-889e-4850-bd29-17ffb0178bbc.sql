
-- Add edit_token to lists table for collaborative sharing
ALTER TABLE public.lists ADD COLUMN IF NOT EXISTS edit_token UUID DEFAULT gen_random_uuid() NOT NULL;

-- Add unique constraint (no IF NOT EXISTS for constraints in PG)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'lists_edit_token_unique'
  ) THEN
    ALTER TABLE public.lists ADD CONSTRAINT lists_edit_token_unique UNIQUE (edit_token);
  END IF;
END $$;

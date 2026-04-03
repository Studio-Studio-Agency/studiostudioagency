CREATE TABLE public.price_estimate_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_key text NOT NULL,
  currency text NOT NULL DEFAULT 'EUR',
  estimates jsonb NOT NULL DEFAULT '[]'::jsonb,
  tip text,
  product_name text NOT NULL,
  cheapest_price numeric,
  cheapest_store text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_price_cache_product ON public.price_estimate_cache (product_key);

ALTER TABLE public.price_estimate_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read price cache"
  ON public.price_estimate_cache FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Service role can manage price cache"
  ON public.price_estimate_cache FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
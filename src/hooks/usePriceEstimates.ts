import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface PriceEstimate {
  store: string;
  price_low: number;
  price_high: number;
  unit: string;
  note?: string;
}

export interface PriceData {
  product_name: string;
  currency: string;
  estimates: PriceEstimate[];
  tip?: string;
  cheapest_price?: number;
  cheapest_store?: string;
  cached?: boolean;
}

// In-memory session cache to avoid re-fetching within the same session
const sessionCache = new Map<string, PriceData>();

export function usePriceEstimates(product: string, enabled: boolean) {
  const [data, setData] = useState<PriceData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || product.trim().length < 2) {
      setData(null);
      setError(null);
      return;
    }

    const key = product.trim().toLowerCase();

    // Check session cache first
    const cached = sessionCache.get(key);
    if (cached) {
      setData(cached);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;

    const timeout = setTimeout(async () => {
      setLoading(true);
      setError(null);

      try {
        const { data: result, error: fnError } = await supabase.functions.invoke(
          "estimate-prices",
          { body: { product: product.trim() } }
        );

        if (cancelled) return;

        if (fnError) {
          setError("Preisschätzung fehlgeschlagen");
          setData(null);
        } else if (result?.error) {
          setError(result.error);
          setData(null);
        } else {
          const priceData = result as PriceData;
          sessionCache.set(key, priceData);
          setData(priceData);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) {
          setError("Netzwerkfehler");
          setData(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 800);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [product, enabled]);

  return { data, loading, error };
}

/**
 * Get cached cheapest price for a product (from session cache only, no API call)
 */
export function getCachedCheapestPrice(productName: string): { price: number; store: string; currency: string } | null {
  const key = productName.trim().toLowerCase();
  const cached = sessionCache.get(key);
  if (cached?.cheapest_price != null && cached.cheapest_store) {
    return {
      price: cached.cheapest_price,
      store: cached.cheapest_store,
      currency: cached.currency,
    };
  }
  return null;
}

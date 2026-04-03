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
}

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

    const controller = new AbortController();
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
          setData(result as PriceData);
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
      controller.abort();
    };
  }, [product, enabled]);

  return { data, loading, error };
}

import { PriceData } from "@/hooks/usePriceEstimates";
import { Loader2, TrendingDown } from "lucide-react";

interface PriceEstimatesDisplayProps {
  data: PriceData | null;
  loading: boolean;
  error: string | null;
}

const PriceEstimatesDisplay = ({ data, loading, error }: PriceEstimatesDisplayProps) => {
  if (loading) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" />
        <span>Preise werden geschätzt…</span>
      </div>
    );
  }

  if (error || !data || data.estimates.length === 0) {
    return null;
  }

  const sorted = [...data.estimates].sort((a, b) => a.price_low - b.price_low);
  const cheapest = sorted[0];
  const currencySymbol = data.currency === "CHF" ? "CHF" : "€";

  const formatPrice = (price: number) =>
    price.toFixed(2).replace(".", ",");

  return (
    <div className="px-3 py-2 space-y-1.5">
      <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <TrendingDown className="h-3 w-3" />
        <span>Preisschätzungen für „{data.product_name}"</span>
      </div>

      <div className="grid gap-1">
        {sorted.slice(0, 5).map((est, i) => (
          <div
            key={est.store}
            className={`flex items-center justify-between text-xs px-2 py-1 rounded ${
              i === 0 ? "bg-primary/10 text-primary font-medium" : "text-foreground"
            }`}
          >
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="truncate">{est.store}</span>
              {est.note && (
                <span className="text-muted-foreground text-[10px]">({est.note})</span>
              )}
            </div>
            <span className="shrink-0 ml-2">
              {est.price_low === est.price_high
                ? `${currencySymbol} ${formatPrice(est.price_low)}`
                : `${currencySymbol} ${formatPrice(est.price_low)}–${formatPrice(est.price_high)}`}
              <span className="text-muted-foreground ml-1">{est.unit}</span>
            </span>
          </div>
        ))}
      </div>

      {data.tip && (
        <p className="text-[10px] text-muted-foreground italic px-2">💡 {data.tip}</p>
      )}

      <p className="text-[10px] text-muted-foreground px-2">
        ⚠️ KI-Schätzung – keine Echtzeit-Preise
      </p>
    </div>
  );
};

export default PriceEstimatesDisplay;

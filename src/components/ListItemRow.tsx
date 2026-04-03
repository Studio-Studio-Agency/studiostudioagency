import { memo } from "react";
import { Link } from "react-router-dom";
import { Checkbox } from "@/components/ui/checkbox";
import { getProductIcon } from "@/lib/productIcons";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Trash2, Loader2, Undo2 } from "lucide-react";

export interface Item {
  id: string;
  name: string;
  menge: number | null;
  einheit: string | null;
  preis: number | null;
  is_checked: boolean;
  checked_at: string | null;
  ist_lebensmittel: boolean | null;
  kategorie: string | null;
  haltbarkeit_tage: number | null;
  erinnerung_vor_tagen: number | null;
  ablauf_datum: string | null;
  erklaerung: string | null;
  lagerhinweis: string | null;
  created_at: string;
}

export const KATEGORIEN: Record<string, string> = {
  "Obst & Früchte": "🍎",
  "Obst": "🍎",
  "Früchte": "🍎",
  "Gemüse & Salat": "🥕",
  "Gemüse": "🥕",
  "Salat": "🥬",
  "Fleisch & Fisch": "🥩",
  "Fleisch": "🥩",
  "Fisch": "🐟",
  "Milchprodukte": "🧀",
  "Backwaren": "🍞",
  "Getränke": "🥤",
  "Tiefkühl": "🧊",
  "Konserven & Vorrat": "🥫",
  "Konserven": "🥫",
  "Gewürze & Saucen": "🌶️",
  "Gewürze": "🌶️",
  "Saucen": "🌶️",
  "Snacks & Süsses": "🍫",
  "Snacks": "🍫",
  "Süsses": "🍫",
  "Frühstück & Cerealien": "🥣",
  "Frühstück": "🥣",
  "Haushalt & Reinigung": "🧹",
  "Haushalt": "🧹",
  "Reinigung": "🧹",
  "Pflege & Hygiene": "🧴",
  "Pflege": "🧴",
  "Hygiene": "🧴",
  "Baby & Kind": "🍼",
  "Tierbedarf": "🐾",
  "Technik & Elektronik": "💻",
  "Technik": "💻",
  "Elektronik": "💻",
  "Sonstiges": "📦",
};

const kategorieEmoji = KATEGORIEN;

function formatDate(dateIso: string) {
  return new Date(dateIso).toLocaleDateString("de-CH");
}

function daysUntil(dateIso: string) {
  // Positive: days remaining, 0: today, negative: expired
  return Math.ceil((new Date(dateIso).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

const ListItemRow = ({
  item,
  analyzing,
  onToggle,
  onDelete,
  onRename,
  onPriceChange,
}: {
  item: Item;
  analyzing: boolean;
  onToggle: () => void;
  onDelete: () => void;
  onRename: (newName: string) => void;
  onPriceChange?: (price: number | null) => void;
}) => {
  const getExpiryColor = () => {
    if (!item.ablauf_datum) return "";
    const days = daysUntil(item.ablauf_datum);
    if (days <= 0) return "text-destructive";
    if (days <= 2) return "text-destructive";
    if (days <= 5) return "text-primary";
    return "text-muted-foreground";
  };

  const getLifecycleDot = () => {
    if (!item.ablauf_datum) return "🟢";
    const days = daysUntil(item.ablauf_datum);
    if (days <= 0) return "🔴";
    if (days <= 2) return "🟠";
    if (days <= 5) return "🟡";
    return "🟢";
  };

  const showDetails =
    item.is_checked &&
    !analyzing &&
    Boolean(item.kategorie || item.checked_at || item.ablauf_datum || item.erklaerung || item.lagerhinweis);

  return (
    <div>
      <div className="flex items-start gap-3">
        <div className="pt-0.5">
          <Checkbox checked={item.is_checked} onCheckedChange={onToggle} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2 min-w-0">
            {item.is_checked ? (
              <span className="shrink-0" aria-label="Haltbarkeitsstatus">
                {getLifecycleDot()}
              </span>
            ) : (
              (() => {
                const icon = getProductIcon(item.name);
                return icon ? (
                  <span className="shrink-0 text-lg" aria-hidden>{icon}</span>
                ) : null;
              })()
            )}
            <span className="text-foreground break-words">{item.name}</span>
            {item.menge && (
              <span className="text-sm text-muted-foreground shrink-0">
                {item.menge} {item.einheit}
              </span>
            )}
          </div>

          {analyzing && (
            <p className="text-sm text-primary mt-1 flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" /> KI analysiert…
            </p>
          )}

          {showDetails && (
            <div className="mt-1.5 p-2 rounded-md bg-accent text-sm space-y-1">
              <div className="flex items-center gap-2">
                <span className="shrink-0" aria-hidden>
                  {item.kategorie ? kategorieEmoji[item.kategorie] || "📦" : "🛒"}
                </span>
                <span className="font-medium text-accent-foreground">
                  {item.kategorie ? item.kategorie : "Gekauft"}
                </span>
              </div>

              {item.checked_at && (
                <p className="text-muted-foreground">
                  Gekauft am: <span className="text-foreground">{formatDate(item.checked_at)}</span>
                </p>
              )}

              {item.ablauf_datum && (
                <p className={getExpiryColor()}>
                  Mindestens haltbar bis: {formatDate(item.ablauf_datum)}
                </p>
              )}

              {item.erklaerung && <p className="text-muted-foreground">{item.erklaerung}</p>}
              {item.lagerhinweis && <p className="text-muted-foreground">💡 {item.lagerhinweis}</p>}

              {item.ablauf_datum && (
                <Link to="/kalender" className="inline-block mt-1 text-xs text-primary hover:underline">
                  📅 Kalender-Erinnerung
                </Link>
              )}
            </div>
          )}
        </div>

        <div className="flex gap-1 shrink-0">
          {item.is_checked && (
            <Button variant="ghost" size="icon" onClick={onToggle} title="Rückgängig" className="h-8 w-8">
              <Undo2 className="h-3.5 w-3.5" />
            </Button>
          )}

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Trash2 className="h-3.5 w-3.5 text-destructive" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Artikel löschen?</AlertDialogTitle>
                <AlertDialogDescription>"{item.name}" wird unwiderruflich gelöscht.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                <AlertDialogAction onClick={onDelete}>Löschen</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  );
};

export default memo(ListItemRow);


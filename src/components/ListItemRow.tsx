import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Trash2, Loader2, Undo2 } from "lucide-react";

export interface Item {
  id: string;
  name: string;
  menge: number | null;
  einheit: string | null;
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

const kategorieEmoji: Record<string, string> = {
  "Obst": "🍎",
  "Gemüse": "🥦",
  "Fleisch & Fisch": "🥩",
  "Milchprodukte": "🧀",
  "Backwaren": "🍞",
  "Getränke": "🥤",
  "Tiefkühl": "🧊",
  "Konserven": "🥫",
  "Haushalt": "🧹",
  "Technik": "💻",
  "Sonstiges": "📦",
};

const ListItemRow = ({
  item,
  analyzing,
  onToggle,
  onDelete,
  onRename,
}: {
  item: Item;
  analyzing: boolean;
  onToggle: () => void;
  onDelete: () => void;
  onRename: (newName: string) => void;
}) => {
  const getExpiryColor = () => {
    if (!item.ablauf_datum) return "";
    const days = Math.ceil((new Date(item.ablauf_datum).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (days < 2) return "text-destructive";
    if (days <= 5) return "text-primary";
    return "text-muted-foreground";
  };

  return (
    <div className={`${item.is_checked ? "opacity-60" : ""}`}>
      <div className="flex items-start gap-3">
        <div className="pt-0.5">
          <Checkbox
            checked={item.is_checked}
            onCheckedChange={onToggle}
          />
        </div>
        <div className="flex-1 min-w-0">
          <span className={`${item.is_checked ? "line-through text-muted-foreground" : "text-foreground"}`}>
            {item.name}
          </span>
          {item.menge && (
            <span className="text-sm text-muted-foreground ml-2">
              {item.menge} {item.einheit}
            </span>
          )}

          {analyzing && (
            <p className="text-sm text-primary mt-1 flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" /> KI analysiert…
            </p>
          )}

          {item.is_checked && item.kategorie && !analyzing && (
            <div className="mt-1.5 p-2 rounded-md bg-accent text-sm space-y-0.5">
              <div className="flex items-center gap-2">
                <span>{kategorieEmoji[item.kategorie] || "📦"}</span>
                <span className="font-medium text-accent-foreground">{item.kategorie}</span>
              </div>
              {item.ablauf_datum && (
                <p className={getExpiryColor()}>
                  Ablauf: {new Date(item.ablauf_datum).toLocaleDateString("de-CH")}
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

export default ListItemRow;

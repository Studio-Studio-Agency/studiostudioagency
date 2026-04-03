import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { getProductIcon } from "@/lib/productIcons";

interface SearchResult {
  id: string;
  name: string;
  kategorie: string | null;
  list_id: string;
  list_name: string;
  is_checked: boolean;
}

const GlobalSearch = () => {
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [query, setQuery] = useState("");
  const { user } = useAuth();
  const navigate = useNavigate();

  // Cmd+K shortcut
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  // Search items
  useEffect(() => {
    if (!open || !user || query.length < 1) {
      setResults([]);
      return;
    }

    const timeout = setTimeout(async () => {
      const { data } = await supabase
        .from("items")
        .select("id, name, kategorie, list_id, is_checked")
        .eq("user_id", user.id)
        .ilike("name", `%${query}%`)
        .order("created_at", { ascending: false })
        .limit(20);

      if (!data) { setResults([]); return; }

      // Fetch list names for matched items
      const listIds = [...new Set(data.map((i) => i.list_id))];
      const { data: lists } = await supabase
        .from("lists")
        .select("id, name")
        .in("id", listIds);

      const listMap = new Map(lists?.map((l) => [l.id, l.name]) ?? []);

      setResults(
        data.map((i) => ({
          ...i,
          list_name: listMap.get(i.list_id) ?? "Liste",
        }))
      );
    }, 200);

    return () => clearTimeout(timeout);
  }, [query, open, user]);

  const handleSelect = useCallback(
    (result: SearchResult) => {
      setOpen(false);
      setQuery("");
      navigate(`/listen/${result.list_id}`);
    },
    [navigate]
  );

  if (!user) return null;

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={() => setOpen(true)}
        aria-label="Suche"
      >
        <Search className="h-4 w-4" />
      </Button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          placeholder="Artikel suchen…"
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          <CommandEmpty>
            {query.length < 1
              ? "Tippe, um zu suchen…"
              : "Keine Artikel gefunden."}
          </CommandEmpty>
          {results.length > 0 && (
            <CommandGroup heading="Artikel">
              {results.map((r) => (
                <CommandItem
                  key={r.id}
                  value={`${r.name}-${r.id}`}
                  onSelect={() => handleSelect(r)}
                  className="flex items-center gap-2"
                >
                  <span className="text-base">{getProductIcon(r.name)}</span>
                  <div className="flex flex-col flex-1 min-w-0">
                    <span className={r.is_checked ? "line-through text-muted-foreground" : ""}>
                      {r.name}
                    </span>
                    <span className="text-xs text-muted-foreground truncate">
                      {r.list_name}
                      {r.kategorie && ` · ${r.kategorie}`}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
};

export default GlobalSearch;

import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Search, StickyNote, List, Plus } from "lucide-react";
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
  CommandSeparator,
} from "@/components/ui/command";
import { getProductIcon } from "@/lib/productIcons";
import { toast } from "sonner";

interface ItemResult {
  id: string;
  name: string;
  kategorie: string | null;
  list_id: string;
  list_name: string;
  is_checked: boolean;
}

interface NoteResult {
  id: string;
  title: string;
  content: string | null;
}

interface ListResult {
  id: string;
  name: string;
  item_count: number;
}

interface UserList {
  id: string;
  name: string;
}

const GlobalSearch = () => {
  const [open, setOpen] = useState(false);
  const [itemResults, setItemResults] = useState<ItemResult[]>([]);
  const [noteResults, setNoteResults] = useState<NoteResult[]>([]);
  const [listResults, setListResults] = useState<ListResult[]>([]);
  const [allLists, setAllLists] = useState<UserList[]>([]);
  const [query, setQuery] = useState("");
  const [addingTo, setAddingTo] = useState<string | null>(null);
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

  // Load all lists when dialog opens
  useEffect(() => {
    if (!open || !user) return;
    supabase
      .from("lists")
      .select("id, name")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .then(({ data }) => setAllLists(data ?? []));
  }, [open, user]);

  // Search items + notes + lists
  useEffect(() => {
    if (!open || !user || query.length < 1) {
      setItemResults([]);
      setNoteResults([]);
      setListResults([]);
      return;
    }

    const timeout = setTimeout(async () => {
      const [itemsRes, notesRes, listsRes] = await Promise.all([
        supabase
          .from("items")
          .select("id, name, kategorie, list_id, is_checked")
          .eq("user_id", user.id)
          .ilike("name", `%${query}%`)
          .order("created_at", { ascending: false })
          .limit(15),
        supabase
          .from("notes")
          .select("id, title, content")
          .eq("user_id", user.id)
          .or(`title.ilike.%${query}%,content.ilike.%${query}%`)
          .order("updated_at", { ascending: false })
          .limit(5),
        supabase
          .from("lists")
          .select("id, name")
          .eq("user_id", user.id)
          .ilike("name", `%${query}%`)
          .order("updated_at", { ascending: false })
          .limit(5),
      ]);

      const items = itemsRes.data ?? [];
      if (items.length > 0) {
        const listIds = [...new Set(items.map((i) => i.list_id))];
        const { data: lists } = await supabase
          .from("lists")
          .select("id, name")
          .in("id", listIds);
        const listMap = new Map(lists?.map((l) => [l.id, l.name]) ?? []);
        setItemResults(items.map((i) => ({ ...i, list_name: listMap.get(i.list_id) ?? "Liste" })));
      } else {
        setItemResults([]);
      }

      const matchedLists = listsRes.data ?? [];
      if (matchedLists.length > 0) {
        const countPromises = matchedLists.map(async (l) => {
          const { count } = await supabase
            .from("items")
            .select("id", { count: "exact", head: true })
            .eq("list_id", l.id)
            .eq("is_checked", false);
          return { ...l, item_count: count ?? 0 };
        });
        setListResults(await Promise.all(countPromises));
      } else {
        setListResults([]);
      }

      setNoteResults(notesRes.data ?? []);
    }, 200);

    return () => clearTimeout(timeout);
  }, [query, open, user]);

  const handleSelectItem = useCallback(
    (r: ItemResult) => {
      setOpen(false);
      setQuery("");
      navigate(`/listen/${r.list_id}`);
    },
    [navigate]
  );

  const handleSelectList = useCallback(
    (r: ListResult) => {
      setOpen(false);
      setQuery("");
      navigate(`/listen/${r.id}`);
    },
    [navigate]
  );

  const handleSelectNote = useCallback(
    (r: NoteResult) => {
      setOpen(false);
      setQuery("");
      navigate(`/notizen/${r.id}`);
    },
    [navigate]
  );

  const handleAddToList = useCallback(
    async (listId: string, listName: string) => {
      if (!user || !query.trim()) return;
      setAddingTo(listId);
      const { error } = await supabase.from("items").insert({
        name: query.trim(),
        list_id: listId,
        user_id: user.id,
      });
      setAddingTo(null);
      if (error) {
        toast.error("Fehler beim Hinzufügen");
      } else {
        toast.success(`„${query.trim()}" zu ${listName} hinzugefügt`);
        setOpen(false);
        setQuery("");
      }
    },
    [user, query]
  );

  if (!user) return null;

  const hasResults = itemResults.length > 0 || noteResults.length > 0 || listResults.length > 0;

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
          placeholder="Artikel & Notizen suchen…"
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          <CommandEmpty>
            {query.length < 1
              ? "Tippe, um zu suchen…"
              : "Keine Ergebnisse gefunden."}
          </CommandEmpty>

          {/* Add to list action */}
          {query.trim().length > 0 && allLists.length > 0 && (
            <CommandGroup heading="Zur Liste hinzufügen">
              {allLists.map((l) => (
                <CommandItem
                  key={`add-${l.id}`}
                  value={`add-${query}-${l.name}-${l.id}`}
                  onSelect={() => handleAddToList(l.id, l.name)}
                  disabled={addingTo === l.id}
                  className="flex items-center gap-2"
                >
                  <Plus className="h-4 w-4 text-primary shrink-0" />
                  <span className="truncate">
                    „{query.trim()}" → <span className="font-medium">{l.name}</span>
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {hasResults && query.trim().length > 0 && allLists.length > 0 && (
            <CommandSeparator />
          )}

          {listResults.length > 0 && (
            <CommandGroup heading="Listen">
              {listResults.map((r) => (
                <CommandItem
                  key={r.id}
                  value={`list-${r.name}-${r.id}`}
                  onSelect={() => handleSelectList(r)}
                  className="flex items-center gap-2"
                >
                  <List className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="flex flex-col flex-1 min-w-0">
                    <span>{r.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {r.item_count} offene Artikel
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
          {itemResults.length > 0 && (
            <CommandGroup heading="Artikel">
              {itemResults.map((r) => (
                <CommandItem
                  key={r.id}
                  value={`item-${r.name}-${r.id}`}
                  onSelect={() => handleSelectItem(r)}
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
          {noteResults.length > 0 && (
            <CommandGroup heading="Notizen">
              {noteResults.map((r) => (
                <CommandItem
                  key={r.id}
                  value={`note-${r.title}-${r.id}`}
                  onSelect={() => handleSelectNote(r)}
                  className="flex items-center gap-2"
                >
                  <StickyNote className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="flex flex-col flex-1 min-w-0">
                    <span>{r.title}</span>
                    {r.content && (
                      <span className="text-xs text-muted-foreground truncate">
                        {r.content.slice(0, 80)}
                      </span>
                    )}
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

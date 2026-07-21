import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Snowflake, Flame, Sun, ThermometerSnowflake, Users, TrendingUp, ArrowLeft, ShieldAlert,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { computeLeadStats, type KlimaLead } from "@/lib/klima/leadStats";
import { SEGMENTS } from "@/lib/klima/qualification";

const TIER_STYLES: Record<string, string> = {
  hot: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
  warm: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  cold: "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300",
};

const TIER_LABELS: Record<string, string> = { hot: "Heiss", warm: "Warm", cold: "Kalt" };

const STATUS_LABELS: Record<string, string> = {
  new: "Neu",
  notified: "Benachrichtigt",
  assigned: "Zugeteilt",
  won: "Gewonnen",
  lost: "Verloren",
};

interface ListResponse {
  leads: KlimaLead[];
  conversationCount: number;
  error?: string;
}

interface TranscriptMessage {
  role: string;
  content: string;
  created_at: string;
}

function StatCard({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: string }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}

export default function KlimaLeadsPage() {
  const queryClient = useQueryClient();
  const [tierFilter, setTierFilter] = useState("alle");
  const [segmentFilter, setSegmentFilter] = useState("alle");
  const [statusFilter, setStatusFilter] = useState("alle");
  const [selected, setSelected] = useState<KlimaLead | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["klima-leads"],
    queryFn: async (): Promise<ListResponse> => {
      const { data, error } = await supabase.functions.invoke<ListResponse>("klima-admin", {
        body: { action: "list" },
      });
      if (error) throw new Error("Kein Zugriff oder Verbindungsfehler");
      if (!data || data.error) throw new Error(data?.error || "Unbekannter Fehler");
      return data;
    },
    retry: false,
  });

  const photoPaths = useMemo(
    () =>
      Array.isArray(selected?.qualification?.photos)
        ? (selected!.qualification.photos as string[]).filter((p) => typeof p === "string")
        : [],
    [selected],
  );

  const { data: photoUrls } = useQuery({
    queryKey: ["klima-photos", selected?.id],
    enabled: photoPaths.length > 0,
    queryFn: async (): Promise<Record<string, string>> => {
      const { data, error } = await supabase.functions.invoke<{ urls: Record<string, string> }>(
        "klima-admin",
        { body: { action: "photo_urls", paths: photoPaths } },
      );
      if (error || !data) throw new Error("Fotos konnten nicht geladen werden");
      return data.urls;
    },
  });

  const { data: transcript, isLoading: transcriptLoading } = useQuery({
    queryKey: ["klima-transcript", selected?.conversation_id],
    enabled: !!selected,
    queryFn: async (): Promise<TranscriptMessage[]> => {
      const { data, error } = await supabase.functions.invoke<{ messages: TranscriptMessage[] }>(
        "klima-admin",
        { body: { action: "conversation", conversationId: selected!.conversation_id } },
      );
      if (error || !data) throw new Error("Transkript konnte nicht geladen werden");
      return data.messages;
    },
  });

  const statusMutation = useMutation({
    mutationFn: async ({ leadId, status }: { leadId: string; status: string }) => {
      const { error } = await supabase.functions.invoke("klima-admin", {
        body: { action: "update_status", leadId, status },
      });
      if (error) throw new Error("Status konnte nicht geändert werden");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["klima-leads"] }),
  });

  const leads = useMemo(() => data?.leads ?? [], [data]);
  const stats = useMemo(
    () => computeLeadStats(leads, data?.conversationCount ?? 0),
    [leads, data],
  );

  const filtered = leads.filter(
    (l) =>
      (tierFilter === "alle" || l.tier === tierFilter) &&
      (segmentFilter === "alle" || l.segment === segmentFilter) &&
      (statusFilter === "alle" || l.status === statusFilter),
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 to-white dark:from-slate-950 dark:to-slate-900 pb-24">
      <header className="border-b bg-white/70 backdrop-blur dark:bg-slate-900/70">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-4">
          <Link
            to="/klimapartner"
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Zurück
          </Link>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-sky-600 to-cyan-500 text-white">
              <Snowflake className="h-4 w-4" />
            </div>
            <h1 className="text-lg font-bold tracking-tight">Klima-Leads</h1>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 px-4 py-8">
        {error ? (
          <Card className="border-destructive/50">
            <CardContent className="flex items-center gap-3 py-6 text-sm">
              <ShieldAlert className="h-5 w-5 text-destructive" />
              <div>
                <p className="font-medium">Kein Zugriff auf das Lead-Dashboard.</p>
                <p className="text-muted-foreground">
                  Ihr Konto muss in <code>KLIMA_ADMIN_EMAILS</code> freigeschaltet sein.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-xl" />
            ))}
          </div>
        ) : (
          <>
            {/* KPIs */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard icon={Users} label="Leads gesamt" value={String(stats.total)} />
              <StatCard
                icon={Flame}
                label="Heiss / Warm / Kalt"
                value={`${stats.hot} / ${stats.warm} / ${stats.cold}`}
              />
              <StatCard icon={Sun} label="Neu (7 Tage)" value={String(stats.newThisWeek)} />
              <StatCard
                icon={TrendingUp}
                label="Conversion (Chats → Leads)"
                value={
                  stats.conversionRate === null ? "—" : `${Math.round(stats.conversionRate * 100)}%`
                }
              />
            </div>

            {/* Filter */}
            <div className="flex flex-wrap gap-3">
              <Select value={tierFilter} onValueChange={setTierFilter}>
                <SelectTrigger className="w-36"><SelectValue placeholder="Tier" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="alle">Alle Tiers</SelectItem>
                  <SelectItem value="hot">Heiss</SelectItem>
                  <SelectItem value="warm">Warm</SelectItem>
                  <SelectItem value="cold">Kalt</SelectItem>
                </SelectContent>
              </Select>
              <Select value={segmentFilter} onValueChange={setSegmentFilter}>
                <SelectTrigger className="w-44"><SelectValue placeholder="Segment" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="alle">Alle Segmente</SelectItem>
                  <SelectItem value="A">A — Privat</SelectItem>
                  <SelectItem value="B">B — Verwaltung</SelectItem>
                  <SelectItem value="C">C — Gewerbe</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-44"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="alle">Alle Status</SelectItem>
                  {Object.entries(STATUS_LABELS).map(([v, label]) => (
                    <SelectItem key={v} value={v}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Tabelle */}
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Datum</TableHead>
                      <TableHead>Kontakt</TableHead>
                      <TableHead>Segment</TableHead>
                      <TableHead>Region</TableHead>
                      <TableHead>Score</TableHead>
                      <TableHead>Tier</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                          <ThermometerSnowflake className="mx-auto mb-2 h-6 w-6" />
                          Keine Leads gefunden.
                        </TableCell>
                      </TableRow>
                    )}
                    {filtered.map((l) => (
                      <TableRow
                        key={l.id}
                        className="cursor-pointer"
                        onClick={() => setSelected(l)}
                      >
                        <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                          {new Date(l.created_at).toLocaleDateString("de-CH")}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{l.contact_name ?? "—"}</div>
                          <div className="text-xs text-muted-foreground">
                            {[l.email, l.phone].filter(Boolean).join(" · ") || "—"}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{l.segment}</TableCell>
                        <TableCell className="text-sm">{l.region ?? "—"}</TableCell>
                        <TableCell className="text-sm font-medium">{l.lead_score}</TableCell>
                        <TableCell>
                          <Badge className={cn("border-0", TIER_STYLES[l.tier])}>
                            {TIER_LABELS[l.tier] ?? l.tier}
                          </Badge>
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Select
                            value={l.status}
                            onValueChange={(status) =>
                              statusMutation.mutate({ leadId: l.id, status })
                            }
                          >
                            <SelectTrigger className="h-8 w-40 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(STATUS_LABELS).map(([v, label]) => (
                                <SelectItem key={v} value={v}>{label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </>
        )}
      </main>

      {/* Detail-Dialog */}
      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selected?.contact_name ?? "Lead"}{" "}
              {selected && (
                <Badge className={cn("ml-2 border-0 align-middle", TIER_STYLES[selected.tier])}>
                  {TIER_LABELS[selected.tier]} · {selected.lead_score}
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>

          {selected && (
            <div className="space-y-5 text-sm">
              <div>
                <h3 className="mb-2 font-semibold">Qualifizierung</h3>
                <dl className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                  <div>
                    <dt className="inline text-muted-foreground">Segment: </dt>
                    <dd className="inline">{SEGMENTS[selected.segment]?.label ?? selected.segment}</dd>
                  </div>
                  {selected.address && (
                    <div>
                      <dt className="inline text-muted-foreground">Adresse: </dt>
                      <dd className="inline">{selected.address}</dd>
                    </div>
                  )}
                  {Object.entries(selected.qualification ?? {})
                    .filter(([k]) => k !== "photos")
                    .map(([k, v]) => (
                      <div key={k}>
                        <dt className="inline text-muted-foreground">{k}: </dt>
                        <dd className="inline">{String(v)}</dd>
                      </div>
                    ))}
                </dl>
              </div>

              {photoPaths.length > 0 && (
                <div>
                  <h3 className="mb-2 font-semibold">Raumfotos ({photoPaths.length})</h3>
                  <div className="flex flex-wrap gap-2">
                    {photoPaths.map((p) =>
                      photoUrls?.[p] ? (
                        <a key={p} href={photoUrls[p]} target="_blank" rel="noreferrer">
                          <img
                            src={photoUrls[p]}
                            alt="Raumfoto"
                            className="h-24 w-24 rounded-lg border object-cover transition-opacity hover:opacity-80"
                          />
                        </a>
                      ) : (
                        <Skeleton key={p} className="h-24 w-24 rounded-lg" />
                      ),
                    )}
                  </div>
                </div>
              )}

              <div>
                <h3 className="mb-2 font-semibold">Gesprächsverlauf</h3>
                {transcriptLoading ? (
                  <Skeleton className="h-24 rounded-lg" />
                ) : (
                  <div className="max-h-72 space-y-2 overflow-y-auto rounded-lg border p-3">
                    {(transcript ?? []).map((m, i) => (
                      <div
                        key={i}
                        className={cn(
                          "rounded-lg px-3 py-1.5",
                          m.role === "user"
                            ? "bg-sky-50 dark:bg-sky-950/40"
                            : "bg-muted",
                        )}
                      >
                        <span className="mr-2 text-xs font-semibold text-muted-foreground">
                          {m.role === "user" ? "Kunde" : "Bot"}
                        </span>
                        {m.content}
                      </div>
                    ))}
                    {(transcript ?? []).length === 0 && (
                      <p className="text-muted-foreground">Kein Transkript vorhanden.</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ANALYSIS_MODES } from "@/lib/analysisModes";
import { Trash2, Search, Filter, FolderOpen, Calendar, HelpCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/historico")({
  component: HistoryPage,
  head: () => ({ meta: [{ title: "Histórico – GeoAmbiental AI" }] }),
});

function HistoryPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<any[]>([]);
  const [busy, setBusy] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedMode, setSelectedMode] = useState("all");

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user) return;
    supabase.from("analyses").select("*").order("created_at", { ascending: false }).then(({ data }) => {
      setItems(data || []);
      setBusy(false);
    });
  }, [user]);

  async function remove(id: string, path: string) {
    if (!confirm("Excluir esta análise permanentemente? Todos os relatórios e imagens serão apagados do servidor.")) return;
    try {
      await supabase.storage.from("maps").remove([path]);
      await supabase.from("analyses").delete().eq("id", id);
      setItems((p) => p.filter((i) => i.id !== id));
      toast.success("Análise excluída com sucesso");
    } catch (err) {
      console.error(err);
      toast.error("Falha ao remover análise");
    }
  }

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchSearch =
        (item.title || "").toLowerCase().includes(search.toLowerCase()) ||
        (item.file_name || "").toLowerCase().includes(search.toLowerCase());
      
      const matchMode = selectedMode === "all" || item.mode === selectedMode;
      
      return matchSearch && matchMode;
    });
  }, [items, search, selectedMode]);

  if (loading || !user) return null;

  return (
    <div className="max-w-5xl mx-auto px-6 py-10 transition-colors duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Histórico de Análises</h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">Gerencie, filtre e visualize seus diagnósticos ambientais salvos.</p>
        </div>
        <Link to="/app">
          <Button className="shadow-md shadow-primary/10 hover:shadow-lg transition-all font-semibold">
            Nova análise
          </Button>
        </Link>
      </div>

      {/* Search and Filters toolbar */}
      <div className="bg-card border border-border p-4 rounded-xl shadow-sm mb-6 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:max-w-md flex items-center">
          <Search size={16} className="absolute left-3 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Pesquisar por título ou nome do arquivo..."
            className="pl-9 bg-muted/10 border-border focus:border-primary/50 transition-colors"
          />
        </div>
        
        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter size={16} className="text-muted-foreground shrink-0" />
          <select
            value={selectedMode}
            onChange={(e) => setSelectedMode(e.target.value)}
            className="w-full md:w-48 h-9 rounded-lg border border-border bg-card px-3 py-1.5 text-xs sm:text-sm font-medium shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="all">Todos os modos</option>
            {ANALYSIS_MODES.map((m) => (
              <option key={m.id} value={m.id}>
                {m.icon} {m.short}
              </option>
            ))}
          </select>
        </div>
      </div>

      {busy ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
          <Loader2 className="animate-spin text-primary" size={32} />
          <span className="text-sm font-medium">Buscando histórico...</span>
        </div>
      ) : items.length === 0 ? (
        <Card className="border-border shadow-sm">
          <CardContent className="pt-10 text-center text-muted-foreground py-16 space-y-4">
            <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center mx-auto text-xl">🌎</div>
            <p className="font-semibold text-foreground text-lg">Nenhuma análise ambiental realizada.</p>
            <p className="text-sm max-w-sm mx-auto">Envie um mapa georreferenciado e comece seu primeiro diagnóstico técnico.</p>
            <Link to="/app" className="inline-block mt-2"><Button>Começar primeira análise</Button></Link>
          </CardContent>
        </Card>
      ) : filteredItems.length === 0 ? (
        <Card className="border-border shadow-sm">
          <CardContent className="pt-10 text-center text-muted-foreground py-12 space-y-3">
            <HelpCircle className="mx-auto text-muted-foreground" size={32} />
            <p className="font-semibold text-foreground">Nenhuma análise correspondente.</p>
            <p className="text-sm">Tente redefinir seus filtros ou o termo digitado na barra de pesquisa.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="text-xs text-muted-foreground px-1">
            Exibindo {filteredItems.length} de {items.length} análises
          </div>
          <div className="grid gap-3.5">
            {filteredItems.map((a) => {
              const mode = ANALYSIS_MODES.find((m) => m.id === a.mode);
              
              // Status formatting
              let statusBadge = null;
              if (a.status === "completed") {
                statusBadge = <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 text-[10px]">Concluído</Badge>;
              } else if (a.status === "processing") {
                statusBadge = <Badge variant="secondary" className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 text-[10px] animate-pulse flex items-center gap-1"><Loader2 size={10} className="animate-spin" /> Processando</Badge>;
              } else {
                statusBadge = <Badge variant="destructive" className="text-[10px]">Falhou</Badge>;
              }

              return (
                <Card key={a.id} className="hover:shadow-md hover:border-primary/20 transition-all duration-300 group bg-card border-border">
                  <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4 min-w-0 w-full sm:w-auto flex-1">
                      <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center text-2xl shrink-0 group-hover:scale-105 transition-transform shadow-sm">
                        {mode?.icon || "🌎"}
                      </div>
                      <div className="min-w-0 flex-1 space-y-1">
                        <Link
                          to="/app/$id"
                          params={{ id: a.id }}
                          className="font-bold text-base hover:text-primary transition-colors block truncate text-foreground"
                        >
                          {a.title}
                        </Link>
                        <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span className="font-semibold text-foreground/80">{mode?.short || a.mode}</span>
                          <span>•</span>
                          <span className="flex items-center gap-1"><Calendar size={12} /> {new Date(a.created_at).toLocaleDateString("pt-BR")}</span>
                          <span>•</span>
                          <span className="truncate max-w-[200px]">{a.file_name}</span>
                          <span>•</span>
                          {statusBadge}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-end gap-2.5 w-full sm:w-auto shrink-0 border-t border-border/40 pt-3 sm:pt-0 sm:border-0">
                      <Link to="/app/$id" params={{ id: a.id }} className="w-full sm:w-auto">
                        <Button variant="outline" size="sm" className="w-full sm:w-auto border-border hover:bg-muted font-medium text-xs">
                          <FolderOpen size={14} className="mr-1.5" /> Abrir Relatório
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => remove(a.id, a.file_path)}
                        className="text-muted-foreground hover:text-destructive hover:bg-destructive/5 rounded-lg transition-colors shrink-0"
                        title="Excluir análise"
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}


import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ANALYSIS_MODES } from "@/lib/analysisModes";
import { Trash2 } from "lucide-react";
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
    if (!confirm("Excluir esta análise?")) return;
    await supabase.storage.from("maps").remove([path]);
    await supabase.from("analyses").delete().eq("id", id);
    setItems((p) => p.filter((i) => i.id !== id));
    toast.success("Análise removida");
  }

  if (loading || !user) return null;

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Histórico de análises</h1>
        <Link to="/app"><Button>Nova análise</Button></Link>
      </div>

      {busy ? (
        <p className="text-muted-foreground">Carregando...</p>
      ) : items.length === 0 ? (
        <Card><CardContent className="pt-6 text-center text-muted-foreground py-12">
          <p>Nenhuma análise ainda.</p>
          <Link to="/app"><Button className="mt-4">Começar primeira análise</Button></Link>
        </CardContent></Card>
      ) : (
        <div className="space-y-3">
          {items.map((a) => {
            const mode = ANALYSIS_MODES.find((m) => m.id === a.mode);
            return (
              <Card key={a.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="text-3xl">{mode?.icon || "🌎"}</div>
                  <div className="flex-1 min-w-0">
                    <Link to="/app/$id" params={{ id: a.id }} className="font-semibold hover:text-primary block truncate">{a.title}</Link>
                    <div className="text-xs text-muted-foreground flex flex-wrap gap-2 mt-1">
                      <Badge variant="secondary">{mode?.short || a.mode}</Badge>
                      <span>{new Date(a.created_at).toLocaleString("pt-BR")}</span>
                      <span>•</span>
                      <span className="truncate">{a.file_name}</span>
                      {a.status !== "completed" && <Badge variant={a.status === "failed" ? "destructive" : "outline"}>{a.status}</Badge>}
                    </div>
                  </div>
                  <Link to="/app/$id" params={{ id: a.id }}><Button variant="outline" size="sm">Abrir</Button></Link>
                  <Button variant="ghost" size="icon" onClick={() => remove(a.id, a.file_path)}><Trash2 size={16} /></Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

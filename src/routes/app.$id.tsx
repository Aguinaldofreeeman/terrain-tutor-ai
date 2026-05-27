import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ANALYSIS_MODES } from "@/lib/analysisModes";
import { exportCSV, exportGeoJSON, exportPDF, type AnalysisResult } from "@/lib/report";
import { Download, FileText, FileJson, FileSpreadsheet, ArrowLeft, Loader2 } from "lucide-react";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export const Route = createFileRoute("/app/$id")({
  component: AnalysisView,
});

function severityColor(s?: string) {
  return s === "alta" ? "destructive" : s === "media" ? "default" : "secondary";
}

function AnalysisView() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const [analysis, setAnalysis] = useState<any>(null);
  const [imageUrl, setImageUrl] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    async function load() {
      const { data } = await supabase.from("analyses").select("*").eq("id", id).maybeSingle();
      if (cancelled) return;
      setAnalysis(data);
      if (data?.file_path) {
        const { data: signed } = await supabase.storage.from("maps").createSignedUrl(data.file_path, 3600);
        if (signed?.signedUrl && !cancelled) setImageUrl(signed.signedUrl);
      }
      setLoading(false);
      // Poll while processing
      if (data?.status === "processing") setTimeout(load, 3000);
    }
    load();
    return () => { cancelled = true; };
  }, [id, user]);

  const result = (analysis?.result || {}) as AnalysisResult;
  const mode = ANALYSIS_MODES.find((m) => m.id === analysis?.mode);

  const indicatorChart = useMemo(() =>
    (result.indicadores ?? [])
      .filter((i) => typeof (i.percentual ?? i.valor) === "number")
      .map((i) => ({ name: i.nome, valor: i.percentual ?? i.valor })),
    [result.indicadores]);

  if (loading) return <div className="p-8 text-center text-muted-foreground">Carregando análise...</div>;
  if (!analysis) return (
    <div className="p-8 text-center">
      <p>Análise não encontrada.</p>
      <Link to="/app"><Button className="mt-4">Voltar</Button></Link>
    </div>
  );

  if (analysis.status === "processing") {
    return (
      <div className="max-w-2xl mx-auto p-12 text-center">
        <Loader2 className="mx-auto mb-4 animate-spin text-primary" size={48} />
        <h2 className="text-2xl font-bold mb-2">IA analisando seu mapa...</h2>
        <p className="text-muted-foreground">Isso pode levar de 20 a 90 segundos. A página atualiza sozinha.</p>
      </div>
    );
  }

  if (analysis.status === "failed") {
    return (
      <div className="max-w-2xl mx-auto p-12 text-center">
        <h2 className="text-2xl font-bold mb-2 text-destructive">Falha na análise</h2>
        <p className="text-muted-foreground mb-6">{analysis.error_message}</p>
        <Link to="/app"><Button>Tentar novamente</Button></Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <Link to="/app" className="text-sm text-muted-foreground inline-flex items-center gap-1 mb-2"><ArrowLeft size={14} /> Nova análise</Link>
          <h1 className="text-2xl font-bold">{result.titulo || analysis.title}</h1>
          <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
            <Badge variant="secondary">{mode?.icon} {mode?.short}</Badge>
            <span>•</span>
            <span>{new Date(analysis.created_at).toLocaleString("pt-BR")}</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => exportPDF(result, imageUrl)}><FileText size={14} className="mr-1" />PDF</Button>
          <Button variant="outline" size="sm" onClick={() => exportCSV(result, analysis.title)}><FileSpreadsheet size={14} className="mr-1" />CSV</Button>
          <Button variant="outline" size="sm" onClick={() => exportGeoJSON(result, analysis.title)}><FileJson size={14} className="mr-1" />GeoJSON</Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        <div className="lg:col-span-2">
          <Card className="overflow-hidden sticky top-20">
            <CardHeader className="pb-2"><CardTitle className="text-sm">Mapa analisado</CardTitle></CardHeader>
            <CardContent className="p-0">
              {imageUrl ? (
                /\.pdf$/i.test(analysis.file_path) ? (
                  <iframe src={imageUrl} title="PDF" className="w-full h-[500px] border-0" />
                ) : (
                  <TransformWrapper>
                    <TransformComponent wrapperClass="!w-full !h-[500px] bg-muted">
                      <img src={imageUrl} alt={analysis.file_name} className="max-w-full max-h-[500px] object-contain" />
                    </TransformComponent>
                  </TransformWrapper>
                )
              ) : (
                <div className="h-[500px] flex items-center justify-center text-muted-foreground">Preview indisponível</div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-3">
          <Tabs defaultValue="resumo">
            <TabsList className="flex flex-wrap h-auto">
              <TabsTrigger value="resumo">Resumo</TabsTrigger>
              <TabsTrigger value="diagnostico">Diagnóstico</TabsTrigger>
              <TabsTrigger value="feicoes">Feições</TabsTrigger>
              <TabsTrigger value="indicadores">Indicadores</TabsTrigger>
              <TabsTrigger value="conflitos">Conflitos</TabsTrigger>
              <TabsTrigger value="recomendacoes">Recomendações</TabsTrigger>
              <TabsTrigger value="metadados">Geo</TabsTrigger>
              <TabsTrigger value="parecer">Parecer</TabsTrigger>
            </TabsList>

            <TabsContent value="resumo">
              <Card><CardContent className="pt-6 space-y-4 prose-sm">
                <p className="whitespace-pre-wrap leading-relaxed">{result.resumoExecutivo || "—"}</p>
              </CardContent></Card>
            </TabsContent>

            <TabsContent value="diagnostico">
              <Card><CardContent className="pt-6">
                <div className="whitespace-pre-wrap leading-relaxed text-sm">{result.diagnosticoTecnico || "—"}</div>
              </CardContent></Card>
            </TabsContent>

            <TabsContent value="feicoes">
              <Card><CardContent className="pt-6 space-y-3">
                {(result.feicoesDetectadas ?? []).length === 0 && <p className="text-muted-foreground">Nenhuma feição.</p>}
                {result.feicoesDetectadas?.map((f, i) => (
                  <div key={i} className="border border-border rounded p-3">
                    <div className="flex items-center justify-between gap-2">
                      <strong>{f.tipo}</strong>
                      <Badge variant="outline" className="text-xs">{f.confianca ?? "—"}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{f.descricao}</p>
                  </div>
                ))}
              </CardContent></Card>
            </TabsContent>

            <TabsContent value="indicadores">
              <Card><CardContent className="pt-6 space-y-4">
                {indicatorChart.length > 0 && (
                  <div className="h-64">
                    <ResponsiveContainer>
                      <BarChart data={indicatorChart}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" fontSize={11} angle={-20} textAnchor="end" height={60} />
                        <YAxis fontSize={11} />
                        <Tooltip />
                        <Bar dataKey="valor" fill="#2d6a3e" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
                <table className="w-full text-sm">
                  <thead className="text-left text-muted-foreground">
                    <tr><th className="py-2">Indicador</th><th>Valor</th><th>%</th></tr>
                  </thead>
                  <tbody>
                    {result.indicadores?.map((i, idx) => (
                      <tr key={idx} className="border-t border-border">
                        <td className="py-2">{i.nome}</td>
                        <td>{i.valor} {i.unidade}</td>
                        <td>{i.percentual ?? "—"}</td>
                      </tr>
                    )) ?? <tr><td colSpan={3} className="text-muted-foreground py-3">Sem indicadores.</td></tr>}
                  </tbody>
                </table>
              </CardContent></Card>
            </TabsContent>

            <TabsContent value="conflitos">
              <Card><CardContent className="pt-6 space-y-3">
                {(result.conflitosAmbientais ?? []).length === 0 && <p className="text-muted-foreground">Nenhum conflito identificado.</p>}
                {result.conflitosAmbientais?.map((c, i) => (
                  <div key={i} className="border-l-4 border-destructive bg-destructive/5 p-3 rounded">
                    <div className="flex items-center justify-between"><strong>{c.tipo}</strong>{c.baseLegal && <em className="text-xs">{c.baseLegal}</em>}</div>
                    <p className="text-sm mt-1">{c.descricao}</p>
                  </div>
                ))}
                <h3 className="font-semibold mt-6">Áreas críticas</h3>
                {result.areasCriticas?.map((a, i) => (
                  <div key={i} className="border border-border rounded p-3">
                    <div className="flex items-center justify-between"><strong>{a.nome}</strong><Badge variant={severityColor(a.severidade) as any}>{a.severidade}</Badge></div>
                    <p className="text-sm text-muted-foreground mt-1">{a.descricao}</p>
                  </div>
                ))}
              </CardContent></Card>
            </TabsContent>

            <TabsContent value="recomendacoes">
              <Card><CardContent className="pt-6 space-y-3">
                {(result.recomendacoes ?? []).length === 0 && <p className="text-muted-foreground">Sem recomendações.</p>}
                {result.recomendacoes?.map((r, i) => (
                  <div key={i} className="border border-border rounded p-3">
                    <div className="flex items-center justify-between"><strong>{r.acao}</strong><Badge variant={severityColor(r.prioridade) as any}>{r.prioridade}</Badge></div>
                    <p className="text-sm text-muted-foreground mt-1">{r.justificativa}</p>
                  </div>
                ))}
              </CardContent></Card>
            </TabsContent>

            <TabsContent value="metadados">
              <Card><CardContent className="pt-6">
                <dl className="grid grid-cols-2 gap-3 text-sm">
                  {Object.entries(result.metadadosGeograficos ?? {}).map(([k, v]) => v ? (
                    <div key={k}><dt className="text-xs text-muted-foreground uppercase">{k}</dt><dd className="font-medium">{String(v)}</dd></div>
                  ) : null)}
                </dl>
                {!Object.values(result.metadadosGeograficos ?? {}).some(Boolean) && (
                  <p className="text-muted-foreground">Não foi possível extrair metadados geográficos.</p>
                )}
              </CardContent></Card>
            </TabsContent>

            <TabsContent value="parecer">
              <Card><CardContent className="pt-6">
                <div className="prose-sm whitespace-pre-wrap leading-relaxed">{result.parecerFinal || "—"}</div>
              </CardContent></Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

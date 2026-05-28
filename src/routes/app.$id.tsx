import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ANALYSIS_MODES } from "@/lib/analysisModes";
import { exportCSV, exportGeoJSON, exportPDF, type AnalysisResult } from "@/lib/report";
import {
  Download,
  FileText,
  FileJson,
  FileSpreadsheet,
  ArrowLeft,
  Loader2,
  BookOpen,
  Compass,
  BarChart3,
  AlertTriangle,
  Lightbulb,
  Layers,
  ClipboardCheck,
  FileImage,
  Calendar,
  Activity
} from "lucide-react";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export const Route = createFileRoute("/app/$id")({
  component: AnalysisView,
});

function severityColor(s?: string) {
  const norm = String(s ?? "").toLowerCase();
  return norm === "alta" ? "destructive" : norm === "media" ? "warning" : "secondary";
}

// React custom Markdown parser to format AI responses beautifully without external libraries
function parseMarkdown(text?: string) {
  if (!text) return "—";
  
  // Split by double newline to get block elements
  const blocks = text.split("\n\n");
  
  return blocks.map((block, index) => {
    const trimmed = block.trim();
    if (!trimmed) return null;
    
    // Headers
    if (trimmed.startsWith("### ")) {
      return <h3 key={index} className="text-base font-bold text-primary dark:text-primary-foreground mt-4 mb-2 font-serif tracking-tight">{trimmed.replace("### ", "")}</h3>;
    }
    if (trimmed.startsWith("## ")) {
      return <h2 key={index} className="text-lg font-bold text-primary dark:text-primary-foreground mt-6 mb-3 font-serif border-b border-border pb-1 tracking-tight">{trimmed.replace("## ", "")}</h2>;
    }
    if (trimmed.startsWith("# ")) {
      return <h1 key={index} className="text-xl font-bold text-primary dark:text-primary-foreground mt-8 mb-4 font-serif tracking-tight">{trimmed.replace("# ", "")}</h1>;
    }
    
    // Bullet list
    if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      const items = trimmed.split(/\n[-*]\s/).map(item => item.replace(/^[-*]\s/, "").trim());
      return (
        <ul key={index} className="list-disc list-inside space-y-1.5 my-3 pl-2">
          {items.map((item, i) => <li key={i} className="text-sm text-foreground/90 leading-relaxed">{parseInline(item)}</li>)}
        </ul>
      );
    }
    
    // Numbered list
    if (/^\d+\.\s/.test(trimmed)) {
      const items = trimmed.split(/\n\d+\.\s/).map(item => item.replace(/^\d+\.\s/, "").trim());
      return (
        <ol key={index} className="list-decimal list-inside space-y-1.5 my-3 pl-2">
          {items.map((item, i) => <li key={i} className="text-sm text-foreground/90 leading-relaxed">{parseInline(item)}</li>)}
        </ol>
      );
    }
    
    // Table
    if (trimmed.startsWith("|")) {
      const lines = trimmed.split("\n").map(l => l.trim()).filter(Boolean);
      if (lines.length >= 2) {
        const rows = lines.map(line => {
          return line.split("|").map(cell => cell.trim()).filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);
        });
        
        const headers = rows[0];
        const dataRows = rows.slice(2); // Skip header and separator line
        
        return (
          <div key={index} className="overflow-x-auto my-4 rounded-lg border border-border shadow-sm max-w-full">
            <table className="min-w-full divide-y divide-border text-xs sm:text-sm text-left">
              <thead className="bg-secondary/40 text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <tr>
                  {headers.map((h, i) => <th key={i} className="px-3 py-2 border-r border-border/40 last:border-r-0">{h}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-card">
                {dataRows.map((row, rIdx) => (
                  <tr key={rIdx} className="hover:bg-muted/10 transition-colors">
                    {row.map((cell, cIdx) => (
                      <td key={cIdx} className="px-3 py-2 border-r border-border/40 last:border-r-0 font-medium">{parseInline(cell)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      }
    }
    
    // Paragraph
    return <p key={index} className="text-sm leading-relaxed text-foreground/90 my-2">{parseInline(block)}</p>;
  });
}

function parseInline(text: string) {
  // Bold parser: **text**
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i} className="font-semibold text-foreground">{part.slice(2, -2)}</strong>;
    }
    // Italic parser: *text*
    const subParts = part.split(/(\*.*?\*)/g);
    return subParts.map((sub, j) => {
      if (sub.startsWith("*") && sub.endsWith("*")) {
        return <em key={j} className="italic text-foreground/80">{sub.slice(1, -1)}</em>;
      }
      return sub;
    });
  });
}

function AnalysisView() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const [analysis, setAnalysis] = useState<any>(null);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [selectedImageIdx, setSelectedImageIdx] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    async function load() {
      const { data } = await supabase.from("analyses").select("*").eq("id", id).maybeSingle();
      if (cancelled) return;
      setAnalysis(data);
      if (data?.file_path) {
        // Collect all paths (original file + comparison paths)
        const paths = [data.file_path, ...(data.comparison_paths || [])];
        const urls: string[] = [];
        for (const path of paths) {
          const { data: signed } = await supabase.storage.from("maps").createSignedUrl(path, 3600);
          if (signed?.signedUrl) {
            urls.push(signed.signedUrl);
          }
        }
        if (!cancelled) setImageUrls(urls);
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

  if (loading) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center text-muted-foreground gap-3">
        <Loader2 className="animate-spin text-primary" size={36} />
        <span className="font-semibold text-sm">Carregando relatório técnico...</span>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="max-w-md mx-auto p-12 text-center my-10 border border-border bg-card rounded-2xl shadow-sm">
        <AlertTriangle className="mx-auto mb-4 text-destructive" size={48} />
        <p className="font-semibold text-lg">Análise não encontrada.</p>
        <p className="text-sm text-muted-foreground mt-2">O arquivo pode ter sido deletado ou você não possui permissão para visualizá-lo.</p>
        <Link to="/app" className="mt-6 inline-block"><Button>Voltar para Workspace</Button></Link>
      </div>
    );
  }

  if (analysis.status === "processing") {
    return (
      <div className="max-w-2xl mx-auto p-16 text-center my-10 border border-border bg-card rounded-2xl shadow-md space-y-6">
        <Loader2 className="mx-auto animate-spin text-primary" size={54} />
        <div>
          <h2 className="text-3xl font-bold tracking-tight">IA analisando seu mapa...</h2>
          <p className="text-muted-foreground mt-2 text-base">Isso pode levar de 20 a 90 segundos. A página atualizará automaticamente assim que o laudo estiver concluído.</p>
        </div>
        <Progress value={45} className="h-2 w-[70%] mx-auto" />
      </div>
    );
  }

  if (analysis.status === "failed") {
    return (
      <div className="max-w-2xl mx-auto p-12 text-center my-10 border border-border bg-card rounded-2xl shadow-md">
        <AlertTriangle className="mx-auto mb-4 text-destructive" size={54} />
        <h2 className="text-2xl font-bold text-destructive">Falha na análise por IA</h2>
        <p className="text-muted-foreground mt-3 text-sm p-4 bg-destructive/5 rounded-xl border border-destructive/15 max-h-48 overflow-y-auto text-left font-mono">{analysis.error_message}</p>
        <Link to="/app" className="mt-8 inline-block"><Button>Tentar novamente</Button></Link>
      </div>
    );
  }

  const primaryImageUrl = imageUrls[selectedImageIdx] || "";

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 transition-colors duration-300">
      {/* Header toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/60 pb-6 mb-6">
        <div>
          <Link to="/app" className="text-sm font-semibold text-primary hover:text-primary/80 inline-flex items-center gap-1 mb-2">
            <ArrowLeft size={16} /> Voltar para o Workspace
          </Link>
          <h1 className="text-3xl font-bold tracking-tight">{result.titulo || analysis.title}</h1>
          <div className="flex flex-wrap items-center gap-2 mt-2 text-xs sm:text-sm text-muted-foreground">
            <Badge variant="outline" className="font-semibold px-2.5 py-0.5 border-primary/20 bg-primary/5 text-primary">
              {mode?.icon} {mode?.short || analysis.mode}
            </Badge>
            <span>•</span>
            <span className="flex items-center gap-1"><Calendar size={14} /> {new Date(analysis.created_at).toLocaleString("pt-BR")}</span>
            <span>•</span>
            <span className="max-w-xs truncate">{analysis.file_name}</span>
          </div>
        </div>
        
        {/* Export Buttons */}
        <div className="flex flex-wrap gap-2.5">
          <Button variant="outline" size="sm" onClick={() => exportPDF(result, imageUrls[0])} className="border-border hover:bg-muted font-medium text-xs">
            <FileText size={14} className="mr-1.5" /> PDF
          </Button>
          <Button variant="outline" size="sm" onClick={() => exportCSV(result, analysis.title)} className="border-border hover:bg-muted font-medium text-xs">
            <FileSpreadsheet size={14} className="mr-1.5" /> CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => exportGeoJSON(result, analysis.title)} className="border-border hover:bg-muted font-medium text-xs">
            <FileJson size={14} className="mr-1.5" /> GeoJSON
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-8 items-start">
        {/* Left column - Map/Image visualizer */}
        <div className="lg:col-span-5 space-y-4">
          <Card className="overflow-hidden shadow-sm border-border bg-card sticky top-20">
            <CardHeader className="pb-3 border-b border-border/40 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                <FileImage size={16} className="text-primary" />
                Mapa Analisado
              </CardTitle>
              {imageUrls.length > 1 && (
                <Badge variant="secondary" className="text-[10px]">
                  {selectedImageIdx + 1} de {imageUrls.length} arquivos
                </Badge>
              )}
            </CardHeader>
            <CardContent className="p-0 bg-muted/10 relative">
              {primaryImageUrl ? (
                /\.pdf$/i.test(analysis.file_path) && selectedImageIdx === 0 ? (
                  <iframe src={primaryImageUrl} title="PDF" className="w-full h-[520px] border-0" />
                ) : (
                  <TransformWrapper>
                    <TransformComponent wrapperClass="!w-full !h-[520px] bg-muted/20 relative flex items-center justify-center overflow-hidden">
                      <img
                        src={primaryImageUrl}
                        alt={analysis.file_name}
                        className="max-w-full max-h-[520px] object-contain mx-auto select-none"
                      />
                    </TransformComponent>
                  </TransformWrapper>
                )
              ) : (
                <div className="h-[520px] flex flex-col items-center justify-center text-muted-foreground gap-2">
                  <Loader2 className="animate-spin" size={24} />
                  <span className="text-xs">Carregando imagem...</span>
                </div>
              )}
            </CardContent>
            
            {/* Gallery Selector for comparative analyses */}
            {imageUrls.length > 1 && (
              <div className="p-3 border-t border-border bg-secondary/30 flex flex-col gap-2">
                <div className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                  <Activity size={12} className="text-primary" />
                  <span>Imagens da Série Temporal:</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {imageUrls.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedImageIdx(idx)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                        selectedImageIdx === idx
                          ? "bg-primary text-primary-foreground border-primary shadow-sm"
                          : "bg-card text-foreground hover:bg-muted border-border"
                      }`}
                    >
                      {idx === 0 ? "1. Principal (T0)" : `${idx + 1}. Comparação (T${idx})`}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* Right column - Tabs with report content */}
        <div className="lg:col-span-7">
          <Tabs defaultValue="resumo" className="w-full space-y-4">
            <TabsList className="flex flex-wrap h-auto bg-muted/60 p-1 border border-border/40 rounded-lg gap-1">
              <TabsTrigger value="resumo" className="text-xs font-medium py-1.5 px-3 flex items-center gap-1.5"><FileText size={14} /> Resumo</TabsTrigger>
              <TabsTrigger value="diagnostico" className="text-xs font-medium py-1.5 px-3 flex items-center gap-1.5"><BookOpen size={14} /> Diagnóstico</TabsTrigger>
              <TabsTrigger value="feicoes" className="text-xs font-medium py-1.5 px-3 flex items-center gap-1.5"><Compass size={14} /> Feições</TabsTrigger>
              <TabsTrigger value="indicadores" className="text-xs font-medium py-1.5 px-3 flex items-center gap-1.5"><BarChart3 size={14} /> Indicadores</TabsTrigger>
              <TabsTrigger value="conflitos" className="text-xs font-medium py-1.5 px-3 flex items-center gap-1.5"><AlertTriangle size={14} /> Conflitos</TabsTrigger>
              <TabsTrigger value="recomendacoes" className="text-xs font-medium py-1.5 px-3 flex items-center gap-1.5"><Lightbulb size={14} /> Recomendações</TabsTrigger>
              <TabsTrigger value="metadados" className="text-xs font-medium py-1.5 px-3 flex items-center gap-1.5"><Layers size={14} /> Geo</TabsTrigger>
              <TabsTrigger value="parecer" className="text-xs font-medium py-1.5 px-3 flex items-center gap-1.5"><ClipboardCheck size={14} /> Parecer</TabsTrigger>
            </TabsList>

            {/* TAB: Resumo Executivo */}
            <TabsContent value="resumo">
              <Card className="shadow-sm border-border">
                <CardHeader><CardTitle className="text-lg font-serif">Resumo Executivo</CardTitle></CardHeader>
                <CardContent className="space-y-4 leading-relaxed prose prose-sm dark:prose-invert">
                  <p className="whitespace-pre-wrap text-sm text-foreground/90">{result.resumoExecutivo || "—"}</p>
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB: Diagnóstico Técnico */}
            <TabsContent value="diagnostico">
              <Card className="shadow-sm border-border">
                <CardHeader><CardTitle className="text-lg font-serif">Diagnóstico Técnico Detalhado</CardTitle></CardHeader>
                <CardContent className="space-y-3 prose prose-sm dark:prose-invert max-w-none">
                  {result.diagnosticoTecnico ? (
                    <div className="text-foreground/90 leading-relaxed">
                      {parseMarkdown(result.diagnosticoTecnico)}
                    </div>
                  ) : "—"}
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB: Feições Detectadas */}
            <TabsContent value="feicoes">
              <Card className="shadow-sm border-border">
                <CardHeader><CardTitle className="text-lg font-serif">Feições Mapeadas por Fotointerpretação</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  {(result.feicoesDetectadas ?? []).length === 0 && (
                    <p className="text-muted-foreground text-sm">Nenhuma feição geográfica mapeada.</p>
                  )}
                  <div className="grid sm:grid-cols-2 gap-4">
                    {result.feicoesDetectadas?.map((f, i) => (
                      <div key={i} className="border border-border/60 bg-card rounded-xl p-4 shadow-sm flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <span className="font-semibold text-sm sm:text-base text-foreground">{f.tipo}</span>
                            <Badge variant={f.confianca === "alta" ? "outline" : "secondary"} className="text-[10px] capitalize">
                              Confiança: {f.confianca ?? "—"}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground leading-relaxed">{f.descricao}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB: Indicadores */}
            <TabsContent value="indicadores">
              <Card className="shadow-sm border-border">
                <CardHeader><CardTitle className="text-lg font-serif">Métricas e Indicadores Ambientais</CardTitle></CardHeader>
                <CardContent className="space-y-6">
                  {indicatorChart.length > 0 && (
                    <div>
                      <div className="h-64 mt-2">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={indicatorChart} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                            <defs>
                              <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.8}/>
                                <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0.2}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                            <XAxis dataKey="name" fontSize={10} angle={-15} textAnchor="end" height={50} tickLine={false} />
                            <YAxis fontSize={10} tickLine={false} />
                            <Tooltip contentStyle={{ background: "rgba(var(--color-card), 0.95)", border: "1px solid var(--color-border)", borderRadius: "8px", fontSize: "12px" }} />
                            <Bar dataKey="valor" fill="url(#chartGradient)" radius={[4, 4, 0, 0]} barSize={36} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}
                  
                  <div className="overflow-x-auto rounded-lg border border-border/80">
                    <table className="w-full text-left border-collapse text-xs sm:text-sm">
                      <thead>
                        <tr className="bg-secondary/40 text-muted-foreground border-b border-border">
                          <th className="py-2.5 px-4 font-semibold">Indicador Técnico</th>
                          <th className="py-2.5 px-4 font-semibold text-right">Valor Estimado</th>
                          <th className="py-2.5 px-4 font-semibold text-right">%</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {result.indicadores?.map((i, idx) => (
                          <tr key={idx} className="hover:bg-muted/10 transition-colors">
                            <td className="py-2.5 px-4 font-medium text-foreground">{i.nome}</td>
                            <td className="py-2.5 px-4 text-right text-muted-foreground">{i.valor} {i.unidade}</td>
                            <td className="py-2.5 px-4 text-right font-semibold text-primary">{i.percentual != null ? `${i.percentual}%` : "—"}</td>
                          </tr>
                        )) ?? (
                          <tr><td colSpan={3} className="text-muted-foreground text-center py-4">Sem indicadores disponíveis.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB: Conflitos e Leis */}
            <TabsContent value="conflitos">
              <Card className="shadow-sm border-border">
                <CardHeader><CardTitle className="text-lg font-serif font-semibold">Conflitos Ambientais & Áreas Críticas</CardTitle></CardHeader>
                <CardContent className="space-y-6">
                  {/* Conflitos */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Inconsistências e Conflitos Legais</h3>
                    {(result.conflitosAmbientais ?? []).length === 0 && (
                      <p className="text-muted-foreground text-sm">Nenhum conflito imediato identificado.</p>
                    )}
                    {result.conflitosAmbientais?.map((c, i) => (
                      <div key={i} className="border-l-4 border-destructive bg-destructive/5 dark:bg-destructive/10 p-4 rounded-r-xl border border-border border-l-destructive shadow-sm">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                          <strong className="text-sm sm:text-base text-foreground">{c.tipo}</strong>
                          {c.baseLegal && (
                            <Badge variant="outline" className="text-[10px] w-fit border-destructive/20 bg-destructive/5 text-destructive font-semibold">
                              Base Legal: {c.baseLegal}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs sm:text-sm text-muted-foreground mt-2 leading-relaxed">{c.descricao}</p>
                      </div>
                    ))}
                  </div>

                  {/* Areas Criticas */}
                  <div className="space-y-3 pt-4 border-t border-border/40">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Áreas Críticas de Atenção</h3>
                    {(result.areasCriticas ?? []).length === 0 && (
                      <p className="text-muted-foreground text-sm">Nenhuma área crítica específica isolada.</p>
                    )}
                    <div className="grid sm:grid-cols-2 gap-4">
                      {result.areasCriticas?.map((a, i) => (
                        <div key={i} className="border border-border/60 bg-card rounded-xl p-4 shadow-sm flex flex-col justify-between">
                          <div>
                            <div className="flex items-center justify-between gap-2 mb-2">
                              <span className="font-semibold text-sm sm:text-base text-foreground">{a.nome}</span>
                              <Badge variant={severityColor(a.severidade) as any} className="text-[10px]">
                                Risco {a.severidade}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground leading-relaxed">{a.descricao}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB: Recomendações */}
            <TabsContent value="recomendacoes">
              <Card className="shadow-sm border-border">
                <CardHeader><CardTitle className="text-lg font-serif">Medidas Mitigadoras e Recomendações</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  {(result.recomendacoes ?? []).length === 0 && (
                    <p className="text-muted-foreground text-sm">Nenhuma recomendação prescrita.</p>
                  )}
                  <div className="space-y-3">
                    {result.recomendacoes?.map((r, i) => (
                      <div key={i} className="border border-border/60 bg-card/40 rounded-xl p-4 shadow-sm">
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                          <strong className="text-sm sm:text-base text-foreground">{r.acao}</strong>
                          <Badge variant={severityColor(r.prioridade) as any} className="text-[10px]">
                            Prioridade {r.prioridade}
                          </Badge>
                        </div>
                        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">{r.justificativa}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB: Metadados Geográficos */}
            <TabsContent value="metadados">
              <Card className="shadow-sm border-border">
                <CardHeader><CardTitle className="text-lg font-serif">Dados Cartográficos e Metadados</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    {Object.entries(result.metadadosGeograficos ?? {}).map(([key, val]) => {
                      if (!val) return null;
                      // Format labels nicely
                      const labelMap: Record<string, string> = {
                        escalaEstimada: "Escala Cartográfica Estimada",
                        projecao: "Projeção Cartográfica",
                        epsg: "Código EPSG",
                        datum: "Datum de Referência",
                        bbox: "Bounding Box (BBOX)",
                        coordenadas: "Coordenadas Visíveis/Centróide",
                        observacoes: "Observações Adicionais"
                      };
                      return (
                        <div key={key} className="bg-secondary/20 border border-border/40 p-3 rounded-lg flex flex-col justify-between">
                          <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">{labelMap[key] || key}</span>
                          <span className="text-xs sm:text-sm font-semibold text-foreground mt-1 truncate" title={String(val)}>{String(val)}</span>
                        </div>
                      );
                    })}
                  </div>
                  {!Object.values(result.metadadosGeograficos ?? {}).some(Boolean) && (
                    <p className="text-muted-foreground text-sm">Não foi possível extrair metadados espaciais das legendas ou imagens.</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB: Parecer Final */}
            <TabsContent value="parecer">
              <Card className="shadow-sm border-border">
                <CardHeader><CardTitle className="text-lg font-serif">Parecer Técnico de Conclusão</CardTitle></CardHeader>
                <CardContent className="pt-2">
                  <div className="prose prose-sm dark:prose-invert max-w-none text-foreground/90 font-mono text-xs sm:text-sm bg-secondary/10 dark:bg-secondary/5 p-5 border border-border rounded-xl whitespace-pre-wrap leading-relaxed">
                    {result.parecerFinal || "—"}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}


import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ANALYSIS_MODES, ACCEPTED_TYPES, MAX_FILE_MB, MAX_FILES } from "@/lib/analysisModes";
import { toast } from "sonner";
import { Upload, X, FileImage, Loader2, Sparkles, HelpCircle, CheckCircle2, ShieldAlert } from "lucide-react";

export const Route = createFileRoute("/app/")({
  component: WorkspacePage,
  head: () => ({ meta: [{ title: "Workspace – GeoAmbiental AI" }] }),
});

type LocalFile = { file: File; preview?: string };

const MODE_CATEGORIES = [
  { id: "all", label: "Todos" },
  { id: "rec", label: "Recursos & APP" },
  { id: "uso", label: "Uso & Solo" },
  { id: "riscos", label: "Riscos & Leis" }
];

function WorkspacePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState("geral");
  const [activeTab, setActiveTab] = useState("all");
  const [title, setTitle] = useState("");
  const [files, setFiles] = useState<LocalFile[]>([]);
  const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const modeInfo = useMemo(() => ANALYSIS_MODES.find((m) => m.id === mode)!, [mode]);
  const multiFile = !!modeInfo.multiFile;

  // Filter modes based on active category tab
  const filteredModes = useMemo(() => {
    if (activeTab === "all") return ANALYSIS_MODES;
    if (activeTab === "rec") return ANALYSIS_MODES.filter(m => ["app", "hidrico", "vegetacao", "prad"].includes(m.id));
    if (activeTab === "uso") return ANALYSIS_MODES.filter(m => ["geral", "uso_solo", "relevo", "comparacao"].includes(m.id));
    if (activeTab === "riscos") return ANALYSIS_MODES.filter(m => ["fragilidade", "degradacao", "licenciamento"].includes(m.id));
    return ANALYSIS_MODES;
  }, [activeTab]);

  const onFiles = useCallback((list: FileList | null) => {
    if (!list) return;
    const arr = Array.from(list);
    const valid: LocalFile[] = [];
    for (const f of arr) {
      if (f.size > MAX_FILE_MB * 1024 * 1024) {
        toast.error(`${f.name}: excede o tamanho máximo de ${MAX_FILE_MB} MB`);
        continue;
      }
      const isImage = /^image\//.test(f.type) && !/tiff/.test(f.type);
      valid.push({ file: f, preview: isImage ? URL.createObjectURL(f) : undefined });
    }
    setFiles((prev) => {
      const combined = [...prev, ...valid];
      if (combined.length > MAX_FILES) {
        toast.error(`Máximo de ${MAX_FILES} arquivos por análise.`);
        combined.slice(MAX_FILES).forEach((f) => f.preview && URL.revokeObjectURL(f.preview));
        return combined.slice(0, MAX_FILES);
      }
      return combined;
    });
  }, []);

  function removeFile(idx: number) {
    setFiles((prev) => {
      const f = prev[idx];
      if (f?.preview) URL.revokeObjectURL(f.preview);
      return prev.filter((_, i) => i !== idx);
    });
  }

  async function runAnalysis() {
    if (!user) return;
    if (!files.length) return toast.error("Envie ao menos um arquivo.");
    if (multiFile && files.length < 2) return toast.error("O modo de comparação multitemporal requer 2 ou mais arquivos.");
    setBusy(true);
    setProgress(8);
    try {
      const ts = Date.now();
      const uploadedPaths: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const f = files[i].file;
        const safeName = f.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const path = `${user.id}/${ts}_${i}_${safeName}`;
        const { error: upErr } = await supabase.storage.from("maps").upload(path, f, {
          contentType: f.type || "application/octet-stream",
          upsert: false,
        });
        if (upErr) throw upErr;
        uploadedPaths.push(path);
        setProgress(10 + Math.round(((i + 1) / files.length) * 30));
      }

      const { data: analysis, error: insErr } = await supabase
        .from("analyses")
        .insert({
          user_id: user.id,
          title: title || files[0].file.name.replace(/\.[^/.]+$/, ""),
          mode,
          file_name: files[0].file.name,
          file_path: uploadedPaths[0],
          file_mime: files[0].file.type,
          comparison_paths: uploadedPaths.length > 1 ? uploadedPaths.slice(1) : null,
          status: "processing",
        })
        .select()
        .single();
      if (insErr) throw insErr;

      setProgress(50);
      const { data, error } = await supabase.functions.invoke("analyze-map", {
        body: {
          analysisId: analysis.id,
          mode,
          filePaths: uploadedPaths,
          geoMetadata: {},
        },
      });
      setProgress(95);
      if (error) {
        const msg = (error as any).context?.error || error.message;
        throw new Error(msg);
      }
      if (data?.error) throw new Error(data.error);

      setProgress(100);
      toast.success("Análise concluída com sucesso!");
      navigate({ to: "/app/$id", params: { id: analysis.id } });
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Falha ao processar análise");
    } finally {
      setBusy(false);
      setTimeout(() => setProgress(0), 800);
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-10 transition-colors duration-300">
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Nova Análise Ambiental</h1>
          <p className="text-muted-foreground mt-1 text-base">Faça o upload de mapas georreferenciados ou imagens para gerar relatórios detalhados com inteligência artificial.</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-8 items-start">
        {/* Main section */}
        <div className="lg:col-span-8 space-y-6">
          {/* Section 1: Upload */}
          <Card className="shadow-sm border-border bg-card">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold">1</span>
                Arquivos do Mapa
              </CardTitle>
              <CardDescription>
                Formatos aceitos: PDF, GeoPDF, JPEG, PNG, TIFF e GeoTIFF (tamanho máximo de {MAX_FILE_MB}MB por arquivo).
                {multiFile && <span className="font-semibold text-primary block mt-1">✓ Modo Comparação Temporal ativo: envie 2 ou mais imagens.</span>}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => { e.preventDefault(); setIsDragging(false); onFiles(e.dataTransfer.files); }}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-10 text-center transition-all cursor-pointer flex flex-col items-center justify-center ${
                  isDragging
                    ? "border-primary bg-primary/5 scale-[0.99]"
                    : "border-border bg-muted/20 hover:border-primary/50 hover:bg-muted/40"
                }`}
              >
                <div className={`p-4 rounded-full bg-card shadow-sm border border-border/60 text-muted-foreground mb-4 transition-transform ${isDragging ? 'scale-110 text-primary' : ''}`}>
                  <Upload size={28} />
                </div>
                <p className="font-semibold text-sm sm:text-base">Arraste seus arquivos aqui ou clique para selecionar</p>
                <p className="text-xs text-muted-foreground mt-2 max-w-sm">
                  Selecione até {MAX_FILES} arquivos. {multiFile ? "Envie as imagens em ordem cronológica." : ""}
                </p>
                <div className="flex flex-wrap justify-center gap-1.5 mt-4">
                  {ACCEPTED_TYPES.split(",").filter(s => s.startsWith(".")).map((t, i) => (
                    <span key={i} className="text-[10px] bg-secondary text-secondary-foreground font-medium px-2 py-0.5 rounded">
                      {t.replace(".", "").toUpperCase()}
                    </span>
                  ))}
                </div>
                <input
                  ref={fileInputRef}
                  id="file-input"
                  type="file"
                  className="hidden"
                  accept={ACCEPTED_TYPES}
                  multiple
                  onChange={(e) => onFiles(e.target.files)}
                />
              </div>

              {/* Uploaded Files Preview */}
              {files.length > 0 && (
                <div className="space-y-2 pt-2">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Arquivos selecionados ({files.length}/{MAX_FILES})</span>
                    <button onClick={() => setFiles([])} className="hover:text-destructive flex items-center gap-1 font-medium transition-colors">
                      <X size={12} /> Limpar tudo
                    </button>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {files.map((f, i) => (
                      <div key={i} className="relative bg-secondary/40 border border-border/40 rounded-xl p-3 flex gap-3 items-center group hover:bg-secondary/60 transition-colors">
                        {f.preview ? (
                          <img src={f.preview} alt="" className="w-12 h-12 object-cover rounded-lg border border-border" />
                        ) : (
                          <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center border border-border">
                            <FileImage className="text-muted-foreground" size={20} />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold truncate text-foreground">{f.file.name}</p>
                          <p className="text-[10px] text-muted-foreground">{(f.file.size / 1024 / 1024).toFixed(2)} MB</p>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); removeFile(i); }}
                          className="p-1.5 rounded-full hover:bg-background text-muted-foreground hover:text-destructive transition-colors"
                          title="Remover arquivo"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Section 2: Mode Selection */}
          <Card className="shadow-sm border-border bg-card">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold">2</span>
                Modo de Análise
              </CardTitle>
              <CardDescription>
                Selecione o módulo de geoprocessamento correspondente ao objetivo do seu diagnóstico.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Category tabs */}
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid grid-cols-4 bg-muted/50 p-1 border border-border/40 rounded-lg">
                  {MODE_CATEGORIES.map((c) => (
                    <TabsTrigger
                      key={c.id}
                      value={c.id}
                      className="text-xs sm:text-sm font-medium py-1.5"
                    >
                      {c.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
                
                {/* Modes Grid */}
                <div className="grid sm:grid-cols-2 gap-4 mt-6">
                  {filteredModes.map((m) => {
                    const isSelected = mode === m.id;
                    return (
                      <div
                        key={m.id}
                        onClick={() => setMode(m.id)}
                        className={`cursor-pointer rounded-xl p-4 border-2 transition-all duration-200 flex flex-col justify-between group ${
                          isSelected
                            ? "border-primary bg-primary/5 dark:bg-primary/10 shadow-sm"
                            : "border-border bg-card hover:border-border/80 hover:bg-muted/20"
                        }`}
                      >
                        <div>
                          <div className="flex items-start gap-2.5 mb-2">
                            <span className="text-2xl group-hover:scale-110 transition-transform">{m.icon}</span>
                            <div className="space-y-0.5">
                              <h4 className="font-semibold text-sm sm:text-base leading-tight group-hover:text-primary transition-colors">{m.label}</h4>
                              <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">{m.short}</span>
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 mt-1">{m.description}</p>
                        </div>
                        {m.multiFile && (
                          <span className="text-[9px] bg-accent/15 text-accent-foreground dark:text-accent border border-accent/25 px-2 py-0.5 rounded-full mt-3 self-start font-semibold tracking-wide">
                            Comparativo (2+ imagens)
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </Tabs>

              {/* Extra Configuration */}
              <div className="pt-4 border-t border-border/40 space-y-3">
                <Label htmlFor="analysis-title" className="text-sm font-semibold">Título do Relatório (Opcional)</Label>
                <Input
                  id="analysis-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={`Ex: Fazenda São João – ${modeInfo.short}`}
                  className="bg-muted/10 border-border focus:border-primary/50 transition-colors"
                />
                <p className="text-xs text-muted-foreground">Se deixado em branco, utilizaremos o nome do primeiro arquivo como título padrão.</p>
              </div>
            </CardContent>
          </Card>

          {/* Action Trigger */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 bg-card border border-border p-4 rounded-xl shadow-sm">
            <Button
              size="lg"
              onClick={runAnalysis}
              disabled={busy || !files.length}
              className="font-semibold px-8 h-12 shadow-md shadow-primary/10 hover:shadow-lg transition-all"
            >
              {busy ? (
                <>
                  <Loader2 className="mr-2 animate-spin" size={18} />
                  Processando...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2" size={18} />
                  Analisar com IA
                </>
              )}
            </Button>
            {busy && (
              <div className="flex-1 space-y-1">
                <div className="flex justify-between text-xs font-medium">
                  <span>Enviando e processando dados</span>
                  <span>{progress}%</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
            )}
            {!files.length && (
              <p className="text-xs text-muted-foreground flex items-center gap-1.5 py-2">
                <HelpCircle size={14} className="text-muted-foreground" />
                Envie um arquivo para liberar a análise com IA.
              </p>
            )}
          </div>
        </div>

        {/* Sidebar Info Panels */}
        <aside className="lg:col-span-4 space-y-6">
          <Card className="border-border shadow-sm">
            <CardHeader className="pb-3 border-b border-border/40">
              <CardTitle className="text-base flex items-center gap-2 font-serif text-primary">
                {modeInfo.icon}
                Módulo Ativo
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-3">
              <h5 className="font-semibold text-sm">{modeInfo.label}</h5>
              <p className="text-xs text-muted-foreground leading-relaxed">{modeInfo.description}</p>
              {multiFile && (
                <div className="bg-amber-500/10 border border-amber-500/25 rounded-lg p-2.5 text-xs text-amber-700 dark:text-amber-400 flex gap-2">
                  <ShieldAlert size={16} className="shrink-0 mt-0.5" />
                  <span>Esse modo requer o envio de pelo menos dois mapas ou ortofotos da mesma área em períodos diferentes para detectar transformações na paisagem.</span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-border shadow-sm bg-secondary/20">
            <CardHeader className="pb-3 border-b border-border/40">
              <CardTitle className="text-base flex items-center gap-2">
                <CheckCircle2 size={16} className="text-primary" />
                O que a IA vai extrair
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 text-xs text-muted-foreground space-y-3">
              <p className="leading-relaxed">A IA do GeoAmbiental atua simulando a interpretação técnica de um engenheiro sênior de GIS. Serão mapeados:</p>
              <ul className="space-y-2 pl-1">
                <li className="flex items-start gap-1.5">
                  <span className="text-primary mt-0.5">✓</span>
                  <span><strong>Diagnóstico Técnico:</strong> Parecer aprofundado com termos científicos do sensoriamento remoto.</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="text-primary mt-0.5">✓</span>
                  <span><strong>Feições da Terra:</strong> Classificação visual de elementos e seu nível de confiabilidade.</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="text-primary mt-0.5">✓</span>
                  <span><strong>Conflitos de Uso:</strong> Cruzamento automático com o Código Florestal Brasileiro (ex. APP e RL).</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="text-primary mt-0.5">✓</span>
                  <span><strong>Ações Mitigatórias:</strong> Propostas de recuperação do solo, hidrografia ou recomposição florestal.</span>
                </li>
              </ul>
              <div className="pt-2 border-t border-border/40 text-[10px] italic">
                Nota: Os relatórios gerados servem como triagem e estudos preliminares, necessitando validação legal em campo.
              </div>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}


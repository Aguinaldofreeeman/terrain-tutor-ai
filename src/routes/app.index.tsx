import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { ANALYSIS_MODES, ACCEPTED_TYPES, MAX_FILE_MB, MAX_FILES } from "@/lib/analysisModes";
import { toast } from "sonner";
import { Upload, X, FileImage, Loader2 } from "lucide-react";

export const Route = createFileRoute("/app/")({
  component: WorkspacePage,
  head: () => ({ meta: [{ title: "Workspace – GeoAmbiental AI" }] }),
});

type LocalFile = { file: File; preview?: string };

function WorkspacePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState("geral");
  const [title, setTitle] = useState("");
  const [files, setFiles] = useState<LocalFile[]>([]);
  const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);

  const modeInfo = useMemo(() => ANALYSIS_MODES.find((m) => m.id === mode)!, [mode]);
  const multiFile = !!modeInfo.multiFile;

  const onFiles = useCallback((list: FileList | null) => {
    if (!list) return;
    const arr = Array.from(list);
    const valid: LocalFile[] = [];
    for (const f of arr) {
      if (f.size > MAX_FILE_MB * 1024 * 1024) {
        toast.error(`${f.name}: excede ${MAX_FILE_MB} MB`);
        continue;
      }
      const isImage = /^image\//.test(f.type) && !/tiff/.test(f.type);
      valid.push({ file: f, preview: isImage ? URL.createObjectURL(f) : undefined });
    }
    setFiles((prev) => (multiFile ? [...prev, ...valid] : valid.slice(0, 1)));
  }, [multiFile]);

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
    if (multiFile && files.length < 2) return toast.error("Modo comparação requer 2+ arquivos.");
    setBusy(true);
    setProgress(8);
    try {
      // Upload files to storage under user folder
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

      // Create analysis row
      const { data: analysis, error: insErr } = await supabase
        .from("analyses")
        .insert({
          user_id: user.id,
          title: title || files[0].file.name,
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
      // Invoke edge function
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
      toast.success("Análise concluída!");
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
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Nova análise ambiental</h1>
        <p className="text-muted-foreground mt-1">Envie um mapa ou imagem georreferenciada e selecione o modo de análise.</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>1. Arquivo(s)</CardTitle>
              <CardDescription>
                PDF, GeoPDF, JPG, PNG, TIFF, GeoTIFF — até {MAX_FILE_MB} MB cada.
                {multiFile && " Modo comparação aceita múltiplos arquivos."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div
                ref={dropRef}
                onDragOver={(e) => { e.preventDefault(); dropRef.current?.classList.add("border-primary"); }}
                onDragLeave={() => dropRef.current?.classList.remove("border-primary")}
                onDrop={(e) => { e.preventDefault(); dropRef.current?.classList.remove("border-primary"); onFiles(e.dataTransfer.files); }}
                className="border-2 border-dashed border-border rounded-lg p-8 text-center transition-colors hover:border-primary cursor-pointer"
                onClick={() => document.getElementById("file-input")?.click()}
              >
                <Upload className="mx-auto mb-3 text-muted-foreground" />
                <p className="font-medium">Arraste os arquivos aqui ou clique para selecionar</p>
                <p className="text-xs text-muted-foreground mt-1">{ACCEPTED_TYPES.split(",").filter(s=>s.startsWith(".")).join(" • ")}</p>
                <input
                  id="file-input" type="file" className="hidden" accept={ACCEPTED_TYPES}
                  multiple={multiFile}
                  onChange={(e) => onFiles(e.target.files)}
                />
              </div>

              {files.length > 0 && (
                <div className="mt-4 grid sm:grid-cols-2 gap-3">
                  {files.map((f, i) => (
                    <div key={i} className="relative bg-secondary/50 rounded-lg p-3 flex gap-3 items-center">
                      {f.preview ? (
                        <img src={f.preview} alt="" className="w-16 h-16 object-cover rounded" />
                      ) : (
                        <div className="w-16 h-16 bg-muted rounded flex items-center justify-center">
                          <FileImage className="text-muted-foreground" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{f.file.name}</p>
                        <p className="text-xs text-muted-foreground">{(f.file.size / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                      <button onClick={() => removeFile(i)} className="p-1 rounded hover:bg-background">
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>2. Configuração</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Modo de análise</Label>
                <Select value={mode} onValueChange={setMode}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ANALYSIS_MODES.map((m) => (
                      <SelectItem key={m.id} value={m.id}>{m.icon} {m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">{modeInfo.description}</p>
              </div>
              <div>
                <Label>Título (opcional)</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Fazenda São João – diagnóstico inicial" />
              </div>
            </CardContent>
          </Card>

          <div className="flex items-center gap-4">
            <Button size="lg" onClick={runAnalysis} disabled={busy || !files.length}>
              {busy ? <><Loader2 className="mr-2 animate-spin" size={16} /> Analisando...</> : "Analisar com IA"}
            </Button>
            {busy && <div className="flex-1"><Progress value={progress} /></div>}
          </div>
        </div>

        <aside className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{modeInfo.icon} {modeInfo.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{modeInfo.description}</p>
            </CardContent>
          </Card>
          <Card className="bg-secondary/50">
            <CardHeader>
              <CardTitle className="text-base">Como funciona</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p>A IA atua como especialista sênior em geoprocessamento ambiental e gera:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Resumo executivo</li>
                <li>Diagnóstico técnico</li>
                <li>Feições e áreas críticas</li>
                <li>Conflitos ambientais</li>
                <li>Indicadores quantitativos</li>
                <li>Recomendações técnicas</li>
                <li>Parecer final</li>
              </ul>
              <p className="text-xs italic mt-2">Estimativas visuais — para fins legais, valide com GIS e laudo profissional.</p>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}

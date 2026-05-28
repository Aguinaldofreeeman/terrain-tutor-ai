import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { ANALYSIS_MODES } from "@/lib/analysisModes";

export const Route = createFileRoute("/")({
  component: Landing,
  head: () => ({
    meta: [
      { title: "GeoAmbiental AI – Análise Ambiental de Mapas com IA" },
      { name: "description", content: "Especialista em geoprocessamento ambiental: envie mapas, ortofotos, GeoTIFFs e receba relatórios técnicos automáticos com diagnóstico ambiental detalhado." },
    ],
  }),
});

import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { ANALYSIS_MODES } from "@/lib/analysisModes";
import { ArrowRight, Leaf, Shield, Sparkles, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Landing,
  head: () => ({
    meta: [
      { title: "GeoAmbiental AI – Análise Ambiental de Mapas com IA" },
      { name: "description", content: "Especialista em geoprocessamento ambiental: envie mapas, ortofotos, GeoTIFFs e receba relatórios técnicos automáticos com diagnóstico ambiental detalhado." },
    ],
  }),
});

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground relative overflow-hidden transition-colors duration-300">
      {/* Background Decorative Blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[20%] right-[-10%] w-[40%] h-[45%] rounded-full bg-accent/5 blur-[120px] pointer-events-none" />
      
      {/* Grid Pattern Overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(0,0,0,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.03)_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />

      <header className="border-b border-border bg-background/60 backdrop-blur-md sticky top-0 z-50 transition-colors">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg gradient-eco flex items-center justify-center text-white text-sm shadow-md shadow-primary/10">🌎</div>
            <span className="font-semibold text-lg tracking-tight">GeoAmbiental AI</span>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/auth" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors hidden sm:inline-block">Entrar</Link>
            <Link to="/auth">
              <Button size="sm" className="shadow-md shadow-primary/10 hover:shadow-lg transition-all font-semibold">
                Começar agora
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-6 pt-24 pb-16 lg:pt-32 lg:pb-24 relative z-10">
        <div className="grid lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/20 bg-primary/5 text-xs font-semibold tracking-wide text-primary dark:text-primary animate-pulse">
              <Sparkles size={12} />
              <span>Geoprocessamento Ambiental Assistido por IA</span>
            </div>
            <h1 className="text-5xl lg:text-7xl font-bold leading-[1.1] text-balance font-serif tracking-tight">
              Diagnósticos ambientais <span className="gradient-text">técnicos</span> a partir de qualquer mapa.
            </h1>
            <p className="text-lg lg:text-xl text-muted-foreground text-balance max-w-2xl font-sans leading-relaxed">
              Envie PDF, GeoPDF, imagens georreferenciadas, ortofotos ou imagens de satélite e receba um relatório analítico estruturado e rigoroso em conformidade com o Código Florestal Brasileiro.
            </p>
            <div className="pt-2 flex flex-wrap gap-4">
              <Link to="/auth">
                <Button size="lg" className="h-12 px-8 text-base shadow-lg shadow-primary/15 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200">
                  Começar análise grátis <ArrowRight className="ml-2" size={16} />
                </Button>
              </Link>
              <a href="#modos">
                <Button size="lg" variant="outline" className="h-12 px-8 text-base border-border hover:bg-muted/50 transition-colors">
                  Ver modos de análise
                </Button>
              </a>
            </div>
          </div>
          <div className="lg:col-span-5 relative flex justify-center">
            {/* Visual preview representation */}
            <div className="relative w-full max-w-[450px] aspect-[4/3] rounded-2xl border border-border bg-card/50 backdrop-blur p-4 shadow-2xl rotate-1 lg:rotate-3 hover:rotate-0 transition-transform duration-500">
              <div className="absolute inset-0 bg-gradient-to-tr from-primary/10 to-accent/5 rounded-2xl pointer-events-none" />
              <div className="w-full h-full rounded-xl bg-muted/30 border border-border/50 flex flex-col justify-between p-4 relative overflow-hidden">
                <div className="flex items-center justify-between border-b border-border/40 pb-2">
                  <span className="text-xs font-semibold text-muted-foreground">🌎 RELATÓRIO AMBIENTAL</span>
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                </div>
                <div className="space-y-2 py-4">
                  <div className="h-4 bg-foreground/10 rounded w-[85%]" />
                  <div className="h-3 bg-foreground/5 rounded w-[95%]" />
                  <div className="h-3 bg-foreground/5 rounded w-[70%]" />
                  <div className="grid grid-cols-3 gap-2 pt-2">
                    <div className="h-12 rounded bg-primary/10 border border-primary/20 flex flex-col items-center justify-center"><span className="text-[10px] text-muted-foreground">Vegetação</span><span className="text-xs font-bold text-primary">64%</span></div>
                    <div className="h-12 rounded bg-destructive/10 border border-destructive/20 flex flex-col items-center justify-center"><span className="text-[10px] text-muted-foreground">APP</span><span className="text-xs font-bold text-destructive">Crítico</span></div>
                    <div className="h-12 rounded bg-accent/10 border border-accent/20 flex flex-col items-center justify-center"><span className="text-[10px] text-muted-foreground">Confiabilidade</span><span className="text-xs font-bold text-accent-foreground">Alta</span></div>
                  </div>
                </div>
                <div className="border-t border-border/40 pt-2 flex items-center justify-between text-[10px] text-muted-foreground">
                  <span>GeoAmbiental AI Engine v2.5</span>
                  <span>100% Completo</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Grid of Specialized Analysis Modes */}
      <section id="modos" className="bg-secondary/40 dark:bg-secondary/20 py-24 border-y border-border/60 transition-colors">
        <div className="max-w-7xl mx-auto px-6">
          <div className="max-w-3xl mb-16 space-y-3">
            <span className="text-xs font-bold uppercase tracking-widest text-primary">Módulos Especializados</span>
            <h2 className="text-4xl font-bold font-serif tracking-tight">11 modos de análise profunda com IA</h2>
            <p className="text-muted-foreground text-lg">Cada módulo aciona agentes de IA especializados com prompts moldados para atender especificamente a diferentes demandas técnicas e legais.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {ANALYSIS_MODES.map((m) => (
              <div key={m.id} className="group bg-card border border-border hover:border-primary/30 rounded-xl p-6 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-350 flex flex-col justify-between">
                <div>
                  <div className="w-12 h-12 rounded-lg bg-secondary flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform">{m.icon}</div>
                  <h3 className="font-semibold text-lg mb-2 group-hover:text-primary transition-colors">{m.label}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{m.description}</p>
                </div>
                {m.multiFile && (
                  <div className="mt-4 pt-3 border-t border-border/40 flex items-center gap-1.5 text-xs font-medium text-accent-foreground dark:text-accent">
                    <Sparkles size={12} />
                    <span>Suporta comparação multi-arquivos</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 max-w-7xl mx-auto px-6">
        <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
          <span className="text-xs font-bold uppercase tracking-widest text-primary">Prático e Veloz</span>
          <h2 className="text-4xl font-bold font-serif tracking-tight">Fluxo de trabalho em 3 passos</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-10">
          {[
            {
              step: "01",
              title: "Envie seus mapas",
              desc: "Carregue arquivos de até 20MB. Suportamos PDF, GeoPDF, GeoTIFF, TIFF, JPG e PNG em alta definição.",
              icon: <Leaf className="text-primary" size={24} />
            },
            {
              step: "02",
              title: "Selecione o modo",
              desc: "Escolha entre os 11 módulos de foco ecológico ou faça uma análise comparativa temporal com múltiplas fotos.",
              icon: <Sparkles className="text-primary" size={24} />
            },
            {
              step: "03",
              title: "Relatório profissional",
              desc: "Receba em segundos o laudo com dados tabulados, identificação de conflitos de lei e opções para exportar em PDF, CSV ou GeoJSON.",
              icon: <Shield className="text-primary" size={24} />
            }
          ].map((s, idx) => (
            <div key={idx} className="relative bg-card border border-border rounded-xl p-8 shadow-sm hover:shadow-md transition-shadow">
              <div className="absolute top-4 right-6 text-5xl font-bold text-muted/30 font-serif">{s.step}</div>
              <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center mb-6">{s.icon}</div>
              <h3 className="font-semibold text-xl mb-3">{s.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Warning CTA Banner */}
      <section className="max-w-7xl mx-auto px-6 pb-20">
        <div className="bg-primary/5 border border-primary/20 rounded-2xl p-8 lg:p-12 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm">
          <div className="space-y-2">
            <h3 className="text-xl lg:text-2xl font-bold font-serif">Pronto para digitalizar suas análises ambientais?</h3>
            <p className="text-sm text-muted-foreground max-w-xl">Crie sua conta agora mesmo e comece a gerar relatórios técnicos robustos estruturados por inteligência artificial.</p>
          </div>
          <Link to="/auth">
            <Button size="lg" className="shadow-md shadow-primary/10 whitespace-nowrap">
              Cadastrar Gratuitamente
            </Button>
          </Link>
        </div>
      </section>

      <footer className="border-t border-border bg-card py-12 transition-colors">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md gradient-eco flex items-center justify-center text-white text-xs">🌎</div>
            <span className="font-semibold text-sm">GeoAmbiental AI</span>
          </div>
          <p className="text-xs text-muted-foreground text-center md:text-right max-w-md leading-relaxed">
            &copy; {new Date().getFullYear()} GeoAmbiental AI. Os relatórios gerados são interpretações de dados assistidas por IA. Para fins jurídicos e oficiais, valide com laudos técnicos emitidos por profissionais habilitados (ART).
          </p>
        </div>
      </footer>
    </div>
  );
}


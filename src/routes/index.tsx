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

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-background/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-md gradient-eco flex items-center justify-center text-white text-sm">🌎</div>
            <span className="font-semibold text-lg">GeoAmbiental AI</span>
          </div>
          <Link to="/auth"><Button>Entrar</Button></Link>
        </div>
      </header>

      <section className="max-w-6xl mx-auto px-6 py-20 lg:py-28">
        <div className="max-w-3xl">
          <span className="inline-block text-xs font-semibold tracking-widest uppercase text-primary mb-4">Geoprocessamento ambiental assistido por IA</span>
          <h1 className="text-5xl lg:text-6xl font-bold leading-tight text-balance text-foreground">
            Diagnósticos ambientais técnicos a partir de qualquer mapa georreferenciado.
          </h1>
          <p className="mt-6 text-lg text-muted-foreground text-balance">
            Envie PDF, GeoPDF, JPG, PNG, TIFF, GeoTIFF, ortofotos, cartas topográficas ou imagens de satélite e receba um relatório técnico completo: cobertura vegetal, APP, hidrografia, uso do solo, fragilidade ambiental, conflitos e parecer técnico final.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/auth"><Button size="lg" className="text-base h-12 px-7">Começar análise</Button></Link>
            <a href="#modos"><Button size="lg" variant="outline" className="text-base h-12 px-7">Ver modos de análise</Button></a>
          </div>
        </div>
      </section>

      <section id="modos" className="bg-secondary/50 py-20">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl font-bold mb-2">11 modos de análise especializados</h2>
          <p className="text-muted-foreground mb-10">Cada modo aciona um prompt técnico especialista para gerar o relatório certo para o seu objetivo.</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {ANALYSIS_MODES.map((m) => (
              <div key={m.id} className="bg-card border border-border rounded-lg p-5 hover:shadow-md transition-shadow">
                <div className="text-3xl mb-2">{m.icon}</div>
                <h3 className="font-semibold text-lg mb-1">{m.label}</h3>
                <p className="text-sm text-muted-foreground">{m.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="max-w-4xl mx-auto px-6 grid md:grid-cols-3 gap-8 text-center">
          {[
            { t: "1. Envie", d: "Drag-and-drop de mapas e imagens (até 20 MB)." },
            { t: "2. Escolha o modo", d: "Selecione o foco da análise ambiental." },
            { t: "3. Receba o relatório", d: "Diagnóstico técnico, indicadores, conflitos e parecer final exportáveis." },
          ].map((s) => (
            <div key={s.t}>
              <div className="text-primary font-serif text-2xl mb-2">{s.t}</div>
              <p className="text-muted-foreground">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">
        <p>GeoAmbiental AI • Relatórios são interpretações visuais assistidas por IA — para fins legais, valide com laudo de profissional habilitado.</p>
      </footer>
    </div>
  );
}

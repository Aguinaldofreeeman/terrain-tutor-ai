// Report export helpers (CSV, GeoJSON, simple printable HTML for PDF via window.print)
export type AnalysisResult = {
  titulo?: string;
  resumoExecutivo?: string;
  diagnosticoTecnico?: string;
  feicoesDetectadas?: Array<{ tipo: string; descricao: string; confianca?: string }>;
  areasCriticas?: Array<{ nome: string; descricao: string; severidade?: string }>;
  conflitosAmbientais?: Array<{ tipo: string; descricao: string; baseLegal?: string }>;
  indicadores?: Array<{ nome: string; valor: number; unidade: string; percentual?: number }>;
  recomendacoes?: Array<{ acao: string; prioridade?: string; justificativa: string }>;
  metadadosGeograficos?: Record<string, string | undefined>;
  parecerFinal?: string;
};

function download(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportCSV(result: AnalysisResult, baseName = "relatorio") {
  const rows: string[] = [];
  rows.push("Seção,Item,Detalhe,Extra");
  const escape = (s: any) => `"${String(s ?? "").replace(/"/g, '""')}"`;
  (result.feicoesDetectadas ?? []).forEach((f) =>
    rows.push(["Feição", f.tipo, f.descricao, f.confianca ?? ""].map(escape).join(",")));
  (result.areasCriticas ?? []).forEach((a) =>
    rows.push(["Área Crítica", a.nome, a.descricao, a.severidade ?? ""].map(escape).join(",")));
  (result.conflitosAmbientais ?? []).forEach((c) =>
    rows.push(["Conflito", c.tipo, c.descricao, c.baseLegal ?? ""].map(escape).join(",")));
  (result.indicadores ?? []).forEach((i) =>
    rows.push(["Indicador", i.nome, `${i.valor} ${i.unidade}`, i.percentual != null ? `${i.percentual}%` : ""].map(escape).join(",")));
  (result.recomendacoes ?? []).forEach((r) =>
    rows.push(["Recomendação", r.acao, r.justificativa, r.prioridade ?? ""].map(escape).join(",")));
  download(`${baseName}.csv`, rows.join("\n"), "text/csv;charset=utf-8");
}

export function exportGeoJSON(result: AnalysisResult, baseName = "relatorio") {
  const features = (result.feicoesDetectadas ?? []).map((f, idx) => ({
    type: "Feature",
    properties: { id: idx, tipo: f.tipo, descricao: f.descricao, confianca: f.confianca },
    geometry: null,
  }));
  const geo = {
    type: "FeatureCollection",
    properties: { titulo: result.titulo, parecer: result.parecerFinal },
    features,
  };
  download(`${baseName}.geojson`, JSON.stringify(geo, null, 2), "application/geo+json");
}

export function exportPDF(result: AnalysisResult, imageUrl?: string) {
  const w = window.open("", "_blank");
  if (!w) return;
  const safe = (s?: string) => (s ?? "").replace(/</g, "&lt;");
  const list = (arr: any[] | undefined, render: (x: any) => string) =>
    !arr?.length ? "<p><em>Nenhum item.</em></p>" : `<ul>${arr.map(render).join("")}</ul>`;

  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${safe(result.titulo) || "Relatório Técnico"}</title>
  <style>
    body{font-family:Georgia,serif;max-width:820px;margin:40px auto;padding:0 24px;color:#1a1a1a;line-height:1.55}
    h1{border-bottom:3px solid #2d6a3e;padding-bottom:8px;color:#1a3c2a}
    h2{margin-top:28px;color:#2d6a3e;border-bottom:1px solid #ddd;padding-bottom:4px}
    .meta{background:#f4f6f3;padding:12px;border-radius:6px;font-size:13px}
    img{max-width:100%;border:1px solid #ccc;margin:12px 0}
    table{width:100%;border-collapse:collapse;margin:8px 0}
    th,td{border:1px solid #ddd;padding:6px 8px;text-align:left;font-size:13px}
    th{background:#eef3ec}
    .sev-alta{color:#b91c1c;font-weight:bold}
    .sev-media{color:#b45309}
    .sev-baixa{color:#15803d}
    @media print{ button{display:none} }
  </style></head><body>
  <button onclick="window.print()" style="padding:8px 16px;background:#2d6a3e;color:#fff;border:0;border-radius:4px;cursor:pointer">Imprimir / Salvar PDF</button>
  <h1>${safe(result.titulo) || "Relatório Técnico Ambiental"}</h1>
  ${imageUrl ? `<img src="${imageUrl}" alt="Mapa analisado"/>` : ""}
  <h2>Resumo Executivo</h2><p>${safe(result.resumoExecutivo)}</p>
  <h2>Diagnóstico Técnico</h2><div>${safe(result.diagnosticoTecnico).replace(/\n/g, "<br/>")}</div>
  <h2>Feições Detectadas</h2>
  ${result.feicoesDetectadas?.length ? `<table><thead><tr><th>Tipo</th><th>Descrição</th><th>Confiança</th></tr></thead><tbody>${result.feicoesDetectadas.map(f => `<tr><td>${safe(f.tipo)}</td><td>${safe(f.descricao)}</td><td>${safe(f.confianca)}</td></tr>`).join("")}</tbody></table>` : "<p><em>Nenhuma feição detectada.</em></p>"}
  <h2>Áreas Críticas</h2>
  ${list(result.areasCriticas, (a) => `<li><strong>${safe(a.nome)}</strong> <span class="sev-${a.severidade}">[${safe(a.severidade)}]</span><br/>${safe(a.descricao)}</li>`)}
  <h2>Conflitos Ambientais</h2>
  ${list(result.conflitosAmbientais, (c) => `<li><strong>${safe(c.tipo)}</strong> ${c.baseLegal ? `<em>(${safe(c.baseLegal)})</em>` : ""}<br/>${safe(c.descricao)}</li>`)}
  <h2>Indicadores Ambientais</h2>
  ${result.indicadores?.length ? `<table><thead><tr><th>Indicador</th><th>Valor</th><th>%</th></tr></thead><tbody>${result.indicadores.map(i => `<tr><td>${safe(i.nome)}</td><td>${i.valor} ${safe(i.unidade)}</td><td>${i.percentual ?? "-"}</td></tr>`).join("")}</tbody></table>` : "<p><em>Sem indicadores.</em></p>"}
  <h2>Recomendações Técnicas</h2>
  ${list(result.recomendacoes, (r) => `<li><strong>${safe(r.acao)}</strong> <span class="sev-${r.prioridade}">[${safe(r.prioridade)}]</span><br/>${safe(r.justificativa)}</li>`)}
  <h2>Metadados Geográficos</h2>
  <div class="meta">${Object.entries(result.metadadosGeograficos || {}).map(([k, v]) => `<div><strong>${safe(k)}:</strong> ${safe(String(v ?? "-"))}</div>`).join("") || "<em>Não extraídos.</em>"}</div>
  <h2>Parecer Técnico Final</h2><p>${safe(result.parecerFinal)}</p>
  <hr/><p style="font-size:11px;color:#666">Relatório gerado por GeoAmbiental AI • ${new Date().toLocaleString("pt-BR")}<br/>Esta análise é uma interpretação visual assistida por IA; para fins legais/oficiais, valide com software GIS dedicado e laudo de profissional habilitado.</p>
  </body></html>`);
  w.document.close();
}

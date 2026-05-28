export type AnalysisMode = {
  id: string;
  label: string;
  short: string;
  description: string;
  icon: string;
  multiFile?: boolean;
};

export const ANALYSIS_MODES: AnalysisMode[] = [
  { id: "geral", label: "Diagnóstico Ambiental Geral", short: "Geral",
    description: "Cobertura vegetal, hidrografia, relevo, uso do solo, ocupação, degradação e pressão antrópica.",
    icon: "🌎" },
  { id: "app", label: "APP – Área de Preservação Permanente", short: "APP",
    description: "Margens, nascentes, mata ciliar, conflitos de uso conforme Código Florestal.", icon: "🌿" },
  { id: "hidrico", label: "Recursos Hídricos e Hidrologia", short: "Hidrologia",
    description: "Rios, drenagens, bacias, nascentes, áreas de inundação, conectividade hídrica.", icon: "💧" },
  { id: "uso_solo", label: "Uso e Ocupação do Solo", short: "Uso do solo",
    description: "Classificação por classes e percentuais (agricultura, pastagem, urbano, etc).", icon: "🗺️" },
  { id: "vegetacao", label: "Cobertura Vegetal e Fragmentação", short: "Vegetação",
    description: "Vegetação densa/esparsa, mata ciliar, fragmentos, conectividade ecológica.", icon: "🌳" },
  { id: "relevo", label: "Relevo, Topografia e Declividade", short: "Relevo",
    description: "Curvas, declividade, encostas, vales, suscetibilidade a erosão.", icon: "⛰️" },
  { id: "fragilidade", label: "Fragilidade Ambiental", short: "Fragilidade",
    description: "Vulnerabilidade, sensibilidade ecológica, risco erosivo, classificação.", icon: "⚠️" },
  { id: "degradacao", label: "Degradação Ambiental", short: "Degradação",
    description: "Erosão, voçorocas, desmatamento, queimadas, supressão vegetal.", icon: "🔥" },
  { id: "licenciamento", label: "Licenciamento Ambiental", short: "Licenciamento",
    description: "Avaliação locacional preliminar, restrições e conflitos legais.", icon: "📋" },
  { id: "prad", label: "Recuperação Ambiental / PRAD", short: "PRAD",
    description: "Áreas com potencial de recuperação e medidas técnicas sugeridas.", icon: "♻️" },
  { id: "comparacao", label: "Comparação Temporal", short: "Comparação",
    description: "Compare 2+ imagens e detecte mudanças territoriais ao longo do tempo.", icon: "🕒", multiFile: true },
];

export const ACCEPTED_TYPES =
  ".pdf,.geopdf,.jpg,.jpeg,.png,.tif,.tiff,.geotiff,image/jpeg,image/png,image/tiff,application/pdf";

export const MAX_FILE_MB = 20;

export const MAX_FILES = 10;

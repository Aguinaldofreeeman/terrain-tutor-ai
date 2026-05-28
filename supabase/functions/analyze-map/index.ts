// @ts-nocheck
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MODE_PROMPTS: Record<string, string> = {
  geral: `Realize um DIAGNÓSTICO AMBIENTAL GERAL de alta fidelidade técnica. Identifique e descreva com rigor científico: cobertura vegetal (densidade, fitofisionomia aproximada), hidrografia (cursos d'água principais e secundários, corpos d'água lênticos/lóticos), relevo (formas, declividade e compartimentação), uso e cobertura da terra, ocupação territorial (infraestrutura, benfeitorias), áreas degradadas (erosão, cicatrizes), áreas preservadas (remanescentes florestais, RL), pressão antrópica nas bordas e o índice qualitativo de fragmentação ambiental. Estruture a resposta com tópicos detalhados.`,
  app: `Análise técnica específica de ÁREAS DE PRESERVAÇÃO PERMANENTE (APP) conforme as regras do Código Florestal Brasileiro (Lei Federal nº 12.651/2012) e Resoluções CONAMA correlatas. Identifique detalhadamente: margens de rios, córregos (e suas respectivas faixas de proteção de 30m, 50m, 100m, etc. com base na largura estimada do canal), nascentes e olhos d'água (raio mínimo de 50m), lagos/lagoas, reservatórios artificiais, áreas úmidas/veredas. Avalie a integridade ecológica da vegetação ciliar, detecte intervenções não autorizadas, ocupações consolidadas ou de baixo impacto na APP, e aponte conflitos diretos de uso com a legislação ambiental em vigor.`,
  hidrico: `Análise hidrológica e de recursos hídricos. Identifique e mapeie canais de drenagem, rios, riachos, córregos, nascentes, lagos, represas, várzeas e planícies de inundação. Analise o padrão de drenagem (dendrítico, retangular, etc.), o estado de conservação dos leitos (presença de assoreamento, desvios de curso, barramentos), a conectividade da rede de drenagem e possíveis fontes de poluição ou assoreamento visíveis na imagem.`,
  uso_solo: `Análise quantitativa e qualitativa de USO E COBERTURA DA TERRA. Classifique e quantifique percentualmente (com base nas texturas, formas e cores da imagem): áreas de agricultura (anual ou perene), pastagens, vegetação nativa florestal, vegetação nativa campestre/cerrado, áreas úmidas, silvicultura (reflorestamento), áreas urbanizadas/infraestrutura, solo exposto, mineração/extração mineral, estradas/vias e corpos d'água. Apresente os percentuais estimados para cada classe em uma tabela Markdown dentro do diagnóstico técnico.`,
  vegetacao: `Análise fitogeográfica e de fragmentação florestal. Identifique tipologias vegetacionais (floresta densa, capoeira, cerrado, vegetação esparsa) e áreas de mata ciliar. Avalie a fragmentação ecológica: identifique fragmentos florestais isolados (tamanho relativo, efeito de borda), corredores ecológicos existentes ou necessários para restabelecer a conectividade ecológica entre remanescentes de vegetação nativa, e calcule o índice qualitativo de conectividade ambiental.`,
  relevo: `Análise geomorfológica, topográfica e de declividade. Interprete as formas do relevo a partir das texturas, sombreamento e curvas de nível (se visíveis): topos de morro, encostas, planícies, vales e talvegues. Estime as classes de declividade (plano, suave ondulado, ondulado, forte ondulado, montanhoso, escarpado) e identifique zonas de alta vulnerabilidade à erosão, risco de escorregamento de terra e processos de dinâmica superficial.`,
  fragilidade: `Análise detalhada de FRAGILIDADE AMBIENTAL integrada. Combine as informações visíveis de declividade, cobertura vegetal, proximidade hídrica e exposição do solo para classificar as diferentes porções do mapa em classes de fragilidade (Baixa, Média, Alta e Muito Alta). Justifique cada classificação com base no perigo de degradação ambiental (risco de voçorocamento, assoreamento, perda de solo e vulnerabilidade ecológica geral).`,
  degradacao: `Monitoramento técnico de degradação ambiental. Investigue ativamente sinais visuais de: processos erosivos (sulcos, ravinas, voçorocas), assoreamento de corpos d'água, focos de desmatamento/supressão vegetal recente, cicatrizes de incêndio ou queimadas, solo compactado por pisoteio ou máquinas, minerações abandonadas/sem recuperação, depósitos irregulares de resíduos e expansão urbana/agrícola desordenada.`,
  licenciamento: `Avaliação locacional prévia para fins de LICENCIAMENTO AMBIENTAL. Analise as restrições legais e ecológicas da área: presença de Unidades de Conservação (UCs) nas proximidades, Terras Indígenas ou quilombolas, APPs, Reserva Legal, declividades proibitivas (>45°), e recursos hídricos. Avalie a viabilidade locacional para diferentes tipologias de empreendimentos (infraestrutura, agropecuária, loteamentos) e aponte os potenciais estudos exigidos (EIA/RIMA, EAS, RAP) e licenças aplicáveis.`,
  prad: `Diagnóstico para elaboração de Plano de Recuperação de Áreas Degradadas (PRAD) ou Projeto de Recomposição de Áreas Degradadas e Alteradas. Identifique áreas degradadas ou com passivo ambiental (ex: APPs desprovidas de vegetação, encostas erodidas, solo exposto) e prescreva técnicas de recuperação ambiental adequadas: plantio total, adensamento, enriquecimento, regeneração natural conduzida, controle de erosão física (paliçadas, canaletas), retaludamento, adubação verde e cercamento para isolamento de fatores de degradação.`,
  comparacao: `Análise multitemporal e dinâmica territorial. Compare sistematicamente as imagens fornecidas em ordem cronológica (ou de datas informadas). Identifique alterações na paisagem: taxa de desmatamento ou regeneração vegetal, avanço da fronteira agrícola, expansão urbana, alterações no nível da água de reservatórios/rios, surgimento de novas estradas ou empreendimentos. Forneça dados estimados de transição de uso do solo entre as datas.`,
};

const SYSTEM_PROMPT = `Você é um especialista sênior em geoprocessamento ambiental, cartografia, sensoriamento remoto e análise territorial, com mais de 20 anos de experiência em diagnósticos ambientais, licenciamento e PRAD no Brasil.

Sua tarefa é analisar o mapa, ortofoto ou imagem georreferenciada fornecido(a) e produzir um relatório técnico ambiental extremamente robusto, científico, formal e tecnicamente fundamentado.

METODOLOGIA DE ANÁLISE DE IMAGEM:
Para interpretar a imagem, utilize as chaves clássicas de fotointerpretação:
1. Tonalidade e Cor: Tonalidades de verde (vegetação ativa, quanto mais escuro, mais denso), marrom/palha (solo exposto, culturas secas ou preparo de terra), azul/preto (corpos d'água lênticos ou profundos, cursos d'água lineares), cinza/branco/azul-claro (áreas impermeabilizadas, telhados, pavimentação).
2. Textura: Áspera ou rugosa (floresta nativa, matas altas), lisa (espelho d'água, gramados, solo plano preparado), granulada (culturas arbóreas, pomares, silvicultura).
3. Padrão e Forma: Padrões retilíneos ou geométricos (lotes urbanos, plantios agrícolas comerciais, reflorestamentos), formas sinuosas e ramificadas (rede de drenagem natural, matas de galeria), linhas contínuas estreitas (rodovias, estradas de terra, faixas de servidão).
4. Sombras: Podem indicar relevo movimentado (vales profundos, cristas) ou altura de dossel florestal.

DIRETRIZES LEGAIS (LEGISLAÇÃO BRASILEIRA):
* Sempre correlacione seus achados com o Novo Código Florestal (Lei nº 12.651/2012) ao avaliar APPs (Áreas de Preservação Permanente) e Reserva Legal (RL).
* Lembre-se das faixas de APP de rios/córregos: 30m para cursos d'água com menos de 10m de largura; 50m para rios de 10 a 50m; 100m para rios de 50 a 200m; raio de 50m para nascentes perenes ou intermitentes.
* Cite resoluções do CONAMA pertinentes (ex: CONAMA 302/2002, 303/2002) se aplicável.

IMPORTANTE:
- Responda SEMPRE em português brasileiro técnico e formal.
- Seja específico, evite generalidades. Sempre que estimar valores (como porcentagens de cobertura ou comprimentos de faixas), mencione explicitamente que são estimativas visuais obtidas por fotointerpretação.
- O campo "diagnosticoTecnico" DEVE conter um texto longo estruturado com títulos (ex: ### 1. Cobertura Vegetal), tópicos com marcadores, termos técnicos e tabelas Markdown se aplicável (especialmente para Uso do Solo).
- O campo "titulo" deve ser curto e formal.

Retorne ESTRITAMENTE um JSON válido seguindo este schema (sem texto fora do JSON, sem markdown, sem blocos de código \`\`\`json):
{
  "titulo": "string - título técnico curto da análise (ex: Diagnóstico Ambiental de Uso e Ocupação do Solo)",
  "resumoExecutivo": "string - 2-4 parágrafos resumindo os achados principais e o contexto da área",
  "diagnosticoTecnico": "string - análise técnica extremamente detalhada e estruturada com subtítulos em markdown (###) e listas de marcadores",
  "feicoesDetectadas": [{"tipo": "string - nome da feição (ex: Mata Ciliar, Solo Exposto)", "descricao": "string - descrição de sua localização e características visuais", "confianca": "alta|media|baixa"}],
  "areasCriticas": [{"nome": "string - nome da área (ex: Encosta Erosiva Setor Leste)", "descricao": "string - descrição detalhada do problema ou vulnerabilidade", "severidade": "alta|media|baixa"}],
  "conflitosAmbientais": [{"tipo": "string - tipo de infração ou conflito (ex: Supressão de APP de Nascente)", "descricao": "string - detalhamento da inconsistência", "baseLegal": "string - ex: Art. 4º da Lei Federal nº 12.651/2012"}],
  "indicadores": [{"nome": "string - ex: Cobertura Florestal Estimada", "valor": number, "unidade": "string - ex: % ou metros", "percentual": number opcional}],
  "recomendacoes": [{"acao": "string - recomendação prática", "prioridade": "alta|media|baixa", "justificativa": "string - justificativa técnica e legal"}],
  "metadadosGeograficos": {"escalaEstimada": "string opcional", "projecao": "string opcional", "epsg": "string opcional", "datum": "string opcional", "bbox": "string opcional", "coordenadas": "string opcional", "observacoes": "string opcional"},
  "parecerFinal": "string - parecer conclusivo, assinado como Parecer Técnico de Geoprocessamento Ambiental"
}`;


Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY não configurada" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Sessão inválida" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { analysisId, mode, filePaths, geoMetadata } = body as {
      analysisId: string;
      mode: string;
      filePaths: string[];
      geoMetadata?: Record<string, unknown>;
    };

    if (!analysisId || !mode || !filePaths?.length) {
      return new Response(JSON.stringify({ error: "Parâmetros ausentes" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (filePaths.length > 10) {
      return new Response(JSON.stringify({ error: "Máximo de 10 arquivos por análise" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Verify ownership
    const { data: analysis, error: aErr } = await admin
      .from("analyses").select("*").eq("id", analysisId).eq("user_id", user.id).maybeSingle();
    if (aErr || !analysis) {
      return new Response(JSON.stringify({ error: "Análise não encontrada" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await admin.from("analyses").update({ status: "processing" }).eq("id", analysisId);

    // Download all files and convert to base64 data URLs for the model.
    const imageParts: Array<{ type: "image_url"; image_url: { url: string } }> = [];
    for (const path of filePaths) {
      const { data: blob, error: dlErr } = await admin.storage.from("maps").download(path);
      if (dlErr || !blob) throw new Error(`Falha ao baixar arquivo: ${path}`);
      const arrayBuf = await blob.arrayBuffer();
      const bytes = new Uint8Array(arrayBuf);
      // Convert to base64 (chunked to avoid stack overflow)
      let binary = "";
      const chunk = 0x8000;
      for (let i = 0; i < bytes.length; i += chunk) {
        binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)) as any);
      }
      const b64 = btoa(binary);
      let mime = blob.type || "image/png";
      // PDFs and TIFFs are not all natively supported by vision models; tell the model the type.
      if (path.toLowerCase().endsWith(".pdf")) mime = "application/pdf";
      else if (/\.(tiff?|geotiff)$/i.test(path)) mime = "image/tiff";
      imageParts.push({ type: "image_url", image_url: { url: `data:${mime};base64,${b64}` } });
    }

    const modePrompt = MODE_PROMPTS[mode] || MODE_PROMPTS.geral;

    const userText = [
      modePrompt,
      geoMetadata && Object.keys(geoMetadata).length
        ? `\n\nMetadados geográficos extraídos do arquivo: ${JSON.stringify(geoMetadata)}`
        : "",
      filePaths.length > 1
        ? `\n\nForam fornecidas ${filePaths.length} imagens — analise-as comparativamente em ordem cronológica.`
        : "",
      `\n\nRetorne APENAS o JSON do relatório técnico, sem markdown.`,
    ].join("");

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: [{ type: "text", text: userText }, ...imageParts],
          },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      let userMsg = "Falha na análise por IA";
      if (aiRes.status === 429) userMsg = "Limite de requisições excedido. Aguarde alguns instantes.";
      else if (aiRes.status === 402) userMsg = "Créditos da IA esgotados. Adicione créditos no workspace.";
      await admin.from("analyses").update({
        status: "failed",
        error_message: `${userMsg} (${aiRes.status}): ${errText.slice(0, 500)}`,
      }).eq("id", analysisId);
      return new Response(JSON.stringify({ error: userMsg, detail: errText }), {
        status: aiRes.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiJson = await aiRes.json();
    const content: string = aiJson.choices?.[0]?.message?.content ?? "{}";
    let result: any;
    try {
      result = JSON.parse(content);
    } catch {
      // Try to extract JSON block
      const match = content.match(/\{[\s\S]*\}/);
      result = match ? JSON.parse(match[0]) : { parecerFinal: content };
    }

    await admin.from("analyses").update({
      status: "completed",
      result,
      title: result.titulo || analysis.title,
    }).eq("id", analysisId);

    return new Response(JSON.stringify({ ok: true, result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("analyze-map error", err);
    return new Response(JSON.stringify({ error: err.message || "Erro interno" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

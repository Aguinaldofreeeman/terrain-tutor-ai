// @ts-nocheck
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MODE_PROMPTS: Record<string, string> = {
  geral: `Realize um DIAGNÓSTICO AMBIENTAL GERAL completo. Identifique e descreva: cobertura vegetal, hidrografia, relevo, uso do solo, ocupação territorial, áreas degradadas, áreas preservadas, pressão antrópica e fragmentação ambiental.`,
  app: `Análise específica de ÁREAS DE PRESERVAÇÃO PERMANENTE (APP) conforme Código Florestal Brasileiro (Lei 12.651/2012). Identifique: margens de rios, córregos, nascentes, lagoas, represas, áreas úmidas, veredas. Avalie presença/ausência de vegetação ciliar, ocupações dentro da APP e conflitos aparentes de uso.`,
  hidrico: `Análise de RECURSOS HÍDRICOS E HIDROLOGIA. Detecte: rios, canais, drenagens, cursos d'água, reservatórios, nascentes, bacias hidrográficas e áreas de inundação. Analise conectividade hídrica, preservação da drenagem e interferências antrópicas.`,
  uso_solo: `Análise de USO E OCUPAÇÃO DO SOLO. Classifique e quantifique percentualmente: agricultura, pastagem, vegetação nativa, floresta, reflorestamento, área urbana, solo exposto, mineração, corpos d'água e infraestrutura viária. Gere percentuais por classe.`,
  vegetacao: `Análise de COBERTURA VEGETAL E FRAGMENTAÇÃO FLORESTAL. Identifique: vegetação densa, vegetação esparsa, mata ciliar, áreas degradadas, corredores ecológicos, fragmentos isolados, conectividade ecológica. Calcule: percentual de cobertura vegetal, índice visual de fragmentação e conectividade ambiental.`,
  relevo: `Análise de RELEVO, TOPOGRAFIA E DECLIVIDADE. Interprete: curvas de nível, altitude, declividade, encostas, topo de morro, vales, drenagem natural, exposição do terreno. Identifique áreas suscetíveis à erosão, risco geomorfológico e instabilidade de encosta.`,
  fragilidade: `Análise de FRAGILIDADE AMBIENTAL. Avalie: vulnerabilidade ambiental, fragilidade do solo, fragilidade hídrica, sensibilidade ecológica, risco erosivo, suscetibilidade à degradação. Classifique em baixa, média, alta e muito alta fragilidade por região identificada.`,
  degradacao: `Análise de MONITORAMENTO DE DEGRADAÇÃO AMBIENTAL. Detecte sinais visuais de: erosão, voçorocas, ravinamento, desmatamento, assoreamento, queimadas, supressão vegetal, compactação do solo e expansão irregular.`,
  licenciamento: `Avaliação preliminar para LICENCIAMENTO AMBIENTAL. Analise viabilidade locacional para: supressão vegetal, parcelamento do solo, instalação de infraestrutura, empreendimentos rurais. Aponte áreas sensíveis, restrições ambientais aparentes e possíveis conflitos legais.`,
  prad: `Análise para RECUPERAÇÃO AMBIENTAL / PRAD. Identifique áreas com potencial de recuperação e sugira: recomposição vegetal, revegetação ciliar, controle erosivo, recuperação de solo exposto, recuperação de drenagens degradadas.`,
  comparacao: `COMPARAÇÃO TEMPORAL entre múltiplas imagens. Detecte e descreva: avanço urbano, perda vegetal, regeneração ambiental, alteração hídrica, expansão agrícola e mudanças territoriais. Quantifique mudanças quando possível.`,
};

const SYSTEM_PROMPT = `Você é um especialista sênior em geoprocessamento ambiental, cartografia, sensoriamento remoto e análise territorial, com mais de 20 anos de experiência em diagnósticos ambientais, licenciamento e PRAD no Brasil.

Analise o mapa/imagem georreferenciada fornecido(a) e produza um relatório técnico ambiental estruturado, rigoroso e tecnicamente fundamentado.

Extraia metadados geográficos visíveis (escala, coordenadas, legenda, projeção, datum, EPSG) quando disponíveis na imagem.

IMPORTANTE: Responda SEMPRE em português brasileiro técnico. Seja específico, evite generalidades. Quando estimar valores (percentuais, áreas), deixe claro que são estimativas visuais a partir da imagem.

Retorne ESTRITAMENTE um JSON válido seguindo este schema (sem texto fora do JSON, sem markdown, sem \`\`\`):
{
  "titulo": "string - título técnico curto da análise",
  "resumoExecutivo": "string - 2-4 parágrafos resumindo achados principais",
  "diagnosticoTecnico": "string - análise técnica detalhada (markdown permitido)",
  "feicoesDetectadas": [{"tipo": "string", "descricao": "string", "confianca": "alta|media|baixa"}],
  "areasCriticas": [{"nome": "string", "descricao": "string", "severidade": "alta|media|baixa"}],
  "conflitosAmbientais": [{"tipo": "string", "descricao": "string", "baseLegal": "string opcional"}],
  "indicadores": [{"nome": "string", "valor": number, "unidade": "string", "percentual": number opcional}],
  "recomendacoes": [{"acao": "string", "prioridade": "alta|media|baixa", "justificativa": "string"}],
  "metadadosGeograficos": {"escalaEstimada": "string opcional", "projecao": "string opcional", "epsg": "string opcional", "datum": "string opcional", "bbox": "string opcional", "coordenadas": "string opcional", "observacoes": "string opcional"},
  "parecerFinal": "string - conclusão técnica final e parecer profissional"
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

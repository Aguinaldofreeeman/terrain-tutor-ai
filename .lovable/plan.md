# Plataforma de Análise Ambiental Georreferenciada com IA

Aplicação web que recebe mapas/imagens georreferenciadas e gera relatórios técnicos ambientais automáticos usando IA multimodal (Gemini via Lovable AI Gateway).

## Stack

- **Frontend**: TanStack Start (template padrão) + Tailwind + shadcn/ui
- **Backend**: Lovable Cloud (Supabase) — Storage para arquivos, Postgres para análises/histórico, Edge Function para chamar a IA
- **IA**: Lovable AI Gateway — `google/gemini-2.5-pro` (multimodal, suporta análise de imagens grandes como mapas/ortofotos)
- **Mapa/Preview**: react-leaflet para visualização e camadas
- **PDF**: pdf.js para preview e extração; jsPDF para exportar relatório
- **GeoTIFF**: geotiff.js para leitura de metadados (EPSG, bbox, projeção)
- **Exportação**: PDF, CSV, GeoJSON

## Funcionalidades (escopo da v1)

### 1. Upload
- Drag-and-drop + input manual
- Aceita: PDF, GeoPDF, JPG, JPEG, PNG, TIFF, GeoTIFF
- Limite 20 MB por arquivo (limite Cloud Storage)
- Preview imediato (imagem ou primeira página do PDF)
- Upload para bucket privado `maps` no Cloud Storage

### 2. Seletor de Modo de Análise
Dropdown com os 11 modos solicitados:
1. Diagnóstico Ambiental Geral
2. APP – Área de Preservação Permanente
3. Recursos Hídricos e Hidrologia
4. Uso e Ocupação do Solo
5. Cobertura Vegetal e Fragmentação Florestal
6. Relevo, Topografia e Declividade
7. Fragilidade Ambiental
8. Monitoramento de Degradação Ambiental
9. Licenciamento Ambiental
10. Recuperação Ambiental / PRAD
11. Comparação Temporal (multi-arquivo)

Cada modo carrega um system prompt especializado que orienta o Gemini a estruturar a resposta naquela ótica.

### 3. Extração de Metadados Geográficos
- GeoTIFF → `geotiff.js` extrai bbox, EPSG, projeção, resolução
- GeoPDF/PDF → `pdf.js` lê metadados, OCR via Gemini para informação visual
- Imagens comuns → IA tenta inferir escala/orientação a partir de legendas visíveis
- Resultados exibidos em painel "Dados Geográficos"

### 4. Análise por IA
- Edge Function `analyze-map` recebe `{ fileUrl, mode, comparisonFiles? }`
- Carrega a imagem (ou converte primeira página do PDF) e envia ao Gemini com prompt especializado
- Solicita output estruturado (Zod schema) com:
  - `resumoExecutivo`
  - `diagnosticoTecnico`
  - `feicoesDetectadas[]` (tipo, descrição, confiança)
  - `areasCriticas[]`
  - `conflitosAmbientais[]`
  - `indicadores[]` (nome, valor, unidade, percentual)
  - `recomendacoes[]`
  - `parecerFinal`
- Streaming de progresso visual

### 5. Visualização de Resultados
- Layout 2 colunas: preview do mapa (com zoom/pan via react-zoom-pan-pinch) à esquerda, painel de resultados à direita com tabs:
  - Resumo
  - Feições
  - Indicadores (gráficos com recharts)
  - Conflitos
  - Recomendações
  - Parecer
  - Metadados geográficos
- Botões de exportação: PDF, CSV, GeoJSON

### 6. Comparação Temporal
- Modo dedicado que aceita 2+ arquivos
- IA recebe ambas imagens e gera relatório de mudanças

### 7. Histórico
- Tabela `analyses` no Cloud guarda análises por usuário
- Página `/historico` lista análises anteriores

### 8. Autenticação
- Email/senha simples via Cloud Auth (auto-confirm habilitado para evitar fricção)
- Rotas protegidas; landing pública

## Banco de Dados

```
analyses
  id uuid pk
  user_id uuid → auth.users
  file_name text
  file_path text         -- caminho no bucket
  mode text              -- modo de análise
  metadata jsonb         -- bbox, epsg, etc
  result jsonb           -- relatório estruturado completo
  created_at timestamptz

storage bucket: maps (privado, com RLS para owner)
```

RLS: usuário só lê/escreve as próprias análises e arquivos.

## Edge Functions

- `analyze-map` — chama Gemini com prompt + imagem, retorna relatório estruturado
- `extract-geo-metadata` — tenta extrair EPSG/bbox de GeoTIFF/GeoPDF server-side

## Estrutura de Páginas

- `/` — landing + CTA login
- `/auth` — login/cadastro
- `/app` — workspace principal (upload + análise)
- `/app/$id` — visualização de análise específica
- `/historico` — lista de análises

## Limitações Honestas a Comunicar ao Usuário

A IA faz interpretação **visual** dos mapas. Ela não substitui processamento GIS real (não calcula áreas vetoriais com precisão sub-métrica, não roda algoritmos de classificação supervisionada tipo NDVI sobre bandas espectrais brutas). Os percentuais e indicadores são estimativas visuais. Para análises legais/oficiais, validar com software GIS dedicado.

Exportação shapefile fica como "futuro" (requer biblioteca pesada); GeoJSON cobre o caso.

## Etapas de Implementação

1. Scaffold web_app + ativar Lovable Cloud
2. Esquema DB (analyses + bucket maps + RLS) e auth básico
3. Edge function `analyze-map` com Lovable AI Gateway + Zod structured output
4. UI: upload, seletor de modo, preview, painel de resultados
5. Extração de metadados (geotiff.js client-side)
6. Exportação PDF/CSV/GeoJSON
7. Histórico
8. Comparação temporal
9. Polimento visual

Posso seguir com a implementação?
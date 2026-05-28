## Permitir upload de até 10 arquivos

Atualmente o workspace só aceita múltiplos arquivos no modo "comparação" e sem limite explícito. Vou padronizar para até **10 arquivos por análise** em todos os modos.

### Mudanças

**`src/routes/app.index.tsx`**
- Adicionar constante `MAX_FILES = 10`.
- Permitir `multiple` no input sempre (não só em modo comparação).
- Em `onFiles`: limitar total a 10 (avisar via toast se exceder) e acumular ao invés de substituir.
- Atualizar texto da zona de upload: "Envie até 10 arquivos".
- Manter regra do modo comparação (mínimo 2).

**`src/lib/analysisModes.ts`**
- Exportar `MAX_FILES = 10` para uso consistente.

**`supabase/functions/analyze-map/index.ts`**
- Já itera sobre `filePaths[]`, então funciona com N arquivos. Adicionar validação defensiva: rejeitar se `filePaths.length > 10` para evitar abuso/custos altos com Gemini.
- Ajustar o texto do prompt do usuário para refletir "N imagens" genericamente (já faz isso).

### Sem alterações
- Schema do banco (`comparison_paths` já é array).
- Storage bucket e RLS.
- UI de resultados.

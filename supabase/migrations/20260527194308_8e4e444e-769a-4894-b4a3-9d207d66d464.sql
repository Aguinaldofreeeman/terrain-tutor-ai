
-- Table for storing environmental analyses
CREATE TABLE public.analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Análise sem título',
  mode TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_mime TEXT,
  comparison_paths TEXT[],
  geo_metadata JSONB DEFAULT '{}'::jsonb,
  result JSONB,
  status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.analyses TO authenticated;
GRANT ALL ON public.analyses TO service_role;

ALTER TABLE public.analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_select_own_analyses" ON public.analyses
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "users_insert_own_analyses" ON public.analyses
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users_update_own_analyses" ON public.analyses
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "users_delete_own_analyses" ON public.analyses
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX analyses_user_created_idx ON public.analyses(user_id, created_at DESC);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER analyses_set_updated_at BEFORE UPDATE ON public.analyses
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Storage bucket for map files (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('maps', 'maps', false)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: users access their own folder (path starts with user_id/)
CREATE POLICY "users_select_own_maps" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'maps' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "users_insert_own_maps" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'maps' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "users_update_own_maps" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'maps' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "users_delete_own_maps" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'maps' AND (storage.foldername(name))[1] = auth.uid()::text);

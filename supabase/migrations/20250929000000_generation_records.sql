-- Generation records table for image generation (txt2img / img2img)
-- Tracks lifecycle without credits/payment concerns

-- Ensure required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create table
CREATE TABLE IF NOT EXISTS public.generation_records (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('txt2img', 'img2img')),
  prompt text NOT NULL,
  input_images jsonb NOT NULL DEFAULT '[]'::jsonb,
  output_image_url text,
  provider_job_id text,
  status text NOT NULL CHECK (status IN ('queued', 'processing', 'succeeded', 'failed')),
  error text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Indexes
CREATE INDEX IF NOT EXISTS generation_records_user_id_idx ON public.generation_records(user_id);
CREATE INDEX IF NOT EXISTS generation_records_status_idx ON public.generation_records(status);
CREATE INDEX IF NOT EXISTS generation_records_created_at_idx ON public.generation_records(created_at);
CREATE INDEX IF NOT EXISTS generation_records_provider_job_id_idx ON public.generation_records(provider_job_id);

-- updated_at trigger (function defined in previous migrations as update_updated_at_column)
DROP TRIGGER IF EXISTS handle_generation_records_updated_at ON public.generation_records;
CREATE TRIGGER handle_generation_records_updated_at
  BEFORE UPDATE ON public.generation_records
  FOR EACH ROW
  EXECUTE PROCEDURE update_updated_at_column();

-- Enable RLS
ALTER TABLE public.generation_records ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Users can view their own generation records" ON public.generation_records;
DROP POLICY IF EXISTS "Users can insert their own generation records" ON public.generation_records;
DROP POLICY IF EXISTS "Users can update their own generation records" ON public.generation_records;
DROP POLICY IF EXISTS "Users can delete their own generation records" ON public.generation_records;

CREATE POLICY "Users can view their own generation records"
  ON public.generation_records FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own generation records"
  ON public.generation_records FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own generation records"
  ON public.generation_records FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own generation records"
  ON public.generation_records FOR DELETE
  USING (auth.uid() = user_id);

-- Grants
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON public.generation_records TO authenticated;
GRANT ALL ON public.generation_records TO service_role;

ALTER TABLE public.generation_records ALTER COLUMN user_id DROP NOT NULL;
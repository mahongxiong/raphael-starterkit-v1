-- 1. 添加 generation_round 列，如果不存在
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name='generated_names'
          AND column_name='generation_round'
          AND table_schema='public'
    ) THEN
        ALTER TABLE public.generated_names
        ADD COLUMN generation_round integer NOT NULL DEFAULT 1;
    END IF;
END
$$;

-- 2. 更新已有数据，确保旧数据有默认值
UPDATE public.generated_names
SET generation_round = 1
WHERE generation_round IS NULL OR generation_round = 0;

-- 3. 添加注释（如果还没有的话）
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_description d
        JOIN pg_class c ON c.oid = d.objoid
        JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum = d.objsubid
        WHERE c.relname = 'generated_names'
          AND a.attname = 'generation_round'
    ) THEN
        COMMENT ON COLUMN public.generated_names.generation_round
        IS 'Indicates which generation round within the same batch (1, 2, 3, etc.). Each round generates 6 names and represents a page in the UI.';
    END IF;
END
$$;

-- 4. 创建索引（幂等）
CREATE INDEX IF NOT EXISTS generated_names_round_idx
ON public.generated_names(generation_round);

CREATE INDEX IF NOT EXISTS generated_names_batch_round_idx
ON public.generated_names(batch_id, generation_round);

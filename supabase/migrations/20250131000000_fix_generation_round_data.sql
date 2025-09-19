-- ================================================
-- Migration: Fix generation_round and related data
-- ================================================

-- 1️⃣ 确保 generation_round 列存在，如果不存在则添加
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name='generated_names' 
          AND column_name='generation_round'
    ) THEN
        ALTER TABLE public.generated_names
        ADD COLUMN generation_round integer DEFAULT 1;
    END IF;
END$$;

-- 2️⃣ 修复 NULL 或非法值
UPDATE public.generated_names 
SET generation_round = 1 
WHERE generation_round IS NULL OR generation_round <= 0;

-- 3️⃣ 添加正整数约束（如果不存在）
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'check_generation_round_positive'
    ) THEN
        ALTER TABLE public.generated_names
        ADD CONSTRAINT check_generation_round_positive
        CHECK (generation_round > 0);
    END IF;
END$$;

-- 4️⃣ 设置 NOT NULL（安全检查）
ALTER TABLE public.generated_names 
ALTER COLUMN generation_round SET NOT NULL;

-- 5️⃣ 更新 generation_batches 的 names_count
UPDATE public.generation_batches gb
SET names_count = sub.cnt
FROM (
    SELECT batch_id, COUNT(*) AS cnt
    FROM public.generated_names
    GROUP BY batch_id
) AS sub
WHERE gb.id = sub.batch_id
  AND (gb.names_count IS NULL OR gb.names_count = 0);

-- 6️⃣ 创建索引（如果不存在）
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_indexes 
        WHERE indexname = 'idx_generated_names_batch_id_round'
    ) THEN
        CREATE INDEX idx_generated_names_batch_id_round 
        ON public.generated_names(batch_id, generation_round);
    END IF;

    -- 将原本有子查询的索引改为普通索引
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_indexes 
        WHERE indexname = 'idx_generated_names_batch_id'
    ) THEN
        CREATE INDEX idx_generated_names_batch_id 
        ON public.generated_names(batch_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 
        FROM pg_indexes 
        WHERE indexname = 'idx_generation_batches_user_created'
    ) THEN
        CREATE INDEX idx_generation_batches_user_created 
        ON public.generation_batches(user_id, created_at DESC);
    END IF;
END$$;

-- 7️⃣ 添加约束说明
COMMENT ON CONSTRAINT check_generation_round_positive 
ON public.generated_names IS 'Ensures generation_round is always a positive integer (>= 1)';

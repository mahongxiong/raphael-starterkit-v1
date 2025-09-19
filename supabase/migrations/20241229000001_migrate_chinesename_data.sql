-- =========================
-- ChineseName.club -> Starter Kit Migration Script
-- =========================

-- Step 0: 确保 UUID 扩展可用
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Step 1: 创建旧表（如果不存在）
CREATE TABLE IF NOT EXISTS public.user_credits (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    total_credits integer DEFAULT 0 NOT NULL,
    remaining_credits integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.credit_transactions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    amount integer NOT NULL,
    transaction_type text NOT NULL,
    operation text DEFAULT 'name_generation',
    remaining_credits integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Step 2: 确保 customers.user_id 唯一
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'customers_user_id_unique'
    ) THEN
        ALTER TABLE public.customers
        ADD CONSTRAINT customers_user_id_unique UNIQUE (user_id);
    END IF;
END
$$;

-- Step 3: 创建迁移函数
CREATE OR REPLACE FUNCTION migrate_chinesename_credits()
RETURNS void AS $$
BEGIN
    -- 3.1 迁移 user_credits -> customers
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema='public' AND table_name='user_credits'
    ) THEN
        INSERT INTO public.customers (
            user_id,
            email,
            credits,
            creem_customer_id,
            created_at,
            updated_at,
            metadata
        )
        SELECT
            uc.user_id,
            COALESCE(au.email, 'unknown@example.com'),
            COALESCE(uc.remaining_credits, 0),
            'migrated_' || uc.user_id::text,
            uc.created_at,
            uc.updated_at,
            jsonb_build_object(
                'migrated_from','chinesename',
                'original_total_credits', uc.total_credits,
                'migration_date', now()
            )
        FROM user_credits uc
        LEFT JOIN auth.users au ON uc.user_id = au.id
        ON CONFLICT (user_id) DO UPDATE
        SET credits = EXCLUDED.credits,
            updated_at = EXCLUDED.updated_at,
            metadata = customers.metadata || EXCLUDED.metadata;

        RAISE NOTICE 'Migrated % user credit records', (SELECT COUNT(*) FROM user_credits);
    END IF;

    -- 3.2 迁移 credit_transactions -> credits_history
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema='public' AND table_name='credit_transactions'
    ) THEN
        INSERT INTO public.credits_history (
            customer_id,
            amount,
            type,
            description,
            created_at,
            metadata
        )
        SELECT
            c.id,
            ABS(ct.amount),
            CASE WHEN ct.amount<0 OR ct.transaction_type='spend' THEN 'subtract' ELSE 'add' END,
            COALESCE(ct.operation,'migrated_transaction'),
            ct.created_at,
            jsonb_build_object(
                'migrated_from','chinesename',
                'original_transaction_type', ct.transaction_type,
                'original_amount', ct.amount,
                'remaining_credits_at_time', ct.remaining_credits
            )
        FROM credit_transactions ct
        INNER JOIN customers c ON ct.user_id = c.user_id
        ON CONFLICT DO NOTHING;

        RAISE NOTICE 'Migrated % credit transaction records', (SELECT COUNT(*) FROM credit_transactions);
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Step 4: 执行迁移
SELECT migrate_chinesename_credits();

-- Step 5: 创建索引
CREATE INDEX IF NOT EXISTS user_credits_user_id_idx ON public.user_credits(user_id);
CREATE INDEX IF NOT EXISTS credit_transactions_user_id_idx ON public.credit_transactions(user_id);
CREATE INDEX IF NOT EXISTS credit_transactions_created_at_idx ON public.credit_transactions(created_at);

-- Step 6: 添加 migration_status 并更新已迁移记录
ALTER TABLE public.customers
ADD COLUMN IF NOT EXISTS migration_status text DEFAULT 'native';

UPDATE public.customers
SET migration_status = 'migrated_from_chinesename'
WHERE creem_customer_id LIKE 'migrated_%';

-- Step 7: 创建向后兼容视图
CREATE OR REPLACE VIEW public.user_credits_compat AS
SELECT
    gen_random_uuid() AS id,
    user_id,
    credits AS total_credits,
    credits AS remaining_credits,
    created_at,
    updated_at
FROM public.customers
WHERE migration_status = 'migrated_from_chinesename';

-- Step 8: 授权
GRANT SELECT ON public.user_credits_compat TO authenticated;
GRANT ALL ON public.user_credits TO service_role;
GRANT ALL ON public.credit_transactions TO service_role;

-- Step 9: 启用 RLS 并创建策略（幂等）
ALTER TABLE public.user_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;

-- user_credits policies
DROP POLICY IF EXISTS "Users can view their own credits" ON public.user_credits;
CREATE POLICY "Users can view their own credits"
ON public.user_credits FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role can manage user credits" ON public.user_credits;
CREATE POLICY "Service role can manage user credits"
ON public.user_credits FOR ALL
USING (auth.role() = 'service_role');

-- credit_transactions policies
DROP POLICY IF EXISTS "Users can view their own transactions" ON public.credit_transactions;
CREATE POLICY "Users can view their own transactions"
ON public.credit_transactions FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role can manage credit transactions" ON public.credit_transactions;
CREATE POLICY "Service role can manage credit transactions"
ON public.credit_transactions FOR ALL
USING (auth.role() = 'service_role');

-- Step 10: 完成通知
DO $$
BEGIN
    RAISE NOTICE 'ChineseName.club data migration completed successfully!';
    RAISE NOTICE 'Old tables (user_credits, credit_transactions) are preserved for backup.';
    RAISE NOTICE 'New unified system uses customers and credits_history tables.';
END $$;

-- 1️⃣ 启用 uuid 生成扩展
create extension if not exists "uuid-ossp";

-- 2️⃣ 创建自动更新 updated_at 的函数
create or replace function update_updated_at_column()
returns trigger as $$
begin
    new.updated_at = timezone('utc', now());
    return new;
end;
$$ language plpgsql;

-- 3️⃣ 创建 generation_batches 表
create table public.generation_batches (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid not null references auth.users(id) on delete cascade,
    english_name text not null,
    gender text not null check (gender in ('male', 'female', 'other')),
    birth_year text,
    personality_traits text,
    name_preferences text,
    plan_type text not null check (plan_type in ('1', '4')),
    credits_used integer not null default 0,
    names_count integer not null default 0,
    generation_metadata jsonb default '{}'::jsonb,
    created_at timestamp with time zone not null default timezone('utc'::text, now()),
    updated_at timestamp with time zone not null default timezone('utc'::text, now())
);

-- 4️⃣ 创建 generated_names 表
create table public.generated_names (
    id uuid primary key default uuid_generate_v4(),
    batch_id uuid not null references public.generation_batches(id) on delete cascade,
    chinese_name text not null,
    pinyin text not null,
    characters jsonb not null,
    meaning text not null,
    cultural_notes text not null,
    personality_match text not null,
    style text not null,
    position_in_batch integer not null,
    created_at timestamp with time zone not null default timezone('utc'::text, now()),
    updated_at timestamp with time zone not null default timezone('utc'::text, now())
);

-- 5️⃣ 创建索引
create index generation_batches_user_id_idx on public.generation_batches(user_id);
create index generation_batches_created_at_idx on public.generation_batches(created_at);
create index generation_batches_plan_type_idx on public.generation_batches(plan_type);

create index generated_names_batch_id_idx on public.generated_names(batch_id);
create index generated_names_position_idx on public.generated_names(position_in_batch);
create index generated_names_chinese_name_idx on public.generated_names(chinese_name);

-- 6️⃣ 创建 updated_at 触发器
create trigger handle_generation_batches_updated_at
before update on public.generation_batches
for each row
execute procedure update_updated_at_column();

create trigger handle_generated_names_updated_at
before update on public.generated_names
for each row
execute procedure update_updated_at_column();

-- 7️⃣ 启用 RLS
alter table public.generation_batches enable row level security;
alter table public.generated_names enable row level security;

-- 8️⃣ RLS 策略：generation_batches
create policy generation_batches_select
    on public.generation_batches for select
    using (auth.uid() = user_id);

create policy generation_batches_insert
    on public.generation_batches for insert
    with check (auth.uid() = user_id);

create policy generation_batches_update
    on public.generation_batches for update
    using (auth.uid() = user_id);

create policy generation_batches_delete
    on public.generation_batches for delete
    using (auth.uid() = user_id);

-- 9️⃣ RLS 策略：generated_names
create policy generated_names_select
    on public.generated_names for select
    using (
        exists (
            select 1 from public.generation_batches 
            where id = generated_names.batch_id 
            and user_id = auth.uid()
        )
    );

create policy generated_names_insert
    on public.generated_names for insert
    with check (
        exists (
            select 1 from public.generation_batches 
            where id = generated_names.batch_id 
            and user_id = auth.uid()
        )
    );

create policy generated_names_update
    on public.generated_names for update
    using (
        exists (
            select 1 from public.generation_batches 
            where id = generated_names.batch_id 
            and user_id = auth.uid()
        )
    );

create policy generated_names_delete
    on public.generated_names for delete
    using (
        exists (
            select 1 from public.generation_batches 
            where id = generated_names.batch_id 
            and user_id = auth.uid()
        )
    );

-- 10️⃣ 授权
grant usage on schema public to authenticated;
grant all on public.generation_batches to authenticated;
grant all on public.generated_names to authenticated;
grant all on public.generation_batches to service_role;
grant all on public.generated_names to service_role;

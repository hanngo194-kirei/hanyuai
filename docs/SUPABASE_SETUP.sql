-- ============================================================================
-- Hanyu AI — Cấu hình bảng lưu dữ liệu học tập trên Supabase (Gói Miễn Phí 0đ)
-- ============================================================================
-- Hướng dẫn thiết lập nhanh (4 bước):
-- 1. Truy cập https://supabase.com -> New project (Free tier) -> Chờ ~1 phút.
-- 2. Vào SQL Editor (biểu tượng >_ bên trái) -> New query -> Dán toàn bộ đoạn SQL
--    bên dưới rồi bấm Run để tạo bảng hanyu_user_data và bật bảo mật RLS.
-- 3. (Tùy chọn tiện lợi) Vào Authentication -> Providers -> Email -> tắt "Confirm email"
--    nếu muốn người học đăng ký xong dùng và đồng bộ ngay không cần bấm link email.
-- 4. Vào Project Settings -> Data API (hoặc API Keys) copy:
--      - Project URL (ví dụ https://xxxxxx.supabase.co)
--      - anon / publishable public key
--    Rồi điền vào file js/supabase-config.js HOẶC dán trực tiếp trong mục
--    "Cài đặt Supabase" ngay trong giao diện Đăng nhập của app Hanyu AI.
-- ============================================================================

create table if not exists public.hanyu_user_data (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.hanyu_user_data enable row level security;

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on table public.hanyu_user_data to authenticated;

drop policy if exists "Users can read own hanyu data" on public.hanyu_user_data;
create policy "Users can read own hanyu data"
  on public.hanyu_user_data
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own hanyu data" on public.hanyu_user_data;
create policy "Users can insert own hanyu data"
  on public.hanyu_user_data
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own hanyu data" on public.hanyu_user_data;
create policy "Users can update own hanyu data"
  on public.hanyu_user_data
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

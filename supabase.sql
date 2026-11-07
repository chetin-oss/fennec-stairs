-- 사막여우계단: Supabase SQL Editor에 통째로 붙여넣고 Run 하세요.

-- 1) 소원 테이블
create table if not exists public.wishes (
  id         bigint generated always as identity primary key,
  text       text not null check (char_length(btrim(text)) between 1 and 60),
  client_id  text not null check (char_length(client_id) between 8 and 64),
  created_at timestamptz not null default now()
);

create index if not exists wishes_client_idx on public.wishes (client_id);
create index if not exists wishes_created_idx on public.wishes (created_at desc);

-- 2) 한 사람(브라우저)당 걸려 있는 소원 다섯 개까지 (49일이 지나 탄 종이는 세지 않아요)
create or replace function public.wishes_limit()
returns trigger language plpgsql as $$
begin
  if (select count(*) from public.wishes
      where client_id = new.client_id
        and created_at > now() - interval '49 days') >= 5 then
    raise exception 'limit: five wishes per person';
  end if;
  return new;
end $$;

drop trigger if exists wishes_limit_trg on public.wishes;
create trigger wishes_limit_trg before insert on public.wishes
for each row execute function public.wishes_limit();

-- 3) 보안 규칙: 누구나 읽고 새 소원을 걸 수 있지만, 고치거나 지울 수는 없어요.
--    (지우기는 Supabase 대시보드의 Table Editor에서 관리자가 합니다.)
alter table public.wishes enable row level security;

drop policy if exists "wishes are readable by everyone" on public.wishes;
create policy "wishes are readable by everyone"
  on public.wishes for select to anon, authenticated using (true);

drop policy if exists "anyone can hang a wish" on public.wishes;
create policy "anyone can hang a wish"
  on public.wishes for insert to anon, authenticated with check (true);

-- 4) 새 소원이 열려 있는 모든 화면에 바로 나타나도록 실시간 전송을 켭니다.
do $$
begin
  alter publication supabase_realtime add table public.wishes;
exception when duplicate_object then null;
end $$;

-- 5) (선택) 탄 지 오래된 소원을 데이터베이스에서도 지우고 싶다면 아래를 가끔 실행하세요.
--    화면에서는 49일이 지나면 자동으로 타서 사라지므로 꼭 할 필요는 없어요.
-- delete from public.wishes where created_at < now() - interval '60 days';

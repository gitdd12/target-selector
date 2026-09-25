-- Supabase의 SQL Editor에 이 내용을 붙여넣고 실행하세요(한 번만).

-- 세션 하나 = 참가자 한 명의 인터뷰 기록 전체(JSON). 이메일은 들어 있지 않다.
create table if not exists public.sessions (
  id text primary key,
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 이메일은 대화 기록과 분리해서 따로 저장한다(결과지 발송용). 세션 id로만 이어진다.
create table if not exists public.contacts (
  session_id text primary key,
  email text not null,
  created_at timestamptz not null default now()
);

-- 서버(서비스 키)만 읽고 쓸 수 있게 잠근다. 정책을 만들지 않으면 외부 공개 키로는 접근할 수 없다.
alter table public.sessions enable row level security;
alter table public.contacts enable row level security;

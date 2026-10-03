-- Supabase의 SQL Editor에 이 내용을 붙여넣고 실행하세요(한 번만).

-- 세션 하나 = 참가자 한 명의 인터뷰 기록 전체(JSON). 이메일은 들어 있지 않다.
create table if not exists public.sessions (
  id text primary key,
  data jsonb not null,
  rev integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 이미 만든 테이블에 rev 열만 더할 때(2026-10-03, §40 저장 경쟁 수정). 이미 있으면 아무 일도 안 한다 — 여러 번 실행해도 안전하다.
alter table public.sessions add column if not exists rev integer not null default 0;

-- 이메일은 대화 기록과 분리해서 따로 저장한다(결과지 발송용). 세션 id로만 이어진다.
create table if not exists public.contacts (
  session_id text primary key,
  email text not null,
  created_at timestamptz not null default now()
);

-- 여러 세션이 함께 쓰는 값(근거 업무 문장의 한국어 번역 등). 한 번 만들면 다시 쓴다.
create table if not exists public.cache (
  key text primary key,
  value jsonb not null,
  created_at timestamptz not null default now()
);

-- 서버(서비스 키)만 읽고 쓸 수 있게 잠근다. 정책을 만들지 않으면 외부 공개 키로는 접근할 수 없다.
alter table public.sessions enable row level security;
alter table public.contacts enable row level security;
alter table public.cache enable row level security;

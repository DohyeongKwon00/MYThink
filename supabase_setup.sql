-- Run this in the Supabase SQL editor

create extension if not exists vector;

create table sessions (
  id uuid primary key default gen_random_uuid(),
  subject text not null,
  title text,
  created_at timestamptz default now()
);

create table messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references sessions(id) on delete cascade,
  role text not null,  -- "user" | "assistant"
  content text not null,
  embedding vector(1536),
  created_at timestamptz default now()
);

create table notes (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references sessions(id) on delete cascade,
  content text not null,
  created_at timestamptz default now()
);

create index on messages using ivfflat (embedding vector_cosine_ops);

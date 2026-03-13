-- ============================================================
-- Probeklausur — Initial Database Schema
-- ============================================================

-- Enable extensions
create extension if not exists vector with schema extensions;
create extension if not exists "uuid-ossp";

-- ────────────────────────────────────────────────────────────
-- PROFILES
-- ────────────────────────────────────────────────────────────
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ────────────────────────────────────────────────────────────
-- DOCUMENTS
-- ────────────────────────────────────────────────────────────
create table documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  filename text not null,
  file_size bigint not null,
  storage_path text not null,
  page_count integer,
  status text not null default 'uploaded',
  error_message text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_documents_user on documents(user_id);
create index idx_documents_status on documents(status);

-- ────────────────────────────────────────────────────────────
-- DOCUMENT_PAGES
-- ────────────────────────────────────────────────────────────
create table document_pages (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references documents(id) on delete cascade,
  page_number integer not null,
  text_content text not null,
  created_at timestamptz default now(),
  unique(document_id, page_number)
);

create index idx_pages_document on document_pages(document_id);

-- ────────────────────────────────────────────────────────────
-- DOCUMENT_CHUNKS
-- ────────────────────────────────────────────────────────────
create table document_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references documents(id) on delete cascade,
  content text not null,
  chunk_index integer not null,
  page_start integer,
  page_end integer,
  section_title text,
  chunk_type text default 'narrative',
  metadata jsonb default '{}',
  embedding vector(1536),
  created_at timestamptz default now()
);

create index idx_chunks_document on document_chunks(document_id);
create index idx_chunks_embedding on document_chunks using ivfflat (embedding vector_cosine_ops) with (lists = 100);

-- ────────────────────────────────────────────────────────────
-- DOCUMENT_CONCEPTS
-- ────────────────────────────────────────────────────────────
create table document_concepts (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references documents(id) on delete cascade,
  name text not null,
  description text,
  importance_score numeric(3,2) not null default 0.5,
  page_references integer[] default '{}',
  chunk_ids uuid[] default '{}',
  parent_concept_id uuid references document_concepts(id),
  metadata jsonb default '{}',
  created_at timestamptz default now()
);

create index idx_concepts_document on document_concepts(document_id);

-- ────────────────────────────────────────────────────────────
-- EXAMS
-- ────────────────────────────────────────────────────────────
create table exams (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  title text not null,
  config jsonb not null,
  blueprint jsonb,
  status text not null default 'created',
  error_message text,
  total_questions integer,
  total_points numeric(6,2),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_exams_user on exams(user_id);

-- ────────────────────────────────────────────────────────────
-- EXAM_DOCUMENTS (junction table)
-- ────────────────────────────────────────────────────────────
create table exam_documents (
  exam_id uuid not null references exams(id) on delete cascade,
  document_id uuid not null references documents(id) on delete cascade,
  primary key (exam_id, document_id)
);

-- ────────────────────────────────────────────────────────────
-- EXAM_QUESTIONS
-- ────────────────────────────────────────────────────────────
create table exam_questions (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references exams(id) on delete cascade,
  question_index integer not null,
  question_type text not null,
  difficulty text not null default 'standard',
  points numeric(4,2) not null default 1.0,
  question_text text not null,
  question_data jsonb not null,
  source_refs jsonb not null default '[]',
  quality_score numeric(3,2),
  metadata jsonb default '{}',
  created_at timestamptz default now()
);

create index idx_questions_exam on exam_questions(exam_id);

-- ────────────────────────────────────────────────────────────
-- EXAM_ATTEMPTS
-- ────────────────────────────────────────────────────────────
create table exam_attempts (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references exams(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  mode text not null default 'exam',
  status text not null default 'in_progress',
  started_at timestamptz default now(),
  completed_at timestamptz,
  total_score numeric(6,2),
  max_score numeric(6,2),
  percentage numeric(5,2),
  weak_concepts jsonb default '[]',
  time_spent_seconds integer,
  created_at timestamptz default now()
);

create index idx_attempts_exam on exam_attempts(exam_id);
create index idx_attempts_user on exam_attempts(user_id);

-- ────────────────────────────────────────────────────────────
-- QUESTION_ATTEMPTS
-- ────────────────────────────────────────────────────────────
create table question_attempts (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references exam_attempts(id) on delete cascade,
  question_id uuid not null references exam_questions(id) on delete cascade,
  answer_data jsonb not null,
  is_correct boolean,
  score numeric(4,2),
  max_score numeric(4,2),
  feedback jsonb,
  grading_status text not null default 'pending',
  time_spent_seconds integer,
  created_at timestamptz default now()
);

create index idx_qa_attempt on question_attempts(attempt_id);

-- ────────────────────────────────────────────────────────────
-- PROCESSING_PROGRESS
-- ────────────────────────────────────────────────────────────
create table processing_progress (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id uuid not null,
  user_id uuid not null references profiles(id) on delete cascade,
  step_name text not null,
  step_status text not null default 'pending',
  step_details jsonb default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_progress_entity on processing_progress(entity_type, entity_id);

-- ────────────────────────────────────────────────────────────
-- Vector similarity search function
-- ────────────────────────────────────────────────────────────
create or replace function match_document_chunks(
  query_embedding vector(1536),
  match_threshold float default 0.3,
  match_count int default 20,
  filter_document_ids uuid[] default null
)
returns table (
  id uuid,
  document_id uuid,
  content text,
  chunk_index int,
  page_start int,
  page_end int,
  section_title text,
  chunk_type text,
  metadata jsonb,
  similarity float
)
language plpgsql
as $$
begin
  return query
  select
    dc.id,
    dc.document_id,
    dc.content,
    dc.chunk_index,
    dc.page_start,
    dc.page_end,
    dc.section_title,
    dc.chunk_type,
    dc.metadata,
    1 - (dc.embedding <=> query_embedding) as similarity
  from document_chunks dc
  where
    dc.embedding is not null
    and (filter_document_ids is null or dc.document_id = any(filter_document_ids))
    and 1 - (dc.embedding <=> query_embedding) > match_threshold
  order by dc.embedding <=> query_embedding
  limit match_count;
end;
$$;

-- ────────────────────────────────────────────────────────────
-- Row Level Security
-- ────────────────────────────────────────────────────────────
alter table profiles enable row level security;
alter table documents enable row level security;
alter table document_pages enable row level security;
alter table document_chunks enable row level security;
alter table document_concepts enable row level security;
alter table exams enable row level security;
alter table exam_documents enable row level security;
alter table exam_questions enable row level security;
alter table exam_attempts enable row level security;
alter table question_attempts enable row level security;
alter table processing_progress enable row level security;

-- Profiles
create policy "profiles_select_own" on profiles for select using (auth.uid() = id);
create policy "profiles_update_own" on profiles for update using (auth.uid() = id);
create policy "profiles_insert_own" on profiles for insert with check (auth.uid() = id);

-- Documents
create policy "documents_all_own" on documents for all using (auth.uid() = user_id);

-- Document pages (read via document ownership)
create policy "pages_select_own" on document_pages for select
  using (exists (select 1 from documents d where d.id = document_pages.document_id and d.user_id = auth.uid()));

-- Document chunks (read via document ownership)
create policy "chunks_select_own" on document_chunks for select
  using (exists (select 1 from documents d where d.id = document_chunks.document_id and d.user_id = auth.uid()));

-- Document concepts (read via document ownership)
create policy "concepts_select_own" on document_concepts for select
  using (exists (select 1 from documents d where d.id = document_concepts.document_id and d.user_id = auth.uid()));

-- Exams
create policy "exams_all_own" on exams for all using (auth.uid() = user_id);

-- Exam documents (via exam ownership)
create policy "exam_docs_select_own" on exam_documents for select
  using (exists (select 1 from exams e where e.id = exam_documents.exam_id and e.user_id = auth.uid()));
create policy "exam_docs_insert_own" on exam_documents for insert
  with check (exists (select 1 from exams e where e.id = exam_documents.exam_id and e.user_id = auth.uid()));

-- Exam questions (via exam ownership)
create policy "questions_select_own" on exam_questions for select
  using (exists (select 1 from exams e where e.id = exam_questions.exam_id and e.user_id = auth.uid()));

-- Exam attempts
create policy "attempts_all_own" on exam_attempts for all using (auth.uid() = user_id);

-- Question attempts (via exam attempt ownership)
create policy "qa_select_own" on question_attempts for select
  using (exists (select 1 from exam_attempts ea where ea.id = question_attempts.attempt_id and ea.user_id = auth.uid()));
create policy "qa_insert_own" on question_attempts for insert
  with check (exists (select 1 from exam_attempts ea where ea.id = question_attempts.attempt_id and ea.user_id = auth.uid()));
create policy "qa_update_own" on question_attempts for update
  using (exists (select 1 from exam_attempts ea where ea.id = question_attempts.attempt_id and ea.user_id = auth.uid()));

-- Processing progress
create policy "progress_select_own" on processing_progress for select using (auth.uid() = user_id);

-- ────────────────────────────────────────────────────────────
-- Storage bucket for document uploads
-- ────────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;

create policy "docs_storage_upload" on storage.objects for insert
  with check (bucket_id = 'documents' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "docs_storage_read" on storage.objects for select
  using (bucket_id = 'documents' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "docs_storage_delete" on storage.objects for delete
  using (bucket_id = 'documents' and auth.uid()::text = (storage.foldername(name))[1]);

-- ────────────────────────────────────────────────────────────
-- Auto-create profile on user signup
-- ────────────────────────────────────────────────────────────
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- ────────────────────────────────────────────────────────────
-- Enable realtime for progress tracking
-- ────────────────────────────────────────────────────────────
alter publication supabase_realtime add table processing_progress;
alter publication supabase_realtime add table exams;
alter publication supabase_realtime add table exam_attempts;

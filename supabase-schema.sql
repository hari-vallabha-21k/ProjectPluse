-- ============================================================
-- ProjectPulse – Supabase Schema
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

-- Workspaces
create table if not exists workspaces (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);

-- Workspace Members
create table if not exists workspace_members (
  id uuid default gen_random_uuid() primary key,
  workspace_id uuid references workspaces(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('manager', 'member')),
  email text,
  joined_at timestamptz default now(),
  unique(workspace_id, user_id)
);

-- Invites
create table if not exists invites (
  id uuid default gen_random_uuid() primary key,
  workspace_id uuid references workspaces(id) on delete cascade,
  email text not null,
  role text not null default 'member' check (role in ('manager', 'member')),
  status text default 'pending' check (status in ('pending', 'accepted', 'declined')),
  invited_by uuid references auth.users(id),
  created_at timestamptz default now()
);

-- Projects
create table if not exists projects (
  id uuid default gen_random_uuid() primary key,
  workspace_id uuid references workspaces(id) on delete cascade,
  name text not null,
  description text default '',
  status text default 'active' check (status in ('active', 'completed', 'paused')),
  priority text default 'medium' check (priority in ('high', 'medium', 'low')),
  progress int default 0,
  due_date text default 'TBD',
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);

-- Tasks
create table if not exists tasks (
  id uuid default gen_random_uuid() primary key,
  workspace_id uuid references workspaces(id) on delete cascade,
  project_id uuid references projects(id) on delete set null,
  title text not null,
  description text default '',
  status text default 'todo' check (status in ('todo', 'in_progress', 'review', 'completed')),
  priority text default 'medium' check (priority in ('high', 'medium', 'low')),
  assigned_to uuid references auth.users(id),
  due_date text default 'TBD',
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);

-- Calendar Events
create table if not exists calendar_events (
  id uuid default gen_random_uuid() primary key,
  workspace_id uuid references workspaces(id) on delete cascade,
  title text not null,
  type text not null default 'meeting' check (type in ('meeting', 'deadline', 'review', 'milestone')),
  date text not null,
  time text not null default '09:00',
  duration text not null default '30 min',
  attendees text[] default '{}',
  project text default '',
  description text default '',
  meet_link text,
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);

-- Project Members (assign specific team members to a project)
create table if not exists project_members (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references projects(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('lead', 'member')),
  added_at timestamptz default now(),
  unique(project_id, user_id)
);

-- Chat Conversations (DM or group)
create table if not exists chat_conversations (
  id uuid default gen_random_uuid() primary key,
  workspace_id uuid references workspaces(id) on delete cascade,
  type text not null default 'direct' check (type in ('direct', 'group')),
  name text,
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);

-- Chat Conversation Participants
create table if not exists chat_participants (
  id uuid default gen_random_uuid() primary key,
  conversation_id uuid references chat_conversations(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  joined_at timestamptz default now(),
  unique(conversation_id, user_id)
);

-- Chat Messages
create table if not exists chat_messages (
  id uuid default gen_random_uuid() primary key,
  conversation_id uuid references chat_conversations(id) on delete cascade,
  sender_id uuid references auth.users(id) on delete cascade,
  content text not null default '',
  type text not null default 'text' check (type in ('text', 'file', 'system')),
  file_name text,
  file_url text,
  file_type text,
  file_size bigint,
  created_at timestamptz default now()
);

-- Notifications
create table if not exists notifications (
  id uuid default gen_random_uuid() primary key,
  workspace_id uuid references workspaces(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  type text not null default 'meeting' check (type in ('meeting', 'deadline', 'review', 'milestone', 'general')),
  title text not null,
  message text default '',
  read boolean default false,
  created_at timestamptz default now()
);

-- ============================================================
-- RLS – permissive policies for development (tighten later)
-- ============================================================

alter table workspaces enable row level security;
alter table workspace_members enable row level security;
alter table invites enable row level security;
alter table projects enable row level security;
alter table project_members enable row level security;
alter table tasks enable row level security;
alter table calendar_events enable row level security;
alter table chat_conversations enable row level security;
alter table chat_participants enable row level security;
alter table chat_messages enable row level security;
alter table notifications enable row level security;

create policy "allow_all" on workspaces for all using (true) with check (true);
create policy "allow_all" on workspace_members for all using (true) with check (true);
create policy "allow_all" on invites for all using (true) with check (true);
create policy "allow_all" on projects for all using (true) with check (true);
create policy "allow_all" on project_members for all using (true) with check (true);
create policy "allow_all" on tasks for all using (true) with check (true);
create policy "allow_all" on calendar_events for all using (true) with check (true);
create policy "allow_all" on chat_conversations for all using (true) with check (true);
create policy "allow_all" on chat_participants for all using (true) with check (true);
create policy "allow_all" on chat_messages for all using (true) with check (true);
create policy "allow_all" on notifications for all using (true) with check (true);

-- Activity Logs (Audit Trail)
create table if not exists activity_logs (
  id uuid default gen_random_uuid() primary key,
  workspace_id uuid references workspaces(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  user_email text,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb default '{}',
  created_at timestamptz default now()
);

create index if not exists idx_activity_logs_workspace on activity_logs(workspace_id, created_at desc);

alter table activity_logs enable row level security;
create policy "allow_all" on activity_logs for all using (true) with check (true);

-- Email OTPs (Custom OTP for login)
create table if not exists email_otps (
  id uuid default gen_random_uuid() primary key,
  email text not null,
  otp text not null,
  expires_at timestamptz not null,
  created_at timestamptz default now()
);

create index if not exists idx_email_otps_email on email_otps(email);

alter table email_otps enable row level security;
create policy "allow_all" on email_otps for all using (true) with check (true);

-- Enable realtime for activity_logs
alter publication supabase_realtime add table activity_logs;

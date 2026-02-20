-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- CLIENTS TABLE
create table if not exists public.clients (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamptz default now(),
  name text not null,
  address text,
  poc_name text,
  poc_phone text,
  email text,
  gstin text
);

-- INSTALLERS TABLE
create table if not exists public.installers (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamptz default now(),
  name text not null,
  city text,
  address text,
  poc_name text,
  poc_phone text,
  email text,
  linked_clients text, -- comma separated names or JSON array
  notes text
);

-- DISPATCHES TABLE
create table if not exists public.dispatches (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamptz default now(),
  dispatch_id text not null unique, -- DSP-YYYY-MM-DD-001 format
  date date not null,
  
  -- Client Link
  client_id uuid references public.clients(id),
  client_name text, -- caching name for easy display if client deleted/changed
  
  -- Ship To Details (can be client or installer)
  ship_to_mode text default 'client', -- 'client' or 'installer'
  ship_to_installer_id uuid references public.installers(id),
  ship_to_address text,
  ship_to_poc text,
  ship_to_phone text,
  ship_to_email text,
  
  project_name text,
  
  -- Tracking
  courier_company text,
  tracking_id text,
  courier_slip_url text, -- Drive Link
  
  -- Status / Flags
  email_sent_at timestamptz,
  eway_bill_no text,
  eway_bill_url text,
  
  -- New additions for full history
  shipping_label_url text,
  delivery_challan_url text,
  legacy_created_at timestamptz,
  
  -- Drive Details
  drive_folder_id text,
  combined_pdf_url text
);

-- DISPATCH ITEMS TABLE
create table if not exists public.dispatch_items (
  id uuid default uuid_generate_v4() primary key,
  dispatch_id uuid references public.dispatches(id) on delete cascade,
  description text not null,
  quantity numeric default 0,
  amount numeric default 0,
  unit text
);

-- RLS POLICIES (Simple for now: allow all authenticated/anon for this internal tool)
alter table public.clients enable row level security;
create policy "Allow all access" on public.clients for all using (true) with check (true);

alter table public.installers enable row level security;
create policy "Allow all access" on public.installers for all using (true) with check (true);

alter table public.dispatches enable row level security;
create policy "Allow all access" on public.dispatches for all using (true) with check (true);

alter table public.dispatch_items enable row level security;
create policy "Allow all access" on public.dispatch_items for all using (true) with check (true);

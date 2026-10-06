-- UPSA Assembly Platform (UAP) — backend schema v2.0 (internal-use scope)
-- Generated from the schema catalogue. Target: PostgreSQL 16 on Supabase. Review before applying.
-- Money: bigint minor units. Time: timestamptz (UTC). IDs: uuid unless noted. Status values: text + CHECK.
create extension if not exists pgcrypto;
create extension if not exists citext;
create extension if not exists pg_trgm;
create extension if not exists unaccent;
create schema if not exists core;
create schema if not exists catalog;
create schema if not exists proc;
create schema if not exists inv;
create schema if not exists prod;
create schema if not exists sales;
create schema if not exists fin;
create schema if not exists svc;

-- ===== 1. Generic helpers =====
create or replace function core.touch_updated() returns trigger language plpgsql as $$
begin new.updated_at := now(); new.version := coalesce(old.version, 0) + 1; return new; end $$;

create or replace function core.reject_mutation() returns trigger language plpgsql as $$
begin raise exception 'APPEND_ONLY: % on %.% is not allowed', tg_op, tg_table_schema, tg_table_name using errcode = 'P0001'; end $$;

create or replace function core.next_doc_no(p_series text) returns text language plpgsql as $$
declare v bigint; y int := extract(year from (now() at time zone 'Africa/Accra'))::int;
begin
  insert into core.doc_sequences(series, year, next_value) values (p_series, y, 2)
  on conflict (series, year) do update set next_value = core.doc_sequences.next_value + 1
  returning next_value - 1 into v;
  return p_series || '-' || y || '-' || lpad(v::text, 6, '0');
end $$;

create or replace function core.set_doc_no() returns trigger language plpgsql as $$
declare col text := tg_argv[0]; ser text := tg_argv[1];
begin
  if to_jsonb(new) ->> col is null then new := jsonb_populate_record(new, jsonb_build_object(col, core.next_doc_no(ser))); end if;
  return new;
end $$;

create or replace function core.jwt_scopes() returns jsonb language sql stable as $$
  select coalesce(auth.jwt() -> 'scopes', '[]'::jsonb) $$;
create or replace function core.has_scope(p_scope text) returns boolean language sql stable as $$
  select core.jwt_scopes() ? p_scope $$;
create or replace function core.has_any_scope(p_scopes text[]) returns boolean language sql stable as $$
  select core.jwt_scopes() ?| p_scopes $$;
create or replace function core.is_staff() returns boolean language sql stable as $$
  select coalesce(auth.jwt() ->> 'staff_status', '') = 'active' $$;
create or replace function core.is_admin() returns boolean language sql stable as $$
  select coalesce((auth.jwt() ->> 'is_admin')::boolean, false) $$;

create or replace function core.audit_trigger() returns trigger language plpgsql security definer set search_path = '' as $$
declare v_strip text[] := array['bank_details_enc','key_enc','new_details_enc','details_enc','secret_hash'];
begin
  insert into core.audit_log(actor_id, action, entity_type, entity_id, before, after, request_id)
  values (coalesce(nullif(current_setting('app.actor_id', true), '')::uuid, auth.uid()), lower(tg_op),
          tg_table_schema || '.' || tg_table_name,
          coalesce((to_jsonb(new) ->> 'id')::uuid, (to_jsonb(old) ->> 'id')::uuid),
          case when tg_op in ('UPDATE','DELETE') then to_jsonb(old) - v_strip end,
          case when tg_op in ('INSERT','UPDATE') then to_jsonb(new) - v_strip end,
          nullif(current_setting('app.request_id', true), ''));
  return coalesce(new, old);
end $$;

create or replace function core.ensure_month_partition(p_parent regclass, p_month date) returns void language plpgsql as $$
declare v_start date := date_trunc('month', p_month)::date; v_end date := (date_trunc('month', p_month) + interval '1 month')::date;
        v_name text := p_parent::text || '_' || to_char(date_trunc('month', p_month), 'YYYYMM');
begin
  execute format('create table if not exists %s partition of %s for values from (%L) to (%L)', v_name, p_parent, v_start, v_end);
end $$;

-- ===== 2. Tables =====
create table core.profiles (
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version integer not null default 1,
  id uuid not null,
  full_name text not null,
  email citext not null unique,
  phone text,
  staff_no text unique,
  job_title text,
  department text,
  is_admin boolean not null default false,
  status text not null default 'invited' check (status in ('invited', 'active', 'suspended')),
  extra_scopes text[] not null default '{}',
  revoked_scopes text[] not null default '{}',
  mfa_enrolled boolean not null default false,
  last_seen_at timestamptz,
  primary key (id)
);
comment on table core.profiles is 'One row per staff user; id equals the Supabase auth user id. Only the Super Admin has is_admin.';
create table core.roles (
  id uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version integer not null default 1,
  code text not null unique,
  name text not null,
  description text,
  default_scopes text[] not null default '{}',
  is_system boolean not null default true,
  primary key (id)
);
comment on table core.roles is 'Role templates (seven) mapped to default scope arrays.';
create table core.user_roles (
  user_id uuid not null,
  role_id uuid not null,
  is_primary boolean not null default true,
  assigned_by uuid,
  assigned_at timestamptz not null default now(),
  primary key (user_id, role_id)
);
comment on table core.user_roles is 'Role assignment; one primary role per user.';
create table core.locations (
  id uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version integer not null default 1,
  code text not null unique,
  name text not null,
  kind text not null check (kind in ('warehouse', 'assembly_wip', 'repair_bench', 'quarantine', 'in_transit', 'dispatch', 'showroom')),
  parent_id uuid,
  active boolean not null default true,
  primary key (id)
);
comment on table core.locations is 'Stock locations (hierarchical).';
create table core.cost_centres (
  id uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version integer not null default 1,
  code text not null unique,
  name text not null,
  parent_id uuid,
  active boolean not null default true,
  primary key (id)
);
comment on table core.cost_centres is 'Cost centres for budgets, expenses and journals.';
create table core.customer_accounts (
  id uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version integer not null default 1,
  account_no text not null unique,
  name text not null,
  kind text not null check (kind in ('department', 'staff', 'unit', 'external_org')),
  department_code text,
  contact_name text,
  contact_phone text,
  contact_email citext,
  tin text,
  address text,
  ghanapost_gps text,
  cost_centre_id uuid,
  credit_limit_minor bigint not null default 0,
  status text not null default 'active' check (status in ('active', 'on_hold', 'closed')),
  notes text,
  primary key (id)
);
comment on table core.customer_accounts is 'Named internal buyers: departments, staff, units, external organisations.';
create table core.currencies (
  code char(3) not null,
  name text not null,
  minor_unit smallint not null default 2,
  active boolean not null default true,
  primary key (code)
);
comment on table core.currencies is 'ISO currencies in use; GHS is the base.';
create table core.exchange_rates (
  id uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version integer not null default 1,
  currency_code char(3) not null,
  rate_to_base numeric(18,8) not null check (rate_to_base>0),
  effective_on date not null,
  source text not null,
  primary key (id),
  unique (currency_code,effective_on,source)
);
comment on table core.exchange_rates is 'Rate to base currency by date and named source.';
create table core.tax_rates (
  id uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version integer not null default 1,
  code text not null,
  name text not null,
  kind text not null check (kind in ('vat', 'levy', 'withholding')),
  rate_pct numeric(7,4) not null,
  effective_from date not null,
  effective_to date,
  recoverable boolean not null default true,
  primary key (id),
  unique (code,effective_from)
);
comment on table core.tax_rates is 'Dated tax and levy rates; never hard-coded.';
create table core.settings (
  key text not null,
  value jsonb not null,
  description text,
  updated_at timestamptz not null default now(),
  updated_by uuid,
  primary key (key)
);
comment on table core.settings is 'Key-value settings and feature flags.';
create table core.doc_sequences (
  series text not null,
  year integer not null,
  next_value bigint not null default 1,
  primary key (series, year)
);
comment on table core.doc_sequences is 'Gap-free numbering counters per series and year.';
create table core.approval_rules (
  id uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version integer not null default 1,
  action_type text not null,
  min_amount_minor bigint not null default 0,
  max_amount_minor bigint,
  currency char(3) not null default 'GHS',
  approver_role_code text not null,
  delegate_role_code text,
  min_approvers smallint not null default 1,
  sla_hours integer not null default 24,
  aggregate_window_days integer,
  active boolean not null default true,
  primary key (id)
);
comment on table core.approval_rules is 'Approval thresholds by action and amount.';
create table core.approvals (
  id uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version integer not null default 1,
  rule_id uuid,
  subject_type text not null,
  subject_id uuid not null,
  requested_by uuid not null,
  amount_minor bigint,
  currency char(3),
  reason text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'cancelled', 'expired')),
  decided_by uuid,
  decided_at timestamptz,
  decision_note text,
  due_at timestamptz,
  escalated_to uuid,
  primary key (id),
  check (decided_by is null or decided_by <> requested_by)
);
comment on table core.approvals is 'Approval requests and decisions.';
create table core.attachments (
  id uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version integer not null default 1,
  entity_type text not null,
  entity_id uuid not null,
  doc_kind text not null,
  storage_path text not null,
  file_name text not null,
  mime_type text not null,
  size_bytes bigint not null,
  sha256 text not null,
  scan_status text not null default 'pending' check (scan_status in ('pending', 'clean', 'infected', 'failed')),
  uploaded_by uuid,
  primary key (id)
);
comment on table core.attachments is 'File metadata; files live in private Storage.';
create table core.audit_log (
  id bigint generated always as identity not null,
  at timestamptz not null default now(),
  actor_id uuid,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  before jsonb,
  after jsonb,
  ip inet,
  request_id text,
  device text,
  primary key (id, at)
) partition by range (at);
create table core.audit_log_default partition of core.audit_log default;
comment on table core.audit_log is 'Append-only audit trail; monthly partitions.';
create table core.outbox_events (
  id bigint generated always as identity not null,
  topic text not null,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  available_at timestamptz not null default now(),
  processed_at timestamptz,
  attempts integer not null default 0,
  last_error text,
  primary key (id)
);
comment on table core.outbox_events is 'Transactional outbox for jobs, notifications and integrations.';
create table core.notifications (
  id uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version integer not null default 1,
  user_id uuid not null,
  channel text not null check (channel in ('in_app', 'email')),
  template_key text not null,
  title text not null,
  body text,
  link text,
  payload jsonb,
  status text not null default 'queued' check (status in ('queued', 'sent', 'read', 'failed')),
  sent_at timestamptz,
  read_at timestamptz,
  error text,
  primary key (id)
);
comment on table core.notifications is 'In-app and email notifications.';
create table core.idempotency_keys (
  key text not null,
  scope text not null,
  request_hash text not null,
  response_status integer,
  response_body jsonb,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  primary key (key)
);
comment on table core.idempotency_keys is 'Replay protection for mutating endpoints.';
create table core.api_clients (
  id uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version integer not null default 1,
  name text not null,
  client_id text not null unique,
  secret_hash text not null,
  scopes text[] not null default '{}',
  ip_allowlist inet[],
  active boolean not null default false,
  last_used_at timestamptz,
  expires_at timestamptz,
  primary key (id)
);
comment on table core.api_clients is 'Service credentials for future clients; disabled by default.';
create table core.import_batches (
  id uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version integer not null default 1,
  kind text not null check (kind in ('items', 'suppliers', 'accounts', 'boms', 'opening_stock')),
  file_attachment_id uuid,
  status text not null default 'uploaded' check (status in ('uploaded', 'validated', 'failed', 'committed', 'rolled_back')),
  rows_total integer,
  rows_ok integer,
  rows_error integer,
  errors jsonb,
  committed_at timestamptz,
  committed_by uuid,
  primary key (id)
);
comment on table core.import_batches is 'Excel/CSV import wizard batches.';
create table catalog.brands (
  id uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version integer not null default 1,
  name text not null unique,
  primary key (id)
);
comment on table catalog.brands is 'Brands.';
create table catalog.categories (
  id uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version integer not null default 1,
  name text not null,
  slug text not null unique,
  parent_id uuid,
  default_tracking text not null default 'none' check (default_tracking in ('none', 'lot', 'serial')),
  primary key (id)
);
comment on table catalog.categories is 'Item categories (tree).';
create table catalog.item_families (
  id uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version integer not null default 1,
  name text not null unique,
  description text,
  active boolean not null default true,
  primary key (id)
);
comment on table catalog.item_families is 'Model families such as a laptop line.';
create table catalog.items (
  id uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version integer not null default 1,
  sku text not null unique,
  name text not null,
  description text,
  kind text not null check (kind in ('finished_good', 'component', 'accessory', 'consumable', 'packaging')),
  category_id uuid,
  brand_id uuid,
  family_id uuid,
  uom text not null default 'each',
  tracking text not null default 'none' check (tracking in ('none', 'lot', 'serial')),
  is_purchasable boolean not null default true,
  is_sellable boolean not null default false,
  is_active boolean not null default true,
  hs_code text,
  weight_kg numeric(10,3),
  volume_cbm numeric(10,4),
  warranty_months integer not null default 12,
  list_price_minor bigint,
  barcode text unique,
  specs jsonb not null default '{}',
  requires_incoming_inspection boolean not null default false,
  search tsvector,
  primary key (id)
);
comment on table catalog.items is 'Items of every kind. Tracking mode decides lot or serial capture.';
create table catalog.boms (
  id uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  item_id uuid not null,
  version integer not null,
  status text not null default 'draft' check (status in ('draft', 'pending_approval', 'active', 'retired')),
  effective_from date,
  labour_minutes integer not null default 0,
  notes text,
  approved_by uuid,
  approved_at timestamptz,
  primary key (id),
  unique (item_id,version)
);
comment on table catalog.boms is 'Versioned bill of materials; one active version per item.';
create table catalog.bom_lines (
  id uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version integer not null default 1,
  bom_id uuid not null,
  component_item_id uuid not null,
  qty numeric(14,4) not null check (qty>0),
  scrap_pct numeric(5,2) not null default 0,
  is_optional boolean not null default false,
  alt_group text,
  notes text,
  primary key (id)
);
comment on table catalog.bom_lines is 'Components in a BOM.';
create table catalog.item_suppliers (
  item_id uuid not null,
  supplier_id uuid not null,
  supplier_sku text,
  last_price_minor bigint,
  currency char(3),
  lead_time_days integer,
  moq numeric(14,4),
  is_preferred boolean not null default false,
  primary key (item_id, supplier_id)
);
comment on table catalog.item_suppliers is 'Approved suppliers per item with last price and lead time.';
create table catalog.price_lists (
  id uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version integer not null default 1,
  name text not null unique,
  account_kind text check (account_kind in ('department', 'staff', 'unit', 'external_org')),
  is_default boolean not null default false,
  active boolean not null default true,
  primary key (id)
);
comment on table catalog.price_lists is 'Internal selling price lists.';
create table catalog.price_list_items (
  id uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version integer not null default 1,
  price_list_id uuid not null,
  item_id uuid not null,
  price_minor bigint not null,
  min_qty numeric(14,4) not null default 1,
  valid_from date,
  valid_to date,
  primary key (id),
  unique (price_list_id,item_id,min_qty,valid_from)
);
comment on table catalog.price_list_items is 'Prices per item and quantity break.';
create table catalog.customs_tariffs (
  id uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version integer not null default 1,
  hs_code text not null,
  description text,
  duty_pct numeric(7,4) not null,
  vat_pct numeric(7,4),
  levies jsonb not null default '[]',
  effective_from date not null,
  effective_to date,
  primary key (id),
  unique (hs_code,effective_from)
);
comment on table catalog.customs_tariffs is 'HS code duty and levy rates by effective date.';
create table proc.suppliers (
  id uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version integer not null default 1,
  supplier_no text not null unique,
  name text not null,
  country char(2),
  kind text not null check (kind in ('manufacturer', 'distributor', 'local_dealer', 'agent')),
  tin text,
  contact_name text,
  email citext,
  phone text,
  address text,
  currency char(3),
  payment_terms text,
  lead_time_days integer,
  bank_details_enc bytea,
  rating numeric(3,2),
  status text not null default 'pending_verification' check (status in ('pending_verification', 'active', 'on_hold', 'blocked')),
  notes text,
  primary key (id)
);
comment on table proc.suppliers is 'Supplier master. Bank details are encrypted and never granted to browser roles.';
create table proc.supplier_bank_changes (
  id uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version integer not null default 1,
  supplier_id uuid not null,
  new_details_enc bytea not null,
  verified_by uuid,
  verified_at timestamptz,
  approval_id uuid,
  status text not null default 'requested' check (status in ('requested', 'verified', 'approved', 'rejected')),
  applied_at timestamptz,
  primary key (id)
);
comment on table proc.supplier_bank_changes is 'Dual-control bank-detail changes.';
create table proc.logistics_partners (
  id uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version integer not null default 1,
  name text not null,
  kind text not null check (kind in ('clearing_agent', 'freight_forwarder', 'shipping_line', 'airline', 'courier', 'transporter')),
  licence_no text,
  contact_name text,
  email citext,
  phone text,
  status text not null default 'active',
  primary key (id)
);
comment on table proc.logistics_partners is 'Clearing agents, forwarders, carriers, transporters.';
create table proc.supplier_warranty_terms (
  id uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version integer not null default 1,
  supplier_id uuid not null,
  item_id uuid,
  category_id uuid,
  months integer not null,
  start_basis text not null check (start_basis in ('receipt_date', 'invoice_date', 'install_date')),
  rma_window_days integer,
  notes text,
  primary key (id),
  check (item_id is not null or category_id is not null)
);
comment on table proc.supplier_warranty_terms is 'Supplier warranty by item or category.';
create table proc.requisitions (
  id uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version integer not null default 1,
  req_no text not null unique,
  requested_by uuid not null,
  status text not null default 'draft' check (status in ('draft', 'submitted', 'approved', 'rejected', 'converted', 'cancelled')),
  source text not null check (source in ('manual', 'reorder', 'production_shortage')),
  assembly_order_id uuid,
  needed_by date,
  reason text,
  approval_id uuid,
  primary key (id)
);
comment on table proc.requisitions is 'Purchase requests.';
create table proc.requisition_lines (
  id uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version integer not null default 1,
  requisition_id uuid not null,
  item_id uuid not null,
  qty numeric(16,4) not null,
  est_unit_cost_minor bigint,
  currency char(3),
  notes text,
  primary key (id)
);
comment on table proc.requisition_lines is 'Requisition lines.';
create table proc.purchase_orders (
  id uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version integer not null default 1,
  po_no text not null unique,
  supplier_id uuid not null,
  status text not null default 'draft' check (status in ('draft', 'pending_approval', 'approved', 'sent', 'confirmed', 'partly_received', 'received', 'closed', 'cancelled')),
  currency char(3) not null,
  fx_rate numeric(18,8) not null,
  incoterm text,
  shipping_mode text check (shipping_mode in ('sea', 'air', 'road', 'courier')),
  port_of_loading text,
  expected_ship_date date,
  expected_arrival_date date,
  payment_terms text,
  subtotal_minor bigint not null default 0,
  tax_minor bigint not null default 0,
  total_minor bigint not null default 0,
  requisition_id uuid,
  approval_id uuid,
  sent_at timestamptz,
  confirmed_at timestamptz,
  notes text,
  primary key (id)
);
comment on table proc.purchase_orders is 'Purchase orders in the supplier currency with captured rate.';
create table proc.purchase_order_lines (
  id uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version integer not null default 1,
  po_id uuid not null,
  line_no integer not null,
  item_id uuid not null,
  description text,
  qty numeric(16,4) not null check (qty>0),
  unit_price_minor bigint not null,
  line_total_minor bigint not null,
  expected_date date,
  primary key (id),
  unique (po_id,line_no)
);
comment on table proc.purchase_order_lines is 'PO lines.';
create table proc.shipments (
  id uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version integer not null default 1,
  shipment_no text not null unique,
  supplier_id uuid,
  mode text not null check (mode in ('sea', 'air', 'road', 'courier')),
  status text not null default 'booked' check (status in ('booked', 'in_transit', 'arrived', 'customs_processing', 'held', 'cleared', 'delivered', 'closed', 'cancelled')),
  incoterm text,
  bl_awb_no text,
  container_nos text[] not null default '{}',
  vessel_or_flight text,
  carrier_id uuid,
  forwarder_id uuid,
  clearing_agent_id uuid,
  port_of_loading text,
  port_of_discharge text,
  etd date,
  eta date,
  original_eta date,
  ata date,
  packages integer,
  gross_weight_kg numeric(12,3),
  volume_cbm numeric(12,4),
  declared_value_minor bigint,
  currency char(3),
  free_days integer,
  free_days_start date,
  notes text,
  primary key (id)
);
comment on table proc.shipments is 'Consignments by sea, air, road or courier.';
create table proc.shipment_lines (
  id uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version integer not null default 1,
  shipment_id uuid not null,
  po_line_id uuid not null,
  item_id uuid not null,
  qty_shipped numeric(16,4) not null,
  unit_value_minor bigint not null,
  currency char(3) not null,
  weight_kg numeric(12,3),
  volume_cbm numeric(12,4),
  primary key (id)
);
comment on table proc.shipment_lines is 'What is on the shipment, per PO line.';
create table proc.shipment_events (
  id uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  shipment_id uuid not null,
  event_type text not null,
  location text,
  occurred_at timestamptz not null,
  source text not null check (source in ('manual', 'carrier', 'agent')),
  note text,
  primary key (id)
);
comment on table proc.shipment_events is 'Append-only shipment timeline.';
create table proc.customs_entries (
  id uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version integer not null default 1,
  shipment_id uuid not null,
  entry_no text not null unique,
  regime text,
  status text not null default 'draft' check (status in ('draft', 'lodged', 'assessed', 'queried', 'paid', 'released', 'cancelled')),
  customs_value_minor bigint,
  duty_minor bigint,
  vat_minor bigint,
  levies_minor bigint,
  other_minor bigint,
  total_payable_minor bigint,
  currency char(3) not null default 'GHS',
  agent_id uuid,
  inspection_lane text,
  lodged_on date,
  assessed_on date,
  paid_on date,
  released_on date,
  notes text,
  primary key (id)
);
comment on table proc.customs_entries is 'Customs declarations per shipment.';
create table proc.shipment_charges (
  id uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version integer not null default 1,
  shipment_id uuid not null,
  charge_type text not null check (charge_type in ('freight', 'insurance', 'duty', 'vat', 'levy', 'clearing_fee', 'port_charges', 'inspection', 'local_transport', 'handling', 'demurrage', 'storage', 'other')),
  description text,
  partner_id uuid,
  amount_minor bigint not null,
  currency char(3) not null,
  fx_rate numeric(18,8) not null,
  amount_base_minor bigint not null,
  allocation_basis text not null default 'value' check (allocation_basis in ('value', 'weight', 'volume', 'qty', 'manual')),
  is_recoverable boolean not null default false,
  status text not null default 'estimated' check (status in ('estimated', 'actual')),
  invoice_ref text,
  incurred_on date,
  primary key (id)
);
comment on table proc.shipment_charges is 'Landed-cost components, estimated then actual.';
create table proc.goods_receipts (
  id uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version integer not null default 1,
  grn_no text not null unique,
  shipment_id uuid,
  po_id uuid,
  supplier_id uuid,
  location_id uuid not null,
  received_by uuid not null,
  received_at timestamptz not null,
  delivery_note_no text,
  status text not null default 'draft' check (status in ('draft', 'inspecting', 'posted', 'cancelled')),
  posted_at timestamptz,
  notes text,
  primary key (id)
);
comment on table proc.goods_receipts is 'Goods receipt notes.';
create table proc.goods_receipt_lines (
  id uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version integer not null default 1,
  grn_id uuid not null,
  po_line_id uuid,
  shipment_line_id uuid,
  item_id uuid not null,
  qty_received numeric(16,4) not null,
  qty_accepted numeric(16,4) not null,
  qty_rejected numeric(16,4) not null default 0,
  lot_no text,
  reject_reason text,
  goods_value_base_minor bigint,
  landed_unit_cost_minor bigint,
  primary key (id),
  check (qty_accepted + qty_rejected = qty_received)
);
comment on table proc.goods_receipt_lines is 'Received, accepted and rejected quantities.';
create table proc.landed_cost_runs (
  id uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version integer not null default 1,
  run_no text not null unique,
  shipment_id uuid not null,
  status text not null default 'draft' check (status in ('draft', 'posted', 'reversed')),
  total_allocated_minor bigint not null default 0,
  posted_by uuid,
  posted_at timestamptz,
  reversed_by uuid,
  reversed_at timestamptz,
  reversal_approval_id uuid,
  notes text,
  primary key (id)
);
comment on table proc.landed_cost_runs is 'Allocation runs; reversible.';
create table proc.landed_cost_allocations (
  id uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version integer not null default 1,
  run_id uuid not null,
  grn_line_id uuid not null,
  charge_id uuid not null,
  basis text not null,
  basis_value numeric(20,6) not null,
  share_pct numeric(9,6) not null,
  amount_minor bigint not null,
  primary key (id)
);
comment on table proc.landed_cost_allocations is 'Per-line allocation of each charge.';
create table proc.supplier_invoices (
  id uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version integer not null default 1,
  invoice_no text not null,
  supplier_id uuid not null,
  po_id uuid,
  shipment_id uuid,
  currency char(3) not null,
  fx_rate numeric(18,8) not null,
  subtotal_minor bigint not null,
  tax_minor bigint not null default 0,
  total_minor bigint not null,
  due_date date,
  status text not null default 'draft' check (status in ('draft', 'matched', 'variance', 'approved', 'part_paid', 'paid', 'void')),
  match_status text not null default 'pending' check (match_status in ('pending', 'matched', 'variance')),
  received_on date,
  approved_by uuid,
  primary key (id),
  unique (supplier_id,invoice_no)
);
comment on table proc.supplier_invoices is 'Supplier invoices with three-way match status.';
create table proc.supplier_invoice_lines (
  id uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version integer not null default 1,
  invoice_id uuid not null,
  po_line_id uuid,
  grn_line_id uuid,
  item_id uuid,
  qty numeric(16,4) not null,
  unit_price_minor bigint not null,
  line_total_minor bigint not null,
  variance_minor bigint not null default 0,
  primary key (id)
);
comment on table proc.supplier_invoice_lines is 'Invoice lines and variances.';
create table proc.supplier_rmas (
  id uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version integer not null default 1,
  rma_no text not null unique,
  supplier_id uuid not null,
  origin text not null check (origin in ('receiving', 'production', 'service')),
  status text not null default 'draft' check (status in ('draft', 'submitted', 'authorised', 'shipped', 'credited', 'replaced', 'rejected', 'closed')),
  reason text,
  supplier_ref text,
  credit_note_no text,
  credit_minor bigint,
  currency char(3),
  opened_on date,
  ticket_id uuid,
  grn_id uuid,
  unit_id uuid,
  primary key (id)
);
comment on table proc.supplier_rmas is 'Returns to suppliers for credit or replacement.';
create table proc.supplier_rma_lines (
  id uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version integer not null default 1,
  rma_id uuid not null,
  item_id uuid not null,
  lot_id uuid,
  component_serial_id uuid,
  qty numeric(16,4) not null,
  defect_description text,
  resolution text check (resolution in ('credit', 'replace', 'repair', 'reject')),
  primary key (id)
);
comment on table proc.supplier_rma_lines is 'Items on an RMA.';
create table inv.lots (
  id uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version integer not null default 1,
  item_id uuid not null,
  lot_no text not null,
  supplier_id uuid,
  grn_line_id uuid,
  received_on date,
  unit_landed_cost_minor bigint,
  notes text,
  primary key (id),
  unique (item_id,lot_no,supplier_id)
);
comment on table inv.lots is 'Lots received; carry landed unit cost.';
create table inv.component_serials (
  id uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version integer not null default 1,
  item_id uuid not null,
  serial_no text not null,
  lot_id uuid,
  grn_line_id uuid,
  status text not null default 'in_stock' check (status in ('in_stock', 'issued', 'installed', 'returned', 'defective', 'rma', 'scrapped')),
  location_id uuid,
  notes text,
  primary key (id),
  unique (item_id,serial_no)
);
comment on table inv.component_serials is 'Manufacturer serials for tracked components.';
create table inv.stock_ledger (
  id bigint generated always as identity not null,
  posted_at timestamptz not null default now(),
  item_id uuid not null,
  location_id uuid not null,
  lot_id uuid,
  component_serial_id uuid,
  unit_id uuid,
  movement_type text not null check (movement_type in ('receipt', 'issue_production', 'return_production', 'assembly_output', 'dispatch', 'dispatch_return', 'transfer_out', 'transfer_in', 'adjustment', 'scrap', 'rma_out', 'service_consume', 'opening', 'landed_cost_adj')),
  qty numeric(16,4) not null,
  unit_cost_minor bigint,
  ref_type text,
  ref_id uuid,
  reason text,
  created_by uuid,
  primary key (id, posted_at)
) partition by range (posted_at);
create table inv.stock_ledger_default partition of inv.stock_ledger default;
comment on table inv.stock_ledger is 'Append-only stock movements; monthly partitions; quantity is signed.';
create table inv.stock_snapshots (
  id uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  period_end date not null,
  item_id uuid not null,
  location_id uuid not null,
  qty numeric(16,4) not null,
  avg_cost_minor bigint not null,
  primary key (id),
  unique (period_end,item_id,location_id)
);
comment on table inv.stock_snapshots is 'Month-end balances that bound ledger scans.';
create table inv.item_cost_history (
  id uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  item_id uuid not null,
  effective_at timestamptz not null,
  avg_cost_minor bigint not null,
  qty_after numeric(16,4) not null,
  trigger_type text not null,
  trigger_id uuid,
  primary key (id)
);
comment on table inv.item_cost_history is 'Append-only moving-average cost history.';
create table inv.reservations (
  id uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version integer not null default 1,
  item_id uuid not null,
  location_id uuid,
  unit_id uuid,
  qty numeric(16,4) not null default 1,
  ref_type text not null check (ref_type in ('internal_order', 'assembly_order')),
  ref_id uuid not null,
  status text not null default 'active' check (status in ('active', 'released', 'consumed', 'expired')),
  expires_at timestamptz,
  primary key (id)
);
comment on table inv.reservations is 'Holds on stock or specific units.';
create table inv.transfers (
  id uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version integer not null default 1,
  transfer_no text not null unique,
  from_location_id uuid not null,
  to_location_id uuid not null,
  status text not null default 'draft' check (status in ('draft', 'in_transit', 'received', 'cancelled')),
  shipped_at timestamptz,
  received_at timestamptz,
  notes text,
  primary key (id),
  check (from_location_id <> to_location_id)
);
comment on table inv.transfers is 'Location transfers with in-transit state.';
create table inv.transfer_lines (
  id uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version integer not null default 1,
  transfer_id uuid not null,
  item_id uuid not null,
  lot_id uuid,
  component_serial_id uuid,
  unit_id uuid,
  qty_sent numeric(16,4) not null,
  qty_received numeric(16,4),
  primary key (id)
);
comment on table inv.transfer_lines is 'Transfer lines.';
create table inv.adjustments (
  id uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version integer not null default 1,
  adj_no text not null unique,
  location_id uuid not null,
  reason text not null check (reason in ('count_variance', 'damage', 'loss', 'found', 'expiry', 'scrap', 'other')),
  status text not null default 'draft' check (status in ('draft', 'pending_approval', 'approved', 'rejected', 'posted')),
  total_value_minor bigint not null default 0,
  approval_id uuid,
  posted_at timestamptz,
  notes text,
  primary key (id)
);
comment on table inv.adjustments is 'Stock adjustments and write-offs.';
create table inv.adjustment_lines (
  id uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version integer not null default 1,
  adjustment_id uuid not null,
  item_id uuid not null,
  lot_id uuid,
  component_serial_id uuid,
  qty_delta numeric(16,4) not null,
  unit_cost_minor bigint not null,
  note text,
  primary key (id)
);
comment on table inv.adjustment_lines is 'Adjustment lines.';
create table inv.stock_counts (
  id uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version integer not null default 1,
  count_no text not null unique,
  location_id uuid not null,
  kind text not null check (kind in ('cycle', 'full')),
  status text not null default 'planned' check (status in ('planned', 'counting', 'review', 'posted', 'cancelled')),
  scheduled_for date,
  started_at timestamptz,
  posted_at timestamptz,
  adjustment_id uuid,
  primary key (id)
);
comment on table inv.stock_counts is 'Cycle counts and full stock takes.';
create table inv.stock_count_lines (
  id uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version integer not null default 1,
  count_id uuid not null,
  item_id uuid not null,
  lot_id uuid,
  expected_qty numeric(16,4) not null,
  counted_qty numeric(16,4),
  variance numeric(16,4) generated always as (counted_qty - expected_qty) stored,
  counted_by uuid,
  note text,
  primary key (id)
);
comment on table inv.stock_count_lines is 'Counted versus expected.';
create table inv.reorder_policies (
  item_id uuid not null,
  location_id uuid not null,
  min_qty numeric(16,4) not null,
  max_qty numeric(16,4),
  reorder_qty numeric(16,4),
  lead_time_days integer,
  preferred_supplier_id uuid,
  primary key (item_id, location_id)
);
comment on table inv.reorder_policies is 'Min, max and reorder quantity per item and location.';
create table inv.ewaste_records (
  id uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version integer not null default 1,
  source_type text not null check (source_type in ('scrap', 'defect', 'service_replaced')),
  source_id uuid,
  item_id uuid,
  qty numeric(16,4) not null,
  weight_kg numeric(10,3),
  disposition text not null check (disposition in ('recycled', 'refurbished', 'returned_supplier', 'disposed')),
  handler text,
  certificate_ref text,
  recorded_on date not null,
  primary key (id)
);
comment on table inv.ewaste_records is 'E-waste register.';
create table prod.work_centers (
  id uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version integer not null default 1,
  code text not null unique,
  name text not null,
  kind text not null check (kind in ('assembly_bench', 'test_rack', 'imaging_station', 'packing')),
  location_id uuid,
  active boolean not null default true,
  primary key (id)
);
comment on table prod.work_centers is 'Benches, test racks, imaging stations.';
create table prod.routings (
  id uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  name text not null,
  item_id uuid,
  family_id uuid,
  version integer not null default 1,
  active boolean not null default true,
  primary key (id)
);
comment on table prod.routings is 'Step sequences per item or family.';
create table prod.routing_steps (
  id uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version integer not null default 1,
  routing_id uuid not null,
  step_no integer not null,
  name text not null,
  work_center_kind text,
  std_minutes integer not null default 0,
  instructions text,
  checklist jsonb not null default '[]',
  requires_scan boolean not null default false,
  is_mandatory boolean not null default true,
  primary key (id),
  unique (routing_id,step_no)
);
comment on table prod.routing_steps is 'Steps with checklists.';
create table prod.assembly_orders (
  id uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version integer not null default 1,
  ao_no text not null unique,
  item_id uuid not null,
  bom_id uuid not null,
  routing_id uuid,
  qty_planned integer not null check (qty_planned>0),
  status text not null default 'draft' check (status in ('draft', 'planned', 'awaiting_materials', 'ready', 'released', 'in_progress', 'in_qc', 'completed', 'on_hold', 'cancelled')),
  priority smallint not null default 3,
  purpose text not null default 'stock' check (purpose in ('stock', 'internal_order')),
  internal_order_id uuid,
  planned_start date,
  planned_end date,
  actual_start timestamptz,
  actual_end timestamptz,
  requested_by uuid,
  notes text,
  primary key (id)
);
comment on table prod.assembly_orders is 'Build orders; the BOM version is snapshotted.';
create table prod.assembly_order_materials (
  id uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version integer not null default 1,
  ao_id uuid not null,
  item_id uuid not null,
  qty_required numeric(16,4) not null,
  alt_group text,
  notes text,
  primary key (id)
);
comment on table prod.assembly_order_materials is 'Exploded BOM requirement for an order.';
create table prod.material_issues (
  id uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version integer not null default 1,
  issue_no text not null unique,
  ao_id uuid not null,
  from_location_id uuid not null,
  to_location_id uuid,
  issued_by uuid not null,
  issued_at timestamptz not null,
  status text not null default 'draft' check (status in ('draft', 'posted')),
  primary key (id)
);
comment on table prod.material_issues is 'Issues of parts to WIP.';
create table prod.material_issue_lines (
  id uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version integer not null default 1,
  issue_id uuid not null,
  ao_material_id uuid,
  item_id uuid not null,
  lot_id uuid,
  component_serial_id uuid,
  qty numeric(16,4) not null,
  unit_cost_minor bigint,
  primary key (id)
);
comment on table prod.material_issue_lines is 'Issue lines with serials and lots.';
create table prod.units (
  id uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version integer not null default 1,
  internal_ref text not null unique,
  serial_no text unique,
  item_id uuid not null,
  ao_id uuid,
  status text not null default 'planned' check (status in ('planned', 'building', 'testing', 'qc_hold', 'rework', 'in_stock', 'reserved', 'dispatched', 'in_service', 'scrapped')),
  location_id uuid,
  built_by uuid,
  built_at timestamptz,
  labour_minutes_total integer not null default 0,
  cost_materials_minor bigint,
  cost_labour_minor bigint,
  cost_total_minor bigint,
  qc_passed_at timestamptz,
  warranty_months integer,
  mac_address text,
  bios_version text,
  notes text,
  primary key (id)
);
comment on table prod.units is 'One row per computer; final serial assigned at QC pass.';
create table prod.unit_components (
  id uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version integer not null default 1,
  unit_id uuid not null,
  item_id uuid not null,
  component_serial_id uuid,
  lot_id uuid,
  qty numeric(16,4) not null default 1,
  unit_cost_minor bigint not null,
  installed_by uuid,
  installed_at timestamptz not null default now(),
  removed_at timestamptz,
  removed_reason text,
  replaced_by_id uuid,
  ticket_id uuid,
  primary key (id)
);
comment on table prod.unit_components is 'Genealogy: what is installed in a unit; replacements are new rows.';
create table prod.unit_steps (
  id uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version integer not null default 1,
  unit_id uuid not null,
  step_id uuid not null,
  status text not null default 'pending' check (status in ('pending', 'in_progress', 'done', 'skipped', 'blocked')),
  technician_id uuid,
  started_at timestamptz,
  completed_at timestamptz,
  minutes integer,
  checklist_result jsonb,
  notes text,
  primary key (id),
  unique (unit_id,step_id)
);
comment on table prod.unit_steps is 'Per-unit routing step progress.';
create table prod.test_runs (
  id uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version integer not null default 1,
  unit_id uuid not null,
  test_type text not null check (test_type in ('post', 'burn_in', 'stress', 'battery', 'display', 'network', 'keyboard', 'thermal', 'software')),
  result text not null check (result in ('pass', 'fail', 'aborted')),
  started_at timestamptz,
  finished_at timestamptz,
  tool text,
  metrics jsonb not null default '{}',
  log_attachment_id uuid,
  run_by uuid not null,
  primary key (id)
);
comment on table prod.test_runs is 'Test runs with logs.';
create table prod.software_licences (
  id uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version integer not null default 1,
  licence_type text not null check (licence_type in ('oem', 'volume', 'retail')),
  product_name text not null,
  key_enc bytea not null,
  key_hint text,
  status text not null default 'available' check (status in ('available', 'assigned', 'revoked')),
  assigned_unit_id uuid,
  assigned_by uuid,
  assigned_at timestamptz,
  source_grn_line_id uuid,
  primary key (id)
);
comment on table prod.software_licences is 'Licences; keys encrypted and never granted to browser roles.';
create table prod.imaging_records (
  id uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version integer not null default 1,
  unit_id uuid not null,
  os_name text not null,
  os_version text,
  image_checksum text,
  licence_id uuid,
  imaged_by uuid,
  imaged_at timestamptz not null,
  notes text,
  primary key (id)
);
comment on table prod.imaging_records is 'OS imaging per unit.';
create table prod.defect_codes (
  id uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version integer not null default 1,
  code text not null unique,
  name text not null,
  category text not null check (category in ('cosmetic', 'functional', 'component', 'process', 'documentation')),
  default_severity text not null default 'minor' check (default_severity in ('minor', 'major', 'critical')),
  active boolean not null default true,
  primary key (id)
);
comment on table prod.defect_codes is 'Defect catalogue.';
create table prod.qc_inspections (
  id uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version integer not null default 1,
  inspection_no text not null unique,
  unit_id uuid not null,
  inspector_id uuid not null,
  result text not null check (result in ('pass', 'fail', 'conditional')),
  checklist jsonb not null default '{}',
  notes text,
  inspected_at timestamptz not null,
  primary key (id)
);
comment on table prod.qc_inspections is 'Finished-unit inspections. A trigger blocks the builder from inspecting.';
create table prod.incoming_inspections (
  id uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version integer not null default 1,
  grn_line_id uuid not null,
  inspector_id uuid not null,
  sample_size integer,
  result text not null check (result in ('accept', 'reject', 'conditional')),
  checklist jsonb not null default '{}',
  notes text,
  inspected_at timestamptz not null,
  primary key (id)
);
comment on table prod.incoming_inspections is 'Inspection of received goods.';
create table prod.qc_defects (
  id uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version integer not null default 1,
  inspection_id uuid,
  incoming_inspection_id uuid,
  defect_code_id uuid not null,
  severity text not null check (severity in ('minor', 'major', 'critical')),
  item_id uuid,
  component_serial_id uuid,
  notes text,
  attachment_id uuid,
  primary key (id),
  check ((inspection_id is null) <> (incoming_inspection_id is null))
);
comment on table prod.qc_defects is 'Defects recorded on either inspection type.';
create table prod.rework_orders (
  id uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version integer not null default 1,
  rework_no text not null unique,
  unit_id uuid not null,
  qc_inspection_id uuid,
  status text not null default 'open' check (status in ('open', 'in_progress', 'done', 'cancelled')),
  assigned_to uuid,
  description text,
  resolved_at timestamptz,
  primary key (id)
);
comment on table prod.rework_orders is 'Rework after a failed inspection.';
create table sales.internal_orders (
  id uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version integer not null default 1,
  order_no text not null unique,
  account_id uuid not null,
  requested_by_name text,
  status text not null default 'draft' check (status in ('draft', 'pending_approval', 'approved', 'awaiting_build', 'ready', 'dispatched', 'completed', 'cancelled')),
  source_kind text check (source_kind in ('memo', 'email', 'lpo', 'verbal')),
  source_ref text,
  currency char(3) not null default 'GHS',
  subtotal_minor bigint not null default 0,
  discount_minor bigint not null default 0,
  tax_minor bigint not null default 0,
  total_minor bigint not null default 0,
  required_by date,
  delivery_point text,
  approval_id uuid,
  confirmed_at timestamptz,
  notes text,
  primary key (id)
);
comment on table sales.internal_orders is 'Orders from named accounts; prices snapshotted on confirmation.';
create table sales.internal_order_lines (
  id uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version integer not null default 1,
  order_id uuid not null,
  line_no integer not null,
  item_id uuid not null,
  description text,
  qty numeric(16,4) not null check (qty>0),
  unit_price_minor bigint not null,
  unit_cost_minor bigint,
  discount_minor bigint not null default 0,
  tax_code text,
  tax_rate_pct numeric(7,4) not null default 0,
  tax_minor bigint not null default 0,
  line_total_minor bigint not null,
  assembly_order_id uuid,
  primary key (id),
  unique (order_id,line_no)
);
comment on table sales.internal_order_lines is 'Lines with frozen price, cost and tax.';
create table sales.order_line_units (
  order_line_id uuid not null,
  unit_id uuid not null,
  primary key (order_line_id, unit_id)
);
comment on table sales.order_line_units is 'Serial units attached to an order line.';
create table sales.dispatches (
  id uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version integer not null default 1,
  dispatch_no text not null unique,
  order_id uuid not null,
  from_location_id uuid not null,
  status text not null default 'draft' check (status in ('draft', 'picked', 'dispatched', 'delivered', 'cancelled')),
  dispatched_by uuid,
  dispatched_at timestamptz,
  received_by_name text,
  received_by_phone text,
  received_at timestamptz,
  signature_attachment_id uuid,
  transport_note text,
  primary key (id)
);
comment on table sales.dispatches is 'Dispatch notes and handover.';
create table sales.dispatch_lines (
  id uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version integer not null default 1,
  dispatch_id uuid not null,
  order_line_id uuid not null,
  item_id uuid not null,
  qty numeric(16,4) not null,
  lot_id uuid,
  unit_id uuid,
  primary key (id)
);
comment on table sales.dispatch_lines is 'Dispatched quantities and units.';
create table sales.sales_returns (
  id uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version integer not null default 1,
  return_no text not null unique,
  order_id uuid not null,
  status text not null default 'requested' check (status in ('requested', 'approved', 'received', 'inspected', 'closed', 'rejected')),
  reason text,
  resolution text check (resolution in ('credit', 'replace')),
  approval_id uuid,
  credit_invoice_id uuid,
  primary key (id)
);
comment on table sales.sales_returns is 'Returns with approval and credit.';
create table sales.sales_return_lines (
  id uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version integer not null default 1,
  return_id uuid not null,
  order_line_id uuid,
  unit_id uuid,
  item_id uuid not null,
  qty numeric(16,4) not null,
  condition text check (condition in ('good', 'damaged', 'defective')),
  restock_location_id uuid,
  primary key (id)
);
comment on table sales.sales_return_lines is 'Returned items and condition.';
create table fin.fiscal_periods (
  id uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version integer not null default 1,
  code text not null unique,
  starts_on date not null,
  ends_on date not null,
  status text not null default 'open' check (status in ('open', 'soft_closed', 'closed')),
  closed_by uuid,
  closed_at timestamptz,
  approval_id uuid,
  primary key (id)
);
comment on table fin.fiscal_periods is 'Accounting periods with lock status.';
create table fin.chart_of_accounts (
  id uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version integer not null default 1,
  code text not null unique,
  name text not null,
  type text not null check (type in ('asset', 'liability', 'equity', 'revenue', 'expense', 'cogs')),
  normal_side text not null check (normal_side in ('debit', 'credit')),
  parent_id uuid,
  is_postable boolean not null default true,
  active boolean not null default true,
  primary key (id)
);
comment on table fin.chart_of_accounts is 'Lightweight chart of accounts.';
create table fin.journal_entries (
  id uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version integer not null default 1,
  entry_no text not null unique,
  entry_date date not null,
  period_id uuid not null,
  source_type text not null,
  source_id uuid,
  source_event text,
  memo text,
  currency char(3) not null default 'GHS',
  fx_rate numeric(18,8) not null default 1,
  status text not null default 'posted' check (status in ('posted', 'reversed')),
  reverses_entry_id uuid,
  primary key (id),
  unique (source_type,source_id,source_event)
);
comment on table fin.journal_entries is 'Posted entries; idempotent per source document and event.';
create table fin.journal_lines (
  id uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version integer not null default 1,
  entry_id uuid not null,
  line_no integer not null,
  account_id uuid not null,
  cost_centre_id uuid,
  debit_minor bigint not null default 0,
  credit_minor bigint not null default 0,
  memo text,
  party_type text,
  party_id uuid,
  primary key (id),
  unique (entry_id,line_no),
  check ((debit_minor = 0) <> (credit_minor = 0))
);
comment on table fin.journal_lines is 'Entry lines; a deferred trigger enforces balance.';
create table fin.bank_accounts (
  id uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version integer not null default 1,
  name text not null,
  bank_name text,
  account_last4 text,
  currency char(3) not null,
  gl_account_id uuid,
  details_enc bytea,
  active boolean not null default true,
  primary key (id)
);
comment on table fin.bank_accounts is 'Bank accounts; full details encrypted.';
create table fin.invoices (
  id uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version integer not null default 1,
  invoice_no text not null unique,
  kind text not null check (kind in ('proforma', 'tax_invoice', 'credit_note')),
  order_id uuid,
  account_id uuid not null,
  status text not null default 'draft' check (status in ('draft', 'issued', 'part_paid', 'paid', 'void')),
  issue_date date,
  due_date date,
  currency char(3) not null default 'GHS',
  subtotal_minor bigint not null default 0,
  discount_minor bigint not null default 0,
  tax_minor bigint not null default 0,
  total_minor bigint not null default 0,
  related_invoice_id uuid,
  evat_ref text,
  pdf_attachment_id uuid,
  notes text,
  primary key (id)
);
comment on table fin.invoices is 'Proforma, tax invoices, credit notes.';
create table fin.invoice_lines (
  id uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version integer not null default 1,
  invoice_id uuid not null,
  line_no integer not null,
  item_id uuid,
  unit_id uuid,
  description text,
  qty numeric(16,4) not null,
  unit_price_minor bigint not null,
  discount_minor bigint not null default 0,
  tax_code text,
  tax_rate_pct numeric(7,4) not null default 0,
  tax_minor bigint not null default 0,
  line_total_minor bigint not null,
  primary key (id),
  unique (invoice_id,line_no)
);
comment on table fin.invoice_lines is 'Invoice lines with frozen price and tax.';
create table fin.payments (
  id uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version integer not null default 1,
  payment_no text not null unique,
  direction text not null check (direction in ('in', 'out')),
  party_type text not null check (party_type in ('account', 'supplier', 'other')),
  party_id uuid,
  method text not null check (method in ('cash', 'bank_transfer', 'mobile_money', 'cheque', 'internal_transfer', 'lpo_offset')),
  amount_minor bigint not null check (amount_minor>0),
  currency char(3) not null,
  fx_rate numeric(18,8) not null default 1,
  amount_base_minor bigint not null,
  status text not null default 'cleared' check (status in ('pending', 'cleared', 'bounced', 'void')),
  reference text,
  bank_account_id uuid,
  paid_on date not null,
  notes text,
  approval_id uuid,
  primary key (id)
);
comment on table fin.payments is 'Money received or paid, recorded manually.';
create table fin.payment_allocations (
  id uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version integer not null default 1,
  payment_id uuid not null,
  invoice_id uuid,
  supplier_invoice_id uuid,
  amount_minor bigint not null,
  primary key (id),
  check ((invoice_id is null) <> (supplier_invoice_id is null))
);
comment on table fin.payment_allocations is 'Allocation of a payment to an invoice.';
create table fin.expense_categories (
  id uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version integer not null default 1,
  name text not null unique,
  gl_account_id uuid,
  active boolean not null default true,
  primary key (id)
);
comment on table fin.expense_categories is 'Expense categories mapped to accounts.';
create table fin.expenses (
  id uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version integer not null default 1,
  expense_no text not null unique,
  category_id uuid not null,
  cost_centre_id uuid,
  amount_minor bigint not null,
  currency char(3) not null default 'GHS',
  paid_to text,
  expense_date date not null,
  status text not null default 'draft' check (status in ('draft', 'pending_approval', 'approved', 'paid', 'rejected')),
  approval_id uuid,
  payment_id uuid,
  notes text,
  primary key (id)
);
comment on table fin.expenses is 'Expenses with approval.';
create table fin.budgets (
  id uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version integer not null default 1,
  fiscal_year integer not null,
  cost_centre_id uuid not null,
  account_id uuid,
  amount_minor bigint not null,
  notes text,
  primary key (id),
  unique (fiscal_year,cost_centre_id,account_id)
);
comment on table fin.budgets is 'Budgets by year, cost centre and account.';
create table svc.warranties (
  id uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version integer not null default 1,
  unit_id uuid not null unique,
  account_id uuid,
  order_id uuid,
  dispatch_id uuid,
  starts_on date not null,
  ends_on date not null,
  months integer not null,
  status text not null default 'active' check (status in ('active', 'expired', 'void', 'claimed')),
  terms_version text,
  extension_approval_id uuid,
  primary key (id)
);
comment on table svc.warranties is 'One warranty per unit; starts at handover.';
create table svc.service_tickets (
  id uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version integer not null default 1,
  ticket_no text not null unique,
  kind text not null check (kind in ('warranty_claim', 'paid_repair', 'inspection', 'complaint', 'preventive')),
  unit_id uuid,
  device_description text,
  device_serial text,
  account_id uuid,
  contact_name text,
  contact_phone text,
  contact_email citext,
  status text not null default 'received' check (status in ('received', 'diagnosing', 'awaiting_approval', 'awaiting_parts', 'in_repair', 'testing', 'ready_for_collection', 'closed', 'declined')),
  priority text not null default 'normal' check (priority in ('low', 'normal', 'high', 'urgent')),
  sla_due_at timestamptz,
  assigned_to uuid,
  warranty_id uuid,
  coverage text not null default 'undetermined' check (coverage in ('covered', 'not_covered', 'goodwill', 'undetermined')),
  goodwill_approval_id uuid,
  fault_description text,
  diagnosis text,
  resolution text,
  labour_minutes integer not null default 0,
  labour_charge_minor bigint not null default 0,
  loaner_unit_id uuid,
  received_at timestamptz not null default now(),
  closed_at timestamptz,
  invoice_id uuid,
  satisfaction smallint,
  primary key (id)
);
comment on table svc.service_tickets is 'Warranty claims, repairs, inspections, complaints.';
create table svc.service_parts (
  id uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version integer not null default 1,
  ticket_id uuid not null,
  item_id uuid not null,
  component_serial_id uuid,
  lot_id uuid,
  qty numeric(16,4) not null,
  unit_cost_minor bigint not null,
  unit_price_minor bigint not null default 0,
  covered_by text not null check (covered_by in ('warranty', 'supplier_claim', 'customer', 'goodwill')),
  replaced_component_id uuid,
  primary key (id)
);
comment on table svc.service_parts is 'Parts used on a ticket.';
create table svc.service_events (
  id uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  ticket_id uuid not null,
  event_type text not null,
  note text,
  internal_only boolean not null default false,
  primary key (id)
);
comment on table svc.service_events is 'Append-only ticket timeline.';

-- ===== 3. Foreign keys =====
alter table core.profiles add constraint fk_profiles_id foreign key (id) references auth.users(id);
alter table core.user_roles add constraint fk_user_roles_user_id foreign key (user_id) references core.profiles(id) on delete cascade;
alter table core.user_roles add constraint fk_user_roles_role_id foreign key (role_id) references core.roles(id);
alter table core.user_roles add constraint fk_user_roles_assigned_by foreign key (assigned_by) references core.profiles(id);
alter table core.locations add constraint fk_locations_parent_id foreign key (parent_id) references core.locations(id);
alter table core.cost_centres add constraint fk_cost_centres_parent_id foreign key (parent_id) references core.cost_centres(id);
alter table core.customer_accounts add constraint fk_customer_accounts_cost_centre_id foreign key (cost_centre_id) references core.cost_centres(id);
alter table core.exchange_rates add constraint fk_exchange_rates_currency_code foreign key (currency_code) references core.currencies(code);
alter table core.settings add constraint fk_settings_updated_by foreign key (updated_by) references core.profiles(id);
alter table core.approvals add constraint fk_approvals_rule_id foreign key (rule_id) references core.approval_rules(id);
alter table core.approvals add constraint fk_approvals_requested_by foreign key (requested_by) references core.profiles(id);
alter table core.approvals add constraint fk_approvals_decided_by foreign key (decided_by) references core.profiles(id);
alter table core.approvals add constraint fk_approvals_escalated_to foreign key (escalated_to) references core.profiles(id);
alter table core.attachments add constraint fk_attachments_uploaded_by foreign key (uploaded_by) references core.profiles(id);
alter table core.notifications add constraint fk_notifications_user_id foreign key (user_id) references core.profiles(id);
alter table core.import_batches add constraint fk_import_batches_file_attachment_id foreign key (file_attachment_id) references core.attachments(id);
alter table core.import_batches add constraint fk_import_batches_committed_by foreign key (committed_by) references core.profiles(id);
alter table catalog.categories add constraint fk_categories_parent_id foreign key (parent_id) references catalog.categories(id);
alter table catalog.items add constraint fk_items_category_id foreign key (category_id) references catalog.categories(id);
alter table catalog.items add constraint fk_items_brand_id foreign key (brand_id) references catalog.brands(id);
alter table catalog.items add constraint fk_items_family_id foreign key (family_id) references catalog.item_families(id);
alter table catalog.boms add constraint fk_boms_item_id foreign key (item_id) references catalog.items(id);
alter table catalog.boms add constraint fk_boms_approved_by foreign key (approved_by) references core.profiles(id);
alter table catalog.bom_lines add constraint fk_bom_lines_bom_id foreign key (bom_id) references catalog.boms(id) on delete cascade;
alter table catalog.bom_lines add constraint fk_bom_lines_component_item_id foreign key (component_item_id) references catalog.items(id);
alter table catalog.item_suppliers add constraint fk_item_suppliers_item_id foreign key (item_id) references catalog.items(id);
alter table catalog.item_suppliers add constraint fk_item_suppliers_supplier_id foreign key (supplier_id) references proc.suppliers(id);
alter table catalog.item_suppliers add constraint fk_item_suppliers_currency foreign key (currency) references core.currencies(code);
alter table catalog.price_list_items add constraint fk_price_list_items_price_list_id foreign key (price_list_id) references catalog.price_lists(id) on delete cascade;
alter table catalog.price_list_items add constraint fk_price_list_items_item_id foreign key (item_id) references catalog.items(id);
alter table proc.suppliers add constraint fk_suppliers_currency foreign key (currency) references core.currencies(code);
alter table proc.supplier_bank_changes add constraint fk_supplier_bank_changes_supplier_id foreign key (supplier_id) references proc.suppliers(id);
alter table proc.supplier_bank_changes add constraint fk_supplier_bank_changes_verified_by foreign key (verified_by) references core.profiles(id);
alter table proc.supplier_bank_changes add constraint fk_supplier_bank_changes_approval_id foreign key (approval_id) references core.approvals(id);
alter table proc.supplier_warranty_terms add constraint fk_supplier_warranty_terms_supplier_id foreign key (supplier_id) references proc.suppliers(id);
alter table proc.supplier_warranty_terms add constraint fk_supplier_warranty_terms_item_id foreign key (item_id) references catalog.items(id);
alter table proc.supplier_warranty_terms add constraint fk_supplier_warranty_terms_category_id foreign key (category_id) references catalog.categories(id);
alter table proc.requisitions add constraint fk_requisitions_requested_by foreign key (requested_by) references core.profiles(id);
alter table proc.requisitions add constraint fk_requisitions_assembly_order_id foreign key (assembly_order_id) references prod.assembly_orders(id);
alter table proc.requisitions add constraint fk_requisitions_approval_id foreign key (approval_id) references core.approvals(id);
alter table proc.requisition_lines add constraint fk_requisition_lines_requisition_id foreign key (requisition_id) references proc.requisitions(id) on delete cascade;
alter table proc.requisition_lines add constraint fk_requisition_lines_item_id foreign key (item_id) references catalog.items(id);
alter table proc.purchase_orders add constraint fk_purchase_orders_supplier_id foreign key (supplier_id) references proc.suppliers(id);
alter table proc.purchase_orders add constraint fk_purchase_orders_currency foreign key (currency) references core.currencies(code);
alter table proc.purchase_orders add constraint fk_purchase_orders_requisition_id foreign key (requisition_id) references proc.requisitions(id);
alter table proc.purchase_orders add constraint fk_purchase_orders_approval_id foreign key (approval_id) references core.approvals(id);
alter table proc.purchase_order_lines add constraint fk_purchase_order_lines_po_id foreign key (po_id) references proc.purchase_orders(id) on delete cascade;
alter table proc.purchase_order_lines add constraint fk_purchase_order_lines_item_id foreign key (item_id) references catalog.items(id);
alter table proc.shipments add constraint fk_shipments_supplier_id foreign key (supplier_id) references proc.suppliers(id);
alter table proc.shipments add constraint fk_shipments_carrier_id foreign key (carrier_id) references proc.logistics_partners(id);
alter table proc.shipments add constraint fk_shipments_forwarder_id foreign key (forwarder_id) references proc.logistics_partners(id);
alter table proc.shipments add constraint fk_shipments_clearing_agent_id foreign key (clearing_agent_id) references proc.logistics_partners(id);
alter table proc.shipments add constraint fk_shipments_currency foreign key (currency) references core.currencies(code);
alter table proc.shipment_lines add constraint fk_shipment_lines_shipment_id foreign key (shipment_id) references proc.shipments(id) on delete cascade;
alter table proc.shipment_lines add constraint fk_shipment_lines_po_line_id foreign key (po_line_id) references proc.purchase_order_lines(id);
alter table proc.shipment_lines add constraint fk_shipment_lines_item_id foreign key (item_id) references catalog.items(id);
alter table proc.shipment_events add constraint fk_shipment_events_shipment_id foreign key (shipment_id) references proc.shipments(id);
alter table proc.customs_entries add constraint fk_customs_entries_shipment_id foreign key (shipment_id) references proc.shipments(id);
alter table proc.customs_entries add constraint fk_customs_entries_agent_id foreign key (agent_id) references proc.logistics_partners(id);
alter table proc.shipment_charges add constraint fk_shipment_charges_shipment_id foreign key (shipment_id) references proc.shipments(id);
alter table proc.shipment_charges add constraint fk_shipment_charges_partner_id foreign key (partner_id) references proc.logistics_partners(id);
alter table proc.goods_receipts add constraint fk_goods_receipts_shipment_id foreign key (shipment_id) references proc.shipments(id);
alter table proc.goods_receipts add constraint fk_goods_receipts_po_id foreign key (po_id) references proc.purchase_orders(id);
alter table proc.goods_receipts add constraint fk_goods_receipts_supplier_id foreign key (supplier_id) references proc.suppliers(id);
alter table proc.goods_receipts add constraint fk_goods_receipts_location_id foreign key (location_id) references core.locations(id);
alter table proc.goods_receipts add constraint fk_goods_receipts_received_by foreign key (received_by) references core.profiles(id);
alter table proc.goods_receipt_lines add constraint fk_goods_receipt_lines_grn_id foreign key (grn_id) references proc.goods_receipts(id) on delete cascade;
alter table proc.goods_receipt_lines add constraint fk_goods_receipt_lines_po_line_id foreign key (po_line_id) references proc.purchase_order_lines(id);
alter table proc.goods_receipt_lines add constraint fk_goods_receipt_lines_shipment_line_id foreign key (shipment_line_id) references proc.shipment_lines(id);
alter table proc.goods_receipt_lines add constraint fk_goods_receipt_lines_item_id foreign key (item_id) references catalog.items(id);
alter table proc.landed_cost_runs add constraint fk_landed_cost_runs_shipment_id foreign key (shipment_id) references proc.shipments(id);
alter table proc.landed_cost_runs add constraint fk_landed_cost_runs_posted_by foreign key (posted_by) references core.profiles(id);
alter table proc.landed_cost_runs add constraint fk_landed_cost_runs_reversed_by foreign key (reversed_by) references core.profiles(id);
alter table proc.landed_cost_runs add constraint fk_landed_cost_runs_reversal_approval_id foreign key (reversal_approval_id) references core.approvals(id);
alter table proc.landed_cost_allocations add constraint fk_landed_cost_allocations_run_id foreign key (run_id) references proc.landed_cost_runs(id);
alter table proc.landed_cost_allocations add constraint fk_landed_cost_allocations_grn_line_id foreign key (grn_line_id) references proc.goods_receipt_lines(id);
alter table proc.landed_cost_allocations add constraint fk_landed_cost_allocations_charge_id foreign key (charge_id) references proc.shipment_charges(id);
alter table proc.supplier_invoices add constraint fk_supplier_invoices_supplier_id foreign key (supplier_id) references proc.suppliers(id);
alter table proc.supplier_invoices add constraint fk_supplier_invoices_po_id foreign key (po_id) references proc.purchase_orders(id);
alter table proc.supplier_invoices add constraint fk_supplier_invoices_shipment_id foreign key (shipment_id) references proc.shipments(id);
alter table proc.supplier_invoices add constraint fk_supplier_invoices_approved_by foreign key (approved_by) references core.profiles(id);
alter table proc.supplier_invoice_lines add constraint fk_supplier_invoice_lines_invoice_id foreign key (invoice_id) references proc.supplier_invoices(id) on delete cascade;
alter table proc.supplier_invoice_lines add constraint fk_supplier_invoice_lines_po_line_id foreign key (po_line_id) references proc.purchase_order_lines(id);
alter table proc.supplier_invoice_lines add constraint fk_supplier_invoice_lines_grn_line_id foreign key (grn_line_id) references proc.goods_receipt_lines(id);
alter table proc.supplier_invoice_lines add constraint fk_supplier_invoice_lines_item_id foreign key (item_id) references catalog.items(id);
alter table proc.supplier_rmas add constraint fk_supplier_rmas_supplier_id foreign key (supplier_id) references proc.suppliers(id);
alter table proc.supplier_rmas add constraint fk_supplier_rmas_ticket_id foreign key (ticket_id) references svc.service_tickets(id);
alter table proc.supplier_rmas add constraint fk_supplier_rmas_grn_id foreign key (grn_id) references proc.goods_receipts(id);
alter table proc.supplier_rmas add constraint fk_supplier_rmas_unit_id foreign key (unit_id) references prod.units(id);
alter table proc.supplier_rma_lines add constraint fk_supplier_rma_lines_rma_id foreign key (rma_id) references proc.supplier_rmas(id) on delete cascade;
alter table proc.supplier_rma_lines add constraint fk_supplier_rma_lines_item_id foreign key (item_id) references catalog.items(id);
alter table proc.supplier_rma_lines add constraint fk_supplier_rma_lines_lot_id foreign key (lot_id) references inv.lots(id);
alter table proc.supplier_rma_lines add constraint fk_supplier_rma_lines_component_serial_id foreign key (component_serial_id) references inv.component_serials(id);
alter table inv.lots add constraint fk_lots_item_id foreign key (item_id) references catalog.items(id);
alter table inv.lots add constraint fk_lots_supplier_id foreign key (supplier_id) references proc.suppliers(id);
alter table inv.lots add constraint fk_lots_grn_line_id foreign key (grn_line_id) references proc.goods_receipt_lines(id);
alter table inv.component_serials add constraint fk_component_serials_item_id foreign key (item_id) references catalog.items(id);
alter table inv.component_serials add constraint fk_component_serials_lot_id foreign key (lot_id) references inv.lots(id);
alter table inv.component_serials add constraint fk_component_serials_grn_line_id foreign key (grn_line_id) references proc.goods_receipt_lines(id);
alter table inv.component_serials add constraint fk_component_serials_location_id foreign key (location_id) references core.locations(id);
alter table inv.stock_ledger add constraint fk_stock_ledger_item_id foreign key (item_id) references catalog.items(id);
alter table inv.stock_ledger add constraint fk_stock_ledger_location_id foreign key (location_id) references core.locations(id);
alter table inv.stock_ledger add constraint fk_stock_ledger_lot_id foreign key (lot_id) references inv.lots(id);
alter table inv.stock_ledger add constraint fk_stock_ledger_component_serial_id foreign key (component_serial_id) references inv.component_serials(id);
alter table inv.stock_ledger add constraint fk_stock_ledger_unit_id foreign key (unit_id) references prod.units(id);
alter table inv.stock_ledger add constraint fk_stock_ledger_created_by foreign key (created_by) references core.profiles(id);
alter table inv.stock_snapshots add constraint fk_stock_snapshots_item_id foreign key (item_id) references catalog.items(id);
alter table inv.stock_snapshots add constraint fk_stock_snapshots_location_id foreign key (location_id) references core.locations(id);
alter table inv.item_cost_history add constraint fk_item_cost_history_item_id foreign key (item_id) references catalog.items(id);
alter table inv.reservations add constraint fk_reservations_item_id foreign key (item_id) references catalog.items(id);
alter table inv.reservations add constraint fk_reservations_location_id foreign key (location_id) references core.locations(id);
alter table inv.reservations add constraint fk_reservations_unit_id foreign key (unit_id) references prod.units(id);
alter table inv.transfers add constraint fk_transfers_from_location_id foreign key (from_location_id) references core.locations(id);
alter table inv.transfers add constraint fk_transfers_to_location_id foreign key (to_location_id) references core.locations(id);
alter table inv.transfer_lines add constraint fk_transfer_lines_transfer_id foreign key (transfer_id) references inv.transfers(id) on delete cascade;
alter table inv.transfer_lines add constraint fk_transfer_lines_item_id foreign key (item_id) references catalog.items(id);
alter table inv.transfer_lines add constraint fk_transfer_lines_lot_id foreign key (lot_id) references inv.lots(id);
alter table inv.transfer_lines add constraint fk_transfer_lines_component_serial_id foreign key (component_serial_id) references inv.component_serials(id);
alter table inv.transfer_lines add constraint fk_transfer_lines_unit_id foreign key (unit_id) references prod.units(id);
alter table inv.adjustments add constraint fk_adjustments_location_id foreign key (location_id) references core.locations(id);
alter table inv.adjustments add constraint fk_adjustments_approval_id foreign key (approval_id) references core.approvals(id);
alter table inv.adjustment_lines add constraint fk_adjustment_lines_adjustment_id foreign key (adjustment_id) references inv.adjustments(id) on delete cascade;
alter table inv.adjustment_lines add constraint fk_adjustment_lines_item_id foreign key (item_id) references catalog.items(id);
alter table inv.adjustment_lines add constraint fk_adjustment_lines_lot_id foreign key (lot_id) references inv.lots(id);
alter table inv.adjustment_lines add constraint fk_adjustment_lines_component_serial_id foreign key (component_serial_id) references inv.component_serials(id);
alter table inv.stock_counts add constraint fk_stock_counts_location_id foreign key (location_id) references core.locations(id);
alter table inv.stock_counts add constraint fk_stock_counts_adjustment_id foreign key (adjustment_id) references inv.adjustments(id);
alter table inv.stock_count_lines add constraint fk_stock_count_lines_count_id foreign key (count_id) references inv.stock_counts(id) on delete cascade;
alter table inv.stock_count_lines add constraint fk_stock_count_lines_item_id foreign key (item_id) references catalog.items(id);
alter table inv.stock_count_lines add constraint fk_stock_count_lines_lot_id foreign key (lot_id) references inv.lots(id);
alter table inv.stock_count_lines add constraint fk_stock_count_lines_counted_by foreign key (counted_by) references core.profiles(id);
alter table inv.reorder_policies add constraint fk_reorder_policies_item_id foreign key (item_id) references catalog.items(id);
alter table inv.reorder_policies add constraint fk_reorder_policies_location_id foreign key (location_id) references core.locations(id);
alter table inv.reorder_policies add constraint fk_reorder_policies_preferred_supplier_id foreign key (preferred_supplier_id) references proc.suppliers(id);
alter table inv.ewaste_records add constraint fk_ewaste_records_item_id foreign key (item_id) references catalog.items(id);
alter table prod.work_centers add constraint fk_work_centers_location_id foreign key (location_id) references core.locations(id);
alter table prod.routings add constraint fk_routings_item_id foreign key (item_id) references catalog.items(id);
alter table prod.routings add constraint fk_routings_family_id foreign key (family_id) references catalog.item_families(id);
alter table prod.routing_steps add constraint fk_routing_steps_routing_id foreign key (routing_id) references prod.routings(id) on delete cascade;
alter table prod.assembly_orders add constraint fk_assembly_orders_item_id foreign key (item_id) references catalog.items(id);
alter table prod.assembly_orders add constraint fk_assembly_orders_bom_id foreign key (bom_id) references catalog.boms(id);
alter table prod.assembly_orders add constraint fk_assembly_orders_routing_id foreign key (routing_id) references prod.routings(id);
alter table prod.assembly_orders add constraint fk_assembly_orders_internal_order_id foreign key (internal_order_id) references sales.internal_orders(id);
alter table prod.assembly_orders add constraint fk_assembly_orders_requested_by foreign key (requested_by) references core.profiles(id);
alter table prod.assembly_order_materials add constraint fk_assembly_order_materials_ao_id foreign key (ao_id) references prod.assembly_orders(id);
alter table prod.assembly_order_materials add constraint fk_assembly_order_materials_item_id foreign key (item_id) references catalog.items(id);
alter table prod.material_issues add constraint fk_material_issues_ao_id foreign key (ao_id) references prod.assembly_orders(id);
alter table prod.material_issues add constraint fk_material_issues_from_location_id foreign key (from_location_id) references core.locations(id);
alter table prod.material_issues add constraint fk_material_issues_to_location_id foreign key (to_location_id) references core.locations(id);
alter table prod.material_issues add constraint fk_material_issues_issued_by foreign key (issued_by) references core.profiles(id);
alter table prod.material_issue_lines add constraint fk_material_issue_lines_issue_id foreign key (issue_id) references prod.material_issues(id) on delete cascade;
alter table prod.material_issue_lines add constraint fk_material_issue_lines_ao_material_id foreign key (ao_material_id) references prod.assembly_order_materials(id);
alter table prod.material_issue_lines add constraint fk_material_issue_lines_item_id foreign key (item_id) references catalog.items(id);
alter table prod.material_issue_lines add constraint fk_material_issue_lines_lot_id foreign key (lot_id) references inv.lots(id);
alter table prod.material_issue_lines add constraint fk_material_issue_lines_component_serial_id foreign key (component_serial_id) references inv.component_serials(id);
alter table prod.units add constraint fk_units_item_id foreign key (item_id) references catalog.items(id);
alter table prod.units add constraint fk_units_ao_id foreign key (ao_id) references prod.assembly_orders(id);
alter table prod.units add constraint fk_units_location_id foreign key (location_id) references core.locations(id);
alter table prod.units add constraint fk_units_built_by foreign key (built_by) references core.profiles(id);
alter table prod.unit_components add constraint fk_unit_components_unit_id foreign key (unit_id) references prod.units(id);
alter table prod.unit_components add constraint fk_unit_components_item_id foreign key (item_id) references catalog.items(id);
alter table prod.unit_components add constraint fk_unit_components_component_serial_id foreign key (component_serial_id) references inv.component_serials(id);
alter table prod.unit_components add constraint fk_unit_components_lot_id foreign key (lot_id) references inv.lots(id);
alter table prod.unit_components add constraint fk_unit_components_installed_by foreign key (installed_by) references core.profiles(id);
alter table prod.unit_components add constraint fk_unit_components_replaced_by_id foreign key (replaced_by_id) references prod.unit_components(id);
alter table prod.unit_components add constraint fk_unit_components_ticket_id foreign key (ticket_id) references svc.service_tickets(id);
alter table prod.unit_steps add constraint fk_unit_steps_unit_id foreign key (unit_id) references prod.units(id);
alter table prod.unit_steps add constraint fk_unit_steps_step_id foreign key (step_id) references prod.routing_steps(id);
alter table prod.unit_steps add constraint fk_unit_steps_technician_id foreign key (technician_id) references core.profiles(id);
alter table prod.test_runs add constraint fk_test_runs_unit_id foreign key (unit_id) references prod.units(id);
alter table prod.test_runs add constraint fk_test_runs_log_attachment_id foreign key (log_attachment_id) references core.attachments(id);
alter table prod.test_runs add constraint fk_test_runs_run_by foreign key (run_by) references core.profiles(id);
alter table prod.software_licences add constraint fk_software_licences_assigned_unit_id foreign key (assigned_unit_id) references prod.units(id);
alter table prod.software_licences add constraint fk_software_licences_assigned_by foreign key (assigned_by) references core.profiles(id);
alter table prod.software_licences add constraint fk_software_licences_source_grn_line_id foreign key (source_grn_line_id) references proc.goods_receipt_lines(id);
alter table prod.imaging_records add constraint fk_imaging_records_unit_id foreign key (unit_id) references prod.units(id);
alter table prod.imaging_records add constraint fk_imaging_records_licence_id foreign key (licence_id) references prod.software_licences(id);
alter table prod.imaging_records add constraint fk_imaging_records_imaged_by foreign key (imaged_by) references core.profiles(id);
alter table prod.qc_inspections add constraint fk_qc_inspections_unit_id foreign key (unit_id) references prod.units(id);
alter table prod.qc_inspections add constraint fk_qc_inspections_inspector_id foreign key (inspector_id) references core.profiles(id);
alter table prod.incoming_inspections add constraint fk_incoming_inspections_grn_line_id foreign key (grn_line_id) references proc.goods_receipt_lines(id);
alter table prod.incoming_inspections add constraint fk_incoming_inspections_inspector_id foreign key (inspector_id) references core.profiles(id);
alter table prod.qc_defects add constraint fk_qc_defects_inspection_id foreign key (inspection_id) references prod.qc_inspections(id);
alter table prod.qc_defects add constraint fk_qc_defects_incoming_inspection_id foreign key (incoming_inspection_id) references prod.incoming_inspections(id);
alter table prod.qc_defects add constraint fk_qc_defects_defect_code_id foreign key (defect_code_id) references prod.defect_codes(id);
alter table prod.qc_defects add constraint fk_qc_defects_item_id foreign key (item_id) references catalog.items(id);
alter table prod.qc_defects add constraint fk_qc_defects_component_serial_id foreign key (component_serial_id) references inv.component_serials(id);
alter table prod.qc_defects add constraint fk_qc_defects_attachment_id foreign key (attachment_id) references core.attachments(id);
alter table prod.rework_orders add constraint fk_rework_orders_unit_id foreign key (unit_id) references prod.units(id);
alter table prod.rework_orders add constraint fk_rework_orders_qc_inspection_id foreign key (qc_inspection_id) references prod.qc_inspections(id);
alter table prod.rework_orders add constraint fk_rework_orders_assigned_to foreign key (assigned_to) references core.profiles(id);
alter table sales.internal_orders add constraint fk_internal_orders_account_id foreign key (account_id) references core.customer_accounts(id);
alter table sales.internal_orders add constraint fk_internal_orders_approval_id foreign key (approval_id) references core.approvals(id);
alter table sales.internal_order_lines add constraint fk_internal_order_lines_order_id foreign key (order_id) references sales.internal_orders(id) on delete cascade;
alter table sales.internal_order_lines add constraint fk_internal_order_lines_item_id foreign key (item_id) references catalog.items(id);
alter table sales.internal_order_lines add constraint fk_internal_order_lines_assembly_order_id foreign key (assembly_order_id) references prod.assembly_orders(id);
alter table sales.order_line_units add constraint fk_order_line_units_order_line_id foreign key (order_line_id) references sales.internal_order_lines(id) on delete cascade;
alter table sales.order_line_units add constraint fk_order_line_units_unit_id foreign key (unit_id) references prod.units(id);
alter table sales.dispatches add constraint fk_dispatches_order_id foreign key (order_id) references sales.internal_orders(id);
alter table sales.dispatches add constraint fk_dispatches_from_location_id foreign key (from_location_id) references core.locations(id);
alter table sales.dispatches add constraint fk_dispatches_dispatched_by foreign key (dispatched_by) references core.profiles(id);
alter table sales.dispatches add constraint fk_dispatches_signature_attachment_id foreign key (signature_attachment_id) references core.attachments(id);
alter table sales.dispatch_lines add constraint fk_dispatch_lines_dispatch_id foreign key (dispatch_id) references sales.dispatches(id) on delete cascade;
alter table sales.dispatch_lines add constraint fk_dispatch_lines_order_line_id foreign key (order_line_id) references sales.internal_order_lines(id);
alter table sales.dispatch_lines add constraint fk_dispatch_lines_item_id foreign key (item_id) references catalog.items(id);
alter table sales.dispatch_lines add constraint fk_dispatch_lines_lot_id foreign key (lot_id) references inv.lots(id);
alter table sales.dispatch_lines add constraint fk_dispatch_lines_unit_id foreign key (unit_id) references prod.units(id);
alter table sales.sales_returns add constraint fk_sales_returns_order_id foreign key (order_id) references sales.internal_orders(id);
alter table sales.sales_returns add constraint fk_sales_returns_approval_id foreign key (approval_id) references core.approvals(id);
alter table sales.sales_returns add constraint fk_sales_returns_credit_invoice_id foreign key (credit_invoice_id) references fin.invoices(id);
alter table sales.sales_return_lines add constraint fk_sales_return_lines_return_id foreign key (return_id) references sales.sales_returns(id) on delete cascade;
alter table sales.sales_return_lines add constraint fk_sales_return_lines_order_line_id foreign key (order_line_id) references sales.internal_order_lines(id);
alter table sales.sales_return_lines add constraint fk_sales_return_lines_unit_id foreign key (unit_id) references prod.units(id);
alter table sales.sales_return_lines add constraint fk_sales_return_lines_item_id foreign key (item_id) references catalog.items(id);
alter table sales.sales_return_lines add constraint fk_sales_return_lines_restock_location_id foreign key (restock_location_id) references core.locations(id);
alter table fin.fiscal_periods add constraint fk_fiscal_periods_closed_by foreign key (closed_by) references core.profiles(id);
alter table fin.fiscal_periods add constraint fk_fiscal_periods_approval_id foreign key (approval_id) references core.approvals(id);
alter table fin.chart_of_accounts add constraint fk_chart_of_accounts_parent_id foreign key (parent_id) references fin.chart_of_accounts(id);
alter table fin.journal_entries add constraint fk_journal_entries_period_id foreign key (period_id) references fin.fiscal_periods(id);
alter table fin.journal_entries add constraint fk_journal_entries_reverses_entry_id foreign key (reverses_entry_id) references fin.journal_entries(id);
alter table fin.journal_lines add constraint fk_journal_lines_entry_id foreign key (entry_id) references fin.journal_entries(id) on delete cascade;
alter table fin.journal_lines add constraint fk_journal_lines_account_id foreign key (account_id) references fin.chart_of_accounts(id);
alter table fin.journal_lines add constraint fk_journal_lines_cost_centre_id foreign key (cost_centre_id) references core.cost_centres(id);
alter table fin.bank_accounts add constraint fk_bank_accounts_gl_account_id foreign key (gl_account_id) references fin.chart_of_accounts(id);
alter table fin.invoices add constraint fk_invoices_order_id foreign key (order_id) references sales.internal_orders(id);
alter table fin.invoices add constraint fk_invoices_account_id foreign key (account_id) references core.customer_accounts(id);
alter table fin.invoices add constraint fk_invoices_related_invoice_id foreign key (related_invoice_id) references fin.invoices(id);
alter table fin.invoices add constraint fk_invoices_pdf_attachment_id foreign key (pdf_attachment_id) references core.attachments(id);
alter table fin.invoice_lines add constraint fk_invoice_lines_invoice_id foreign key (invoice_id) references fin.invoices(id) on delete cascade;
alter table fin.invoice_lines add constraint fk_invoice_lines_item_id foreign key (item_id) references catalog.items(id);
alter table fin.invoice_lines add constraint fk_invoice_lines_unit_id foreign key (unit_id) references prod.units(id);
alter table fin.payments add constraint fk_payments_bank_account_id foreign key (bank_account_id) references fin.bank_accounts(id);
alter table fin.payments add constraint fk_payments_approval_id foreign key (approval_id) references core.approvals(id);
alter table fin.payment_allocations add constraint fk_payment_allocations_payment_id foreign key (payment_id) references fin.payments(id);
alter table fin.payment_allocations add constraint fk_payment_allocations_invoice_id foreign key (invoice_id) references fin.invoices(id);
alter table fin.payment_allocations add constraint fk_payment_allocations_supplier_invoice_id foreign key (supplier_invoice_id) references proc.supplier_invoices(id);
alter table fin.expense_categories add constraint fk_expense_categories_gl_account_id foreign key (gl_account_id) references fin.chart_of_accounts(id);
alter table fin.expenses add constraint fk_expenses_category_id foreign key (category_id) references fin.expense_categories(id);
alter table fin.expenses add constraint fk_expenses_cost_centre_id foreign key (cost_centre_id) references core.cost_centres(id);
alter table fin.expenses add constraint fk_expenses_approval_id foreign key (approval_id) references core.approvals(id);
alter table fin.expenses add constraint fk_expenses_payment_id foreign key (payment_id) references fin.payments(id);
alter table fin.budgets add constraint fk_budgets_cost_centre_id foreign key (cost_centre_id) references core.cost_centres(id);
alter table fin.budgets add constraint fk_budgets_account_id foreign key (account_id) references fin.chart_of_accounts(id);
alter table svc.warranties add constraint fk_warranties_unit_id foreign key (unit_id) references prod.units(id);
alter table svc.warranties add constraint fk_warranties_account_id foreign key (account_id) references core.customer_accounts(id);
alter table svc.warranties add constraint fk_warranties_order_id foreign key (order_id) references sales.internal_orders(id);
alter table svc.warranties add constraint fk_warranties_dispatch_id foreign key (dispatch_id) references sales.dispatches(id);
alter table svc.warranties add constraint fk_warranties_extension_approval_id foreign key (extension_approval_id) references core.approvals(id);
alter table svc.service_tickets add constraint fk_service_tickets_unit_id foreign key (unit_id) references prod.units(id);
alter table svc.service_tickets add constraint fk_service_tickets_account_id foreign key (account_id) references core.customer_accounts(id);
alter table svc.service_tickets add constraint fk_service_tickets_assigned_to foreign key (assigned_to) references core.profiles(id);
alter table svc.service_tickets add constraint fk_service_tickets_warranty_id foreign key (warranty_id) references svc.warranties(id);
alter table svc.service_tickets add constraint fk_service_tickets_goodwill_approval_id foreign key (goodwill_approval_id) references core.approvals(id);
alter table svc.service_tickets add constraint fk_service_tickets_loaner_unit_id foreign key (loaner_unit_id) references prod.units(id);
alter table svc.service_tickets add constraint fk_service_tickets_invoice_id foreign key (invoice_id) references fin.invoices(id);
alter table svc.service_parts add constraint fk_service_parts_ticket_id foreign key (ticket_id) references svc.service_tickets(id);
alter table svc.service_parts add constraint fk_service_parts_item_id foreign key (item_id) references catalog.items(id);
alter table svc.service_parts add constraint fk_service_parts_component_serial_id foreign key (component_serial_id) references inv.component_serials(id);
alter table svc.service_parts add constraint fk_service_parts_lot_id foreign key (lot_id) references inv.lots(id);
alter table svc.service_parts add constraint fk_service_parts_replaced_component_id foreign key (replaced_component_id) references prod.unit_components(id);
alter table svc.service_events add constraint fk_service_events_ticket_id foreign key (ticket_id) references svc.service_tickets(id);

-- ===== 4. Indexes =====
create index ix_user_roles_role_id on core.user_roles(role_id);
create index ix_user_roles_assigned_by on core.user_roles(assigned_by);
create index ix_locations_parent_id on core.locations(parent_id);
create index ix_cost_centres_parent_id on core.cost_centres(parent_id);
create index ix_customer_accounts_cost_centre_id on core.customer_accounts(cost_centre_id);
create index ix_settings_updated_by on core.settings(updated_by);
create index ix_approvals_rule_id on core.approvals(rule_id);
create index ix_approvals_requested_by on core.approvals(requested_by);
create index ix_approvals_decided_by on core.approvals(decided_by);
create index ix_approvals_escalated_to on core.approvals(escalated_to);
create index ix_approvals_x1 on core.approvals(subject_type,subject_id);
create index ix_approvals_x2 on core.approvals(status,due_at);
create index ix_attachments_uploaded_by on core.attachments(uploaded_by);
create index ix_attachments_x1 on core.attachments(entity_type,entity_id);
create index ix_audit_log_x1 on core.audit_log(entity_type,entity_id,at);
create index ix_audit_log_x2 on core.audit_log(actor_id,at);
create index ix_outbox_events_x1 on core.outbox_events(processed_at,available_at);
create index ix_notifications_user_id on core.notifications(user_id);
create index ix_notifications_x1 on core.notifications(user_id,status,created_at);
create index ix_import_batches_file_attachment_id on core.import_batches(file_attachment_id);
create index ix_import_batches_committed_by on core.import_batches(committed_by);
create index ix_categories_parent_id on catalog.categories(parent_id);
create index ix_items_category_id on catalog.items(category_id);
create index ix_items_brand_id on catalog.items(brand_id);
create index ix_items_family_id on catalog.items(family_id);
create index ix_items_x1 on catalog.items(category_id,is_active);
create index ix_boms_approved_by on catalog.boms(approved_by);
create unique index uq_boms_one_active on catalog.boms(item_id) where status = 'active';
create index ix_bom_lines_bom_id on catalog.bom_lines(bom_id);
create index ix_bom_lines_component_item_id on catalog.bom_lines(component_item_id);
create index ix_item_suppliers_supplier_id on catalog.item_suppliers(supplier_id);
create index ix_item_suppliers_currency on catalog.item_suppliers(currency);
create index ix_price_list_items_item_id on catalog.price_list_items(item_id);
create index ix_suppliers_currency on proc.suppliers(currency);
create index ix_suppliers_x1 on proc.suppliers(name);
create index ix_supplier_bank_changes_supplier_id on proc.supplier_bank_changes(supplier_id);
create index ix_supplier_bank_changes_verified_by on proc.supplier_bank_changes(verified_by);
create index ix_supplier_bank_changes_approval_id on proc.supplier_bank_changes(approval_id);
create index ix_supplier_warranty_terms_supplier_id on proc.supplier_warranty_terms(supplier_id);
create index ix_supplier_warranty_terms_item_id on proc.supplier_warranty_terms(item_id);
create index ix_supplier_warranty_terms_category_id on proc.supplier_warranty_terms(category_id);
create index ix_requisitions_requested_by on proc.requisitions(requested_by);
create index ix_requisitions_assembly_order_id on proc.requisitions(assembly_order_id);
create index ix_requisitions_approval_id on proc.requisitions(approval_id);
create index ix_requisition_lines_requisition_id on proc.requisition_lines(requisition_id);
create index ix_requisition_lines_item_id on proc.requisition_lines(item_id);
create index ix_purchase_orders_supplier_id on proc.purchase_orders(supplier_id);
create index ix_purchase_orders_currency on proc.purchase_orders(currency);
create index ix_purchase_orders_requisition_id on proc.purchase_orders(requisition_id);
create index ix_purchase_orders_approval_id on proc.purchase_orders(approval_id);
create index ix_purchase_orders_x1 on proc.purchase_orders(status);
create index ix_purchase_order_lines_item_id on proc.purchase_order_lines(item_id);
create index ix_shipments_supplier_id on proc.shipments(supplier_id);
create index ix_shipments_carrier_id on proc.shipments(carrier_id);
create index ix_shipments_forwarder_id on proc.shipments(forwarder_id);
create index ix_shipments_clearing_agent_id on proc.shipments(clearing_agent_id);
create index ix_shipments_currency on proc.shipments(currency);
create index ix_shipments_x1 on proc.shipments(status,eta);
create index ix_shipments_x2 on proc.shipments(bl_awb_no);
create index ix_shipment_lines_shipment_id on proc.shipment_lines(shipment_id);
create index ix_shipment_lines_po_line_id on proc.shipment_lines(po_line_id);
create index ix_shipment_lines_item_id on proc.shipment_lines(item_id);
create index ix_shipment_events_shipment_id on proc.shipment_events(shipment_id);
create index ix_shipment_events_x1 on proc.shipment_events(shipment_id,occurred_at);
create index ix_customs_entries_shipment_id on proc.customs_entries(shipment_id);
create index ix_customs_entries_agent_id on proc.customs_entries(agent_id);
create index ix_shipment_charges_shipment_id on proc.shipment_charges(shipment_id);
create index ix_shipment_charges_partner_id on proc.shipment_charges(partner_id);
create index ix_shipment_charges_x1 on proc.shipment_charges(shipment_id,status);
create index ix_goods_receipts_shipment_id on proc.goods_receipts(shipment_id);
create index ix_goods_receipts_po_id on proc.goods_receipts(po_id);
create index ix_goods_receipts_supplier_id on proc.goods_receipts(supplier_id);
create index ix_goods_receipts_location_id on proc.goods_receipts(location_id);
create index ix_goods_receipts_received_by on proc.goods_receipts(received_by);
create index ix_goods_receipt_lines_grn_id on proc.goods_receipt_lines(grn_id);
create index ix_goods_receipt_lines_po_line_id on proc.goods_receipt_lines(po_line_id);
create index ix_goods_receipt_lines_shipment_line_id on proc.goods_receipt_lines(shipment_line_id);
create index ix_goods_receipt_lines_item_id on proc.goods_receipt_lines(item_id);
create index ix_landed_cost_runs_shipment_id on proc.landed_cost_runs(shipment_id);
create index ix_landed_cost_runs_posted_by on proc.landed_cost_runs(posted_by);
create index ix_landed_cost_runs_reversed_by on proc.landed_cost_runs(reversed_by);
create index ix_landed_cost_runs_reversal_approval_id on proc.landed_cost_runs(reversal_approval_id);
create index ix_landed_cost_allocations_run_id on proc.landed_cost_allocations(run_id);
create index ix_landed_cost_allocations_grn_line_id on proc.landed_cost_allocations(grn_line_id);
create index ix_landed_cost_allocations_charge_id on proc.landed_cost_allocations(charge_id);
create index ix_supplier_invoices_po_id on proc.supplier_invoices(po_id);
create index ix_supplier_invoices_shipment_id on proc.supplier_invoices(shipment_id);
create index ix_supplier_invoices_approved_by on proc.supplier_invoices(approved_by);
create index ix_supplier_invoice_lines_invoice_id on proc.supplier_invoice_lines(invoice_id);
create index ix_supplier_invoice_lines_po_line_id on proc.supplier_invoice_lines(po_line_id);
create index ix_supplier_invoice_lines_grn_line_id on proc.supplier_invoice_lines(grn_line_id);
create index ix_supplier_invoice_lines_item_id on proc.supplier_invoice_lines(item_id);
create index ix_supplier_rmas_supplier_id on proc.supplier_rmas(supplier_id);
create index ix_supplier_rmas_ticket_id on proc.supplier_rmas(ticket_id);
create index ix_supplier_rmas_grn_id on proc.supplier_rmas(grn_id);
create index ix_supplier_rmas_unit_id on proc.supplier_rmas(unit_id);
create index ix_supplier_rma_lines_rma_id on proc.supplier_rma_lines(rma_id);
create index ix_supplier_rma_lines_item_id on proc.supplier_rma_lines(item_id);
create index ix_supplier_rma_lines_lot_id on proc.supplier_rma_lines(lot_id);
create index ix_supplier_rma_lines_component_serial_id on proc.supplier_rma_lines(component_serial_id);
create index ix_lots_supplier_id on inv.lots(supplier_id);
create index ix_lots_grn_line_id on inv.lots(grn_line_id);
create index ix_component_serials_lot_id on inv.component_serials(lot_id);
create index ix_component_serials_grn_line_id on inv.component_serials(grn_line_id);
create index ix_component_serials_location_id on inv.component_serials(location_id);
create index ix_stock_ledger_item_id on inv.stock_ledger(item_id);
create index ix_stock_ledger_location_id on inv.stock_ledger(location_id);
create index ix_stock_ledger_lot_id on inv.stock_ledger(lot_id);
create index ix_stock_ledger_component_serial_id on inv.stock_ledger(component_serial_id);
create index ix_stock_ledger_unit_id on inv.stock_ledger(unit_id);
create index ix_stock_ledger_created_by on inv.stock_ledger(created_by);
create index ix_stock_ledger_x1 on inv.stock_ledger(item_id,location_id,posted_at desc);
create index ix_stock_ledger_x2 on inv.stock_ledger(ref_type,ref_id);
create index ix_stock_snapshots_item_id on inv.stock_snapshots(item_id);
create index ix_stock_snapshots_location_id on inv.stock_snapshots(location_id);
create index ix_item_cost_history_item_id on inv.item_cost_history(item_id);
create index ix_item_cost_history_x1 on inv.item_cost_history(item_id,effective_at desc);
create index ix_reservations_item_id on inv.reservations(item_id);
create index ix_reservations_location_id on inv.reservations(location_id);
create index ix_reservations_unit_id on inv.reservations(unit_id);
create unique index uq_reservations_active_unit on inv.reservations(unit_id) where status = 'active' and unit_id is not null;
create index ix_transfers_from_location_id on inv.transfers(from_location_id);
create index ix_transfers_to_location_id on inv.transfers(to_location_id);
create index ix_transfer_lines_transfer_id on inv.transfer_lines(transfer_id);
create index ix_transfer_lines_item_id on inv.transfer_lines(item_id);
create index ix_transfer_lines_lot_id on inv.transfer_lines(lot_id);
create index ix_transfer_lines_component_serial_id on inv.transfer_lines(component_serial_id);
create index ix_transfer_lines_unit_id on inv.transfer_lines(unit_id);
create index ix_adjustments_location_id on inv.adjustments(location_id);
create index ix_adjustments_approval_id on inv.adjustments(approval_id);
create index ix_adjustment_lines_adjustment_id on inv.adjustment_lines(adjustment_id);
create index ix_adjustment_lines_item_id on inv.adjustment_lines(item_id);
create index ix_adjustment_lines_lot_id on inv.adjustment_lines(lot_id);
create index ix_adjustment_lines_component_serial_id on inv.adjustment_lines(component_serial_id);
create index ix_stock_counts_location_id on inv.stock_counts(location_id);
create index ix_stock_counts_adjustment_id on inv.stock_counts(adjustment_id);
create index ix_stock_count_lines_count_id on inv.stock_count_lines(count_id);
create index ix_stock_count_lines_item_id on inv.stock_count_lines(item_id);
create index ix_stock_count_lines_lot_id on inv.stock_count_lines(lot_id);
create index ix_stock_count_lines_counted_by on inv.stock_count_lines(counted_by);
create index ix_reorder_policies_location_id on inv.reorder_policies(location_id);
create index ix_reorder_policies_preferred_supplier_id on inv.reorder_policies(preferred_supplier_id);
create index ix_ewaste_records_item_id on inv.ewaste_records(item_id);
create index ix_work_centers_location_id on prod.work_centers(location_id);
create index ix_routings_item_id on prod.routings(item_id);
create index ix_routings_family_id on prod.routings(family_id);
create index ix_assembly_orders_item_id on prod.assembly_orders(item_id);
create index ix_assembly_orders_bom_id on prod.assembly_orders(bom_id);
create index ix_assembly_orders_routing_id on prod.assembly_orders(routing_id);
create index ix_assembly_orders_internal_order_id on prod.assembly_orders(internal_order_id);
create index ix_assembly_orders_requested_by on prod.assembly_orders(requested_by);
create index ix_assembly_orders_x1 on prod.assembly_orders(status,priority);
create index ix_assembly_order_materials_ao_id on prod.assembly_order_materials(ao_id);
create index ix_assembly_order_materials_item_id on prod.assembly_order_materials(item_id);
create index ix_material_issues_ao_id on prod.material_issues(ao_id);
create index ix_material_issues_from_location_id on prod.material_issues(from_location_id);
create index ix_material_issues_to_location_id on prod.material_issues(to_location_id);
create index ix_material_issues_issued_by on prod.material_issues(issued_by);
create index ix_material_issue_lines_issue_id on prod.material_issue_lines(issue_id);
create index ix_material_issue_lines_ao_material_id on prod.material_issue_lines(ao_material_id);
create index ix_material_issue_lines_item_id on prod.material_issue_lines(item_id);
create index ix_material_issue_lines_lot_id on prod.material_issue_lines(lot_id);
create index ix_material_issue_lines_component_serial_id on prod.material_issue_lines(component_serial_id);
create index ix_units_item_id on prod.units(item_id);
create index ix_units_ao_id on prod.units(ao_id);
create index ix_units_location_id on prod.units(location_id);
create index ix_units_built_by on prod.units(built_by);
create index ix_units_x1 on prod.units(item_id,status);
create index ix_units_x2 on prod.units(ao_id);
create index ix_unit_components_unit_id on prod.unit_components(unit_id);
create index ix_unit_components_item_id on prod.unit_components(item_id);
create index ix_unit_components_component_serial_id on prod.unit_components(component_serial_id);
create index ix_unit_components_lot_id on prod.unit_components(lot_id);
create index ix_unit_components_installed_by on prod.unit_components(installed_by);
create index ix_unit_components_replaced_by_id on prod.unit_components(replaced_by_id);
create index ix_unit_components_ticket_id on prod.unit_components(ticket_id);
create index ix_unit_components_x1 on prod.unit_components(unit_id);
create index ix_unit_components_x2 on prod.unit_components(component_serial_id);
create index ix_unit_components_x3 on prod.unit_components(lot_id);
create index ix_unit_steps_step_id on prod.unit_steps(step_id);
create index ix_unit_steps_technician_id on prod.unit_steps(technician_id);
create index ix_test_runs_unit_id on prod.test_runs(unit_id);
create index ix_test_runs_log_attachment_id on prod.test_runs(log_attachment_id);
create index ix_test_runs_run_by on prod.test_runs(run_by);
create index ix_software_licences_assigned_unit_id on prod.software_licences(assigned_unit_id);
create index ix_software_licences_assigned_by on prod.software_licences(assigned_by);
create index ix_software_licences_source_grn_line_id on prod.software_licences(source_grn_line_id);
create index ix_imaging_records_unit_id on prod.imaging_records(unit_id);
create index ix_imaging_records_licence_id on prod.imaging_records(licence_id);
create index ix_imaging_records_imaged_by on prod.imaging_records(imaged_by);
create index ix_qc_inspections_unit_id on prod.qc_inspections(unit_id);
create index ix_qc_inspections_inspector_id on prod.qc_inspections(inspector_id);
create index ix_incoming_inspections_grn_line_id on prod.incoming_inspections(grn_line_id);
create index ix_incoming_inspections_inspector_id on prod.incoming_inspections(inspector_id);
create index ix_qc_defects_inspection_id on prod.qc_defects(inspection_id);
create index ix_qc_defects_incoming_inspection_id on prod.qc_defects(incoming_inspection_id);
create index ix_qc_defects_defect_code_id on prod.qc_defects(defect_code_id);
create index ix_qc_defects_item_id on prod.qc_defects(item_id);
create index ix_qc_defects_component_serial_id on prod.qc_defects(component_serial_id);
create index ix_qc_defects_attachment_id on prod.qc_defects(attachment_id);
create index ix_rework_orders_unit_id on prod.rework_orders(unit_id);
create index ix_rework_orders_qc_inspection_id on prod.rework_orders(qc_inspection_id);
create index ix_rework_orders_assigned_to on prod.rework_orders(assigned_to);
create index ix_internal_orders_account_id on sales.internal_orders(account_id);
create index ix_internal_orders_approval_id on sales.internal_orders(approval_id);
create index ix_internal_orders_x1 on sales.internal_orders(account_id,status);
create index ix_internal_order_lines_item_id on sales.internal_order_lines(item_id);
create index ix_internal_order_lines_assembly_order_id on sales.internal_order_lines(assembly_order_id);
create index ix_order_line_units_unit_id on sales.order_line_units(unit_id);
create index ix_dispatches_order_id on sales.dispatches(order_id);
create index ix_dispatches_from_location_id on sales.dispatches(from_location_id);
create index ix_dispatches_dispatched_by on sales.dispatches(dispatched_by);
create index ix_dispatches_signature_attachment_id on sales.dispatches(signature_attachment_id);
create index ix_dispatch_lines_dispatch_id on sales.dispatch_lines(dispatch_id);
create index ix_dispatch_lines_order_line_id on sales.dispatch_lines(order_line_id);
create index ix_dispatch_lines_item_id on sales.dispatch_lines(item_id);
create index ix_dispatch_lines_lot_id on sales.dispatch_lines(lot_id);
create index ix_dispatch_lines_unit_id on sales.dispatch_lines(unit_id);
create index ix_sales_returns_order_id on sales.sales_returns(order_id);
create index ix_sales_returns_approval_id on sales.sales_returns(approval_id);
create index ix_sales_returns_credit_invoice_id on sales.sales_returns(credit_invoice_id);
create index ix_sales_return_lines_return_id on sales.sales_return_lines(return_id);
create index ix_sales_return_lines_order_line_id on sales.sales_return_lines(order_line_id);
create index ix_sales_return_lines_unit_id on sales.sales_return_lines(unit_id);
create index ix_sales_return_lines_item_id on sales.sales_return_lines(item_id);
create index ix_sales_return_lines_restock_location_id on sales.sales_return_lines(restock_location_id);
create index ix_fiscal_periods_closed_by on fin.fiscal_periods(closed_by);
create index ix_fiscal_periods_approval_id on fin.fiscal_periods(approval_id);
create index ix_chart_of_accounts_parent_id on fin.chart_of_accounts(parent_id);
create index ix_journal_entries_period_id on fin.journal_entries(period_id);
create index ix_journal_entries_reverses_entry_id on fin.journal_entries(reverses_entry_id);
create index ix_journal_lines_account_id on fin.journal_lines(account_id);
create index ix_journal_lines_cost_centre_id on fin.journal_lines(cost_centre_id);
create index ix_bank_accounts_gl_account_id on fin.bank_accounts(gl_account_id);
create index ix_invoices_order_id on fin.invoices(order_id);
create index ix_invoices_account_id on fin.invoices(account_id);
create index ix_invoices_related_invoice_id on fin.invoices(related_invoice_id);
create index ix_invoices_pdf_attachment_id on fin.invoices(pdf_attachment_id);
create index ix_invoices_x1 on fin.invoices(account_id,status);
create index ix_invoices_x2 on fin.invoices(due_date);
create index ix_invoice_lines_item_id on fin.invoice_lines(item_id);
create index ix_invoice_lines_unit_id on fin.invoice_lines(unit_id);
create index ix_payments_bank_account_id on fin.payments(bank_account_id);
create index ix_payments_approval_id on fin.payments(approval_id);
create index ix_payments_x1 on fin.payments(party_type,party_id);
create index ix_payment_allocations_payment_id on fin.payment_allocations(payment_id);
create index ix_payment_allocations_invoice_id on fin.payment_allocations(invoice_id);
create index ix_payment_allocations_supplier_invoice_id on fin.payment_allocations(supplier_invoice_id);
create index ix_expense_categories_gl_account_id on fin.expense_categories(gl_account_id);
create index ix_expenses_category_id on fin.expenses(category_id);
create index ix_expenses_cost_centre_id on fin.expenses(cost_centre_id);
create index ix_expenses_approval_id on fin.expenses(approval_id);
create index ix_expenses_payment_id on fin.expenses(payment_id);
create index ix_budgets_cost_centre_id on fin.budgets(cost_centre_id);
create index ix_budgets_account_id on fin.budgets(account_id);
create index ix_warranties_unit_id on svc.warranties(unit_id);
create index ix_warranties_account_id on svc.warranties(account_id);
create index ix_warranties_order_id on svc.warranties(order_id);
create index ix_warranties_dispatch_id on svc.warranties(dispatch_id);
create index ix_warranties_extension_approval_id on svc.warranties(extension_approval_id);
create index ix_warranties_x1 on svc.warranties(ends_on);
create index ix_service_tickets_unit_id on svc.service_tickets(unit_id);
create index ix_service_tickets_account_id on svc.service_tickets(account_id);
create index ix_service_tickets_assigned_to on svc.service_tickets(assigned_to);
create index ix_service_tickets_warranty_id on svc.service_tickets(warranty_id);
create index ix_service_tickets_goodwill_approval_id on svc.service_tickets(goodwill_approval_id);
create index ix_service_tickets_loaner_unit_id on svc.service_tickets(loaner_unit_id);
create index ix_service_tickets_invoice_id on svc.service_tickets(invoice_id);
create index ix_service_tickets_x1 on svc.service_tickets(status,sla_due_at);
create index ix_service_tickets_x2 on svc.service_tickets(unit_id);
create index ix_service_parts_ticket_id on svc.service_parts(ticket_id);
create index ix_service_parts_item_id on svc.service_parts(item_id);
create index ix_service_parts_component_serial_id on svc.service_parts(component_serial_id);
create index ix_service_parts_lot_id on svc.service_parts(lot_id);
create index ix_service_parts_replaced_component_id on svc.service_parts(replaced_component_id);
create index ix_service_events_ticket_id on svc.service_events(ticket_id);
create index ix_service_events_x1 on svc.service_events(ticket_id,created_at);
create index ix_items_search on catalog.items using gin(search);
create index ix_items_name_trgm on catalog.items using gin(name gin_trgm_ops);
create index ix_suppliers_name_trgm on proc.suppliers using gin(name gin_trgm_ops);
create index ix_ledger_brin on inv.stock_ledger using brin(posted_at);

-- ===== 4b. Search function =====
create or replace function catalog.items_search_update() returns trigger language plpgsql as $$
begin
  new.search := to_tsvector('simple', unaccent(coalesce(new.sku,'') || ' ' || coalesce(new.name,'') || ' ' || coalesce(new.specs::text,'')));
  return new;
end $$;


-- ===== 5. Triggers =====
create trigger trg_profiles_touch before update on core.profiles for each row execute function core.touch_updated();
create trigger trg_profiles_audit after insert or update or delete on core.profiles for each row execute function core.audit_trigger();
create trigger trg_roles_touch before update on core.roles for each row execute function core.touch_updated();
create trigger trg_roles_audit after insert or update or delete on core.roles for each row execute function core.audit_trigger();
create trigger trg_user_roles_audit after insert or update or delete on core.user_roles for each row execute function core.audit_trigger();
create trigger trg_locations_touch before update on core.locations for each row execute function core.touch_updated();
create trigger trg_cost_centres_touch before update on core.cost_centres for each row execute function core.touch_updated();
create trigger trg_customer_accounts_touch before update on core.customer_accounts for each row execute function core.touch_updated();
create trigger trg_customer_accounts_docno before insert on core.customer_accounts for each row execute function core.set_doc_no('account_no', 'ACC');
create trigger trg_exchange_rates_touch before update on core.exchange_rates for each row execute function core.touch_updated();
create trigger trg_exchange_rates_audit after insert or update or delete on core.exchange_rates for each row execute function core.audit_trigger();
create trigger trg_tax_rates_touch before update on core.tax_rates for each row execute function core.touch_updated();
create trigger trg_tax_rates_audit after insert or update or delete on core.tax_rates for each row execute function core.audit_trigger();
create trigger trg_settings_audit after insert or update or delete on core.settings for each row execute function core.audit_trigger();
create trigger trg_approval_rules_touch before update on core.approval_rules for each row execute function core.touch_updated();
create trigger trg_approval_rules_audit after insert or update or delete on core.approval_rules for each row execute function core.audit_trigger();
create trigger trg_approvals_touch before update on core.approvals for each row execute function core.touch_updated();
create trigger trg_approvals_audit after insert or update or delete on core.approvals for each row execute function core.audit_trigger();
create trigger trg_attachments_touch before update on core.attachments for each row execute function core.touch_updated();
create trigger trg_audit_log_append_only before update or delete on core.audit_log for each row execute function core.reject_mutation();
create trigger trg_notifications_touch before update on core.notifications for each row execute function core.touch_updated();
create trigger trg_api_clients_touch before update on core.api_clients for each row execute function core.touch_updated();
create trigger trg_api_clients_audit after insert or update or delete on core.api_clients for each row execute function core.audit_trigger();
create trigger trg_import_batches_touch before update on core.import_batches for each row execute function core.touch_updated();
create trigger trg_brands_touch before update on catalog.brands for each row execute function core.touch_updated();
create trigger trg_categories_touch before update on catalog.categories for each row execute function core.touch_updated();
create trigger trg_item_families_touch before update on catalog.item_families for each row execute function core.touch_updated();
create trigger trg_items_touch before update on catalog.items for each row execute function core.touch_updated();
create trigger trg_items_audit after insert or update or delete on catalog.items for each row execute function core.audit_trigger();
create trigger trg_boms_touch before update on catalog.boms for each row execute function core.touch_updated();
create trigger trg_boms_audit after insert or update or delete on catalog.boms for each row execute function core.audit_trigger();
create trigger trg_bom_lines_touch before update on catalog.bom_lines for each row execute function core.touch_updated();
create trigger trg_price_lists_touch before update on catalog.price_lists for each row execute function core.touch_updated();
create trigger trg_price_list_items_touch before update on catalog.price_list_items for each row execute function core.touch_updated();
create trigger trg_customs_tariffs_touch before update on catalog.customs_tariffs for each row execute function core.touch_updated();
create trigger trg_suppliers_touch before update on proc.suppliers for each row execute function core.touch_updated();
create trigger trg_suppliers_docno before insert on proc.suppliers for each row execute function core.set_doc_no('supplier_no', 'SUP');
create trigger trg_suppliers_audit after insert or update or delete on proc.suppliers for each row execute function core.audit_trigger();
create trigger trg_supplier_bank_changes_touch before update on proc.supplier_bank_changes for each row execute function core.touch_updated();
create trigger trg_supplier_bank_changes_audit after insert or update or delete on proc.supplier_bank_changes for each row execute function core.audit_trigger();
create trigger trg_logistics_partners_touch before update on proc.logistics_partners for each row execute function core.touch_updated();
create trigger trg_supplier_warranty_terms_touch before update on proc.supplier_warranty_terms for each row execute function core.touch_updated();
create trigger trg_requisitions_touch before update on proc.requisitions for each row execute function core.touch_updated();
create trigger trg_requisitions_docno before insert on proc.requisitions for each row execute function core.set_doc_no('req_no', 'REQ');
create trigger trg_requisition_lines_touch before update on proc.requisition_lines for each row execute function core.touch_updated();
create trigger trg_purchase_orders_touch before update on proc.purchase_orders for each row execute function core.touch_updated();
create trigger trg_purchase_orders_docno before insert on proc.purchase_orders for each row execute function core.set_doc_no('po_no', 'PO');
create trigger trg_purchase_orders_audit after insert or update or delete on proc.purchase_orders for each row execute function core.audit_trigger();
create trigger trg_purchase_order_lines_touch before update on proc.purchase_order_lines for each row execute function core.touch_updated();
create trigger trg_shipments_touch before update on proc.shipments for each row execute function core.touch_updated();
create trigger trg_shipments_docno before insert on proc.shipments for each row execute function core.set_doc_no('shipment_no', 'SHP');
create trigger trg_shipments_audit after insert or update or delete on proc.shipments for each row execute function core.audit_trigger();
create trigger trg_shipment_lines_touch before update on proc.shipment_lines for each row execute function core.touch_updated();
create trigger trg_shipment_events_append_only before update or delete on proc.shipment_events for each row execute function core.reject_mutation();
create trigger trg_customs_entries_touch before update on proc.customs_entries for each row execute function core.touch_updated();
create trigger trg_customs_entries_audit after insert or update or delete on proc.customs_entries for each row execute function core.audit_trigger();
create trigger trg_shipment_charges_touch before update on proc.shipment_charges for each row execute function core.touch_updated();
create trigger trg_shipment_charges_audit after insert or update or delete on proc.shipment_charges for each row execute function core.audit_trigger();
create trigger trg_goods_receipts_touch before update on proc.goods_receipts for each row execute function core.touch_updated();
create trigger trg_goods_receipts_docno before insert on proc.goods_receipts for each row execute function core.set_doc_no('grn_no', 'GRN');
create trigger trg_goods_receipts_audit after insert or update or delete on proc.goods_receipts for each row execute function core.audit_trigger();
create trigger trg_goods_receipt_lines_touch before update on proc.goods_receipt_lines for each row execute function core.touch_updated();
create trigger trg_landed_cost_runs_touch before update on proc.landed_cost_runs for each row execute function core.touch_updated();
create trigger trg_landed_cost_runs_docno before insert on proc.landed_cost_runs for each row execute function core.set_doc_no('run_no', 'LC');
create trigger trg_landed_cost_runs_audit after insert or update or delete on proc.landed_cost_runs for each row execute function core.audit_trigger();
create trigger trg_landed_cost_allocations_touch before update on proc.landed_cost_allocations for each row execute function core.touch_updated();
create trigger trg_supplier_invoices_touch before update on proc.supplier_invoices for each row execute function core.touch_updated();
create trigger trg_supplier_invoice_lines_touch before update on proc.supplier_invoice_lines for each row execute function core.touch_updated();
create trigger trg_supplier_rmas_touch before update on proc.supplier_rmas for each row execute function core.touch_updated();
create trigger trg_supplier_rmas_docno before insert on proc.supplier_rmas for each row execute function core.set_doc_no('rma_no', 'RMA');
create trigger trg_supplier_rmas_audit after insert or update or delete on proc.supplier_rmas for each row execute function core.audit_trigger();
create trigger trg_supplier_rma_lines_touch before update on proc.supplier_rma_lines for each row execute function core.touch_updated();
create trigger trg_lots_touch before update on inv.lots for each row execute function core.touch_updated();
create trigger trg_component_serials_touch before update on inv.component_serials for each row execute function core.touch_updated();
create trigger trg_stock_ledger_append_only before update or delete on inv.stock_ledger for each row execute function core.reject_mutation();
create trigger trg_stock_snapshots_append_only before update or delete on inv.stock_snapshots for each row execute function core.reject_mutation();
create trigger trg_item_cost_history_append_only before update or delete on inv.item_cost_history for each row execute function core.reject_mutation();
create trigger trg_reservations_touch before update on inv.reservations for each row execute function core.touch_updated();
create trigger trg_transfers_touch before update on inv.transfers for each row execute function core.touch_updated();
create trigger trg_transfers_docno before insert on inv.transfers for each row execute function core.set_doc_no('transfer_no', 'TRF');
create trigger trg_transfer_lines_touch before update on inv.transfer_lines for each row execute function core.touch_updated();
create trigger trg_adjustments_touch before update on inv.adjustments for each row execute function core.touch_updated();
create trigger trg_adjustments_docno before insert on inv.adjustments for each row execute function core.set_doc_no('adj_no', 'ADJ');
create trigger trg_adjustments_audit after insert or update or delete on inv.adjustments for each row execute function core.audit_trigger();
create trigger trg_adjustment_lines_touch before update on inv.adjustment_lines for each row execute function core.touch_updated();
create trigger trg_stock_counts_touch before update on inv.stock_counts for each row execute function core.touch_updated();
create trigger trg_stock_counts_docno before insert on inv.stock_counts for each row execute function core.set_doc_no('count_no', 'CNT');
create trigger trg_stock_count_lines_touch before update on inv.stock_count_lines for each row execute function core.touch_updated();
create trigger trg_ewaste_records_touch before update on inv.ewaste_records for each row execute function core.touch_updated();
create trigger trg_work_centers_touch before update on prod.work_centers for each row execute function core.touch_updated();
create trigger trg_routings_touch before update on prod.routings for each row execute function core.touch_updated();
create trigger trg_routing_steps_touch before update on prod.routing_steps for each row execute function core.touch_updated();
create trigger trg_assembly_orders_touch before update on prod.assembly_orders for each row execute function core.touch_updated();
create trigger trg_assembly_orders_docno before insert on prod.assembly_orders for each row execute function core.set_doc_no('ao_no', 'AO');
create trigger trg_assembly_order_materials_touch before update on prod.assembly_order_materials for each row execute function core.touch_updated();
create trigger trg_material_issues_touch before update on prod.material_issues for each row execute function core.touch_updated();
create trigger trg_material_issues_docno before insert on prod.material_issues for each row execute function core.set_doc_no('issue_no', 'MI');
create trigger trg_material_issue_lines_touch before update on prod.material_issue_lines for each row execute function core.touch_updated();
create trigger trg_units_touch before update on prod.units for each row execute function core.touch_updated();
create trigger trg_units_docno before insert on prod.units for each row execute function core.set_doc_no('internal_ref', 'B');
create trigger trg_units_audit after insert or update or delete on prod.units for each row execute function core.audit_trigger();
create trigger trg_unit_components_touch before update on prod.unit_components for each row execute function core.touch_updated();
create trigger trg_unit_steps_touch before update on prod.unit_steps for each row execute function core.touch_updated();
create trigger trg_test_runs_touch before update on prod.test_runs for each row execute function core.touch_updated();
create trigger trg_software_licences_touch before update on prod.software_licences for each row execute function core.touch_updated();
create trigger trg_imaging_records_touch before update on prod.imaging_records for each row execute function core.touch_updated();
create trigger trg_defect_codes_touch before update on prod.defect_codes for each row execute function core.touch_updated();
create trigger trg_qc_inspections_touch before update on prod.qc_inspections for each row execute function core.touch_updated();
create trigger trg_qc_inspections_docno before insert on prod.qc_inspections for each row execute function core.set_doc_no('inspection_no', 'QC');
create trigger trg_qc_inspections_audit after insert or update or delete on prod.qc_inspections for each row execute function core.audit_trigger();
create trigger trg_incoming_inspections_touch before update on prod.incoming_inspections for each row execute function core.touch_updated();
create trigger trg_qc_defects_touch before update on prod.qc_defects for each row execute function core.touch_updated();
create trigger trg_rework_orders_touch before update on prod.rework_orders for each row execute function core.touch_updated();
create trigger trg_rework_orders_docno before insert on prod.rework_orders for each row execute function core.set_doc_no('rework_no', 'RW');
create trigger trg_internal_orders_touch before update on sales.internal_orders for each row execute function core.touch_updated();
create trigger trg_internal_orders_docno before insert on sales.internal_orders for each row execute function core.set_doc_no('order_no', 'ORD');
create trigger trg_internal_orders_audit after insert or update or delete on sales.internal_orders for each row execute function core.audit_trigger();
create trigger trg_internal_order_lines_touch before update on sales.internal_order_lines for each row execute function core.touch_updated();
create trigger trg_dispatches_touch before update on sales.dispatches for each row execute function core.touch_updated();
create trigger trg_dispatches_docno before insert on sales.dispatches for each row execute function core.set_doc_no('dispatch_no', 'DSP');
create trigger trg_dispatches_audit after insert or update or delete on sales.dispatches for each row execute function core.audit_trigger();
create trigger trg_dispatch_lines_touch before update on sales.dispatch_lines for each row execute function core.touch_updated();
create trigger trg_sales_returns_touch before update on sales.sales_returns for each row execute function core.touch_updated();
create trigger trg_sales_returns_docno before insert on sales.sales_returns for each row execute function core.set_doc_no('return_no', 'RET');
create trigger trg_sales_return_lines_touch before update on sales.sales_return_lines for each row execute function core.touch_updated();
create trigger trg_fiscal_periods_touch before update on fin.fiscal_periods for each row execute function core.touch_updated();
create trigger trg_fiscal_periods_audit after insert or update or delete on fin.fiscal_periods for each row execute function core.audit_trigger();
create trigger trg_chart_of_accounts_touch before update on fin.chart_of_accounts for each row execute function core.touch_updated();
create trigger trg_journal_entries_touch before update on fin.journal_entries for each row execute function core.touch_updated();
create trigger trg_journal_entries_docno before insert on fin.journal_entries for each row execute function core.set_doc_no('entry_no', 'JE');
create trigger trg_journal_entries_audit after insert or update or delete on fin.journal_entries for each row execute function core.audit_trigger();
create trigger trg_journal_lines_touch before update on fin.journal_lines for each row execute function core.touch_updated();
create trigger trg_bank_accounts_touch before update on fin.bank_accounts for each row execute function core.touch_updated();
create trigger trg_invoices_touch before update on fin.invoices for each row execute function core.touch_updated();
create trigger trg_invoices_docno before insert on fin.invoices for each row execute function core.set_doc_no('invoice_no', 'INV');
create trigger trg_invoices_audit after insert or update or delete on fin.invoices for each row execute function core.audit_trigger();
create trigger trg_invoice_lines_touch before update on fin.invoice_lines for each row execute function core.touch_updated();
create trigger trg_payments_touch before update on fin.payments for each row execute function core.touch_updated();
create trigger trg_payments_docno before insert on fin.payments for each row execute function core.set_doc_no('payment_no', 'PAY');
create trigger trg_payments_audit after insert or update or delete on fin.payments for each row execute function core.audit_trigger();
create trigger trg_payment_allocations_touch before update on fin.payment_allocations for each row execute function core.touch_updated();
create trigger trg_expense_categories_touch before update on fin.expense_categories for each row execute function core.touch_updated();
create trigger trg_expenses_touch before update on fin.expenses for each row execute function core.touch_updated();
create trigger trg_expenses_docno before insert on fin.expenses for each row execute function core.set_doc_no('expense_no', 'EXP');
create trigger trg_budgets_touch before update on fin.budgets for each row execute function core.touch_updated();
create trigger trg_warranties_touch before update on svc.warranties for each row execute function core.touch_updated();
create trigger trg_warranties_audit after insert or update or delete on svc.warranties for each row execute function core.audit_trigger();
create trigger trg_service_tickets_touch before update on svc.service_tickets for each row execute function core.touch_updated();
create trigger trg_service_tickets_docno before insert on svc.service_tickets for each row execute function core.set_doc_no('ticket_no', 'TKT');
create trigger trg_service_tickets_audit after insert or update or delete on svc.service_tickets for each row execute function core.audit_trigger();
create trigger trg_service_parts_touch before update on svc.service_parts for each row execute function core.touch_updated();
create trigger trg_service_events_append_only before update or delete on svc.service_events for each row execute function core.reject_mutation();
create trigger trg_cost_history_append_only before update or delete on inv.item_cost_history for each row execute function core.reject_mutation();
create trigger trg_catalog_items_search before insert or update on catalog.items for each row execute function catalog.items_search_update();

-- ===== 6. Domain functions and triggers =====
-- Custom access-token hook (Supabase Auth): puts roles, scopes and flags into the JWT.
create or replace function core.access_token_hook(event jsonb) returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_uid uuid := (event ->> 'user_id')::uuid; v_claims jsonb := event -> 'claims';
        v_scopes text[]; v_roles text[]; v_admin boolean; v_status text;
begin
  select p.is_admin, p.status into v_admin, v_status from core.profiles p where p.id = v_uid;
  select coalesce(array_agg(distinct s), '{}') into v_scopes from (
      select unnest(r.default_scopes) as s from core.user_roles ur join core.roles r on r.id = ur.role_id where ur.user_id = v_uid
      union select unnest(p.extra_scopes) from core.profiles p where p.id = v_uid) x
    where s <> all (select unnest(p2.revoked_scopes) from core.profiles p2 where p2.id = v_uid);
  select coalesce(array_agg(r.code), '{}') into v_roles from core.user_roles ur join core.roles r on r.id = ur.role_id where ur.user_id = v_uid;
  if coalesce(v_status, 'suspended') <> 'active' then v_scopes := '{}'; end if;
  v_claims := v_claims || jsonb_build_object('scopes', to_jsonb(v_scopes), 'roles', to_jsonb(v_roles),
                                              'is_admin', coalesce(v_admin, false), 'staff_status', coalesce(v_status, 'none'));
  return jsonb_set(event, '{claims}', v_claims);
end $$;
grant usage on schema core to supabase_auth_admin;
grant execute on function core.access_token_hook to supabase_auth_admin;
revoke execute on function core.access_token_hook from authenticated, anon, public;
grant select on core.profiles, core.user_roles, core.roles to supabase_auth_admin;

-- Closed fiscal periods are read-only.
create or replace function fin.assert_period_open() returns trigger language plpgsql as $$
declare p fin.fiscal_periods%rowtype;
begin
  select * into p from fin.fiscal_periods where id = new.period_id;
  if p.status = 'closed' then raise exception 'PERIOD_CLOSED' using errcode = 'P0001'; end if;
  if new.entry_date < p.starts_on or new.entry_date > p.ends_on then raise exception 'DATE_OUTSIDE_PERIOD' using errcode = 'P0001'; end if;
  return new;
end $$;
create trigger trg_journal_entries_period before insert on fin.journal_entries for each row execute function fin.assert_period_open();

-- Every journal entry must balance (checked at commit).
create or replace function fin.assert_entry_balanced() returns trigger language plpgsql as $$
declare d bigint; c bigint;
begin
  select coalesce(sum(debit_minor), 0), coalesce(sum(credit_minor), 0) into d, c from fin.journal_lines where entry_id = new.entry_id;
  if d <> c then raise exception 'ENTRY_UNBALANCED: debit % credit %', d, c using errcode = 'P0001'; end if;
  return null;
end $$;
create constraint trigger trg_journal_balanced after insert on fin.journal_lines deferrable initially deferred for each row execute function fin.assert_entry_balanced();

-- The inspector of a unit cannot be the person who built it or performed any of its steps.
create or replace function prod.assert_inspector_independent() returns trigger language plpgsql as $$
begin
  if exists (select 1 from prod.units u where u.id = new.unit_id and u.built_by = new.inspector_id)
     or exists (select 1 from prod.unit_steps s where s.unit_id = new.unit_id and s.technician_id = new.inspector_id) then
    raise exception 'INSPECTOR_BUILT_UNIT' using errcode = 'P0001';
  end if;
  return new;
end $$;
create trigger trg_qc_inspections_independent before insert on prod.qc_inspections for each row execute function prod.assert_inspector_independent();

-- Requesters cannot decide their own approvals (also a CHECK on core.approvals).
-- Landed cost: allocate every non-recoverable charge across accepted receipt lines (largest-remainder rounding).
create or replace function proc.run_landed_cost(p_shipment uuid) returns uuid language plpgsql security definer set search_path = '' as $$
declare v_run uuid; ch record; v_total numeric; v_rem bigint;
begin
  insert into proc.landed_cost_runs(shipment_id, status) values (p_shipment, 'draft') returning id into v_run;
  create temporary table _lc on commit drop as
    select l.id as grn_line_id, coalesce(l.goods_value_base_minor, 0)::numeric as val,
           coalesce(sl.weight_kg, 0) * l.qty_accepted / nullif(l.qty_received, 0) as wt,
           coalesce(sl.volume_cbm, 0) * l.qty_accepted / nullif(l.qty_received, 0) as vol,
           l.qty_accepted as q
    from proc.goods_receipt_lines l
    join proc.goods_receipts g on g.id = l.grn_id
    left join proc.shipment_lines sl on sl.id = l.shipment_line_id
    where g.shipment_id = p_shipment and g.status = 'posted' and l.qty_accepted > 0;
  if not exists (select 1 from _lc) then raise exception 'NO_ACCEPTED_LINES' using errcode = 'P0001'; end if;
  for ch in select * from proc.shipment_charges where shipment_id = p_shipment and not is_recoverable and allocation_basis <> 'manual' loop
    select sum(case ch.allocation_basis when 'value' then val when 'weight' then wt when 'volume' then vol else q end) into v_total from _lc;
    if coalesce(v_total, 0) = 0 then raise exception 'NO_BASIS_FOR_CHARGE %', ch.id using errcode = 'P0001'; end if;
    insert into proc.landed_cost_allocations(run_id, grn_line_id, charge_id, basis, basis_value, share_pct, amount_minor)
    select v_run, x.grn_line_id, ch.id, ch.allocation_basis, x.b, x.b / v_total * 100, floor(ch.amount_base_minor * x.b / v_total)::bigint
    from (select grn_line_id, case ch.allocation_basis when 'value' then val when 'weight' then wt when 'volume' then vol else q end as b from _lc) x;
    select ch.amount_base_minor - sum(a.amount_minor) into v_rem from proc.landed_cost_allocations a where a.run_id = v_run and a.charge_id = ch.id;
    update proc.landed_cost_allocations set amount_minor = amount_minor + 1
     where id in (select a.id from proc.landed_cost_allocations a where a.run_id = v_run and a.charge_id = ch.id
                  order by (ch.amount_base_minor * a.basis_value / v_total) - floor(ch.amount_base_minor * a.basis_value / v_total) desc, a.id
                  limit v_rem);
  end loop;
  return v_run;
end $$;

-- Posting updates unit landed cost, lot cost and the cost history (append-only) and queues GL postings.
create or replace function proc.post_landed_cost(p_run uuid, p_user uuid) returns void language plpgsql security definer set search_path = '' as $$
declare r record;
begin
  if not exists (select 1 from proc.landed_cost_runs where id = p_run and status = 'draft') then raise exception 'RUN_NOT_DRAFT' using errcode = 'P0001'; end if;
  for r in select a.grn_line_id, sum(a.amount_minor) as added, l.item_id, l.qty_accepted, coalesce(l.goods_value_base_minor, 0) as goods
           from proc.landed_cost_allocations a join proc.goods_receipt_lines l on l.id = a.grn_line_id
           where a.run_id = p_run group by a.grn_line_id, l.item_id, l.qty_accepted, l.goods_value_base_minor loop
    update proc.goods_receipt_lines set landed_unit_cost_minor = round((r.goods + r.added)::numeric / nullif(r.qty_accepted, 0)) where id = r.grn_line_id;
    update inv.lots set unit_landed_cost_minor = round((r.goods + r.added)::numeric / nullif(r.qty_accepted, 0)) where grn_line_id = r.grn_line_id;
    -- Simplified average update; a nightly costing job re-derives averages from the ledger as a control.
    insert into inv.item_cost_history(item_id, effective_at, avg_cost_minor, qty_after, trigger_type, trigger_id)
    select r.item_id, now(), round((h.avg_cost_minor * h.qty_after + r.added) / nullif(h.qty_after, 0)), h.qty_after, 'landed_cost', p_run
    from inv.item_cost_history h where h.item_id = r.item_id order by h.effective_at desc limit 1;
  end loop;
  update proc.landed_cost_runs set status = 'posted', posted_by = p_user, posted_at = now(),
         total_allocated_minor = (select coalesce(sum(amount_minor), 0) from proc.landed_cost_allocations where run_id = p_run) where id = p_run;
  insert into core.outbox_events(topic, payload) values ('landed_cost.posted', jsonb_build_object('run_id', p_run));
end $$;

-- Finish a unit: checks tests and QC, assigns the final serial, snapshots cost, receives into finished goods.
create or replace function prod.finalise_unit(p_unit uuid, p_inspection uuid, p_user uuid) returns text language plpgsql security definer set search_path = '' as $$
declare u prod.units%rowtype; insp prod.qc_inspections%rowtype; v_serial text; v_mat bigint; v_lab bigint; v_loc uuid;
begin
  select * into u from prod.units where id = p_unit for update;
  if u.status <> 'qc_hold' then raise exception 'UNIT_NOT_IN_QC_HOLD' using errcode = 'P0001'; end if;
  select * into insp from prod.qc_inspections where id = p_inspection and unit_id = p_unit;
  if not found or insp.result <> 'pass' then raise exception 'QC_NOT_PASSED' using errcode = 'P0001'; end if;
  if exists (select 1 from unnest(array['post', 'burn_in']) rt(tt)
             where not exists (select 1 from prod.test_runs t where t.unit_id = p_unit and t.test_type = rt.tt and t.result = 'pass')) then
    raise exception 'TESTS_INCOMPLETE' using errcode = 'P0001';
  end if;
  select coalesce(sum(round(uc.qty * uc.unit_cost_minor)), 0) into v_mat from prod.unit_components uc where uc.unit_id = p_unit and uc.removed_at is null;
  select coalesce(round(u.labour_minutes_total * (select (s.value ->> 'labour_rate_per_minute_minor')::numeric from core.settings s where s.key = 'costing')), 0) into v_lab;
  v_serial := core.next_doc_no('UPSA-LAP');
  select id into v_loc from core.locations where kind = 'warehouse' and active order by code limit 1;
  update prod.units set serial_no = v_serial, status = 'in_stock', location_id = v_loc, qc_passed_at = now(),
         cost_materials_minor = v_mat, cost_labour_minor = v_lab, cost_total_minor = v_mat + v_lab where id = p_unit;
  insert into inv.stock_ledger(item_id, location_id, unit_id, movement_type, qty, unit_cost_minor, ref_type, ref_id, created_by)
  values (u.item_id, v_loc, p_unit, 'assembly_output', 1, v_mat + v_lab, 'unit', p_unit, p_user);
  insert into core.outbox_events(topic, payload) values ('unit.finalised', jsonb_build_object('unit_id', p_unit, 'serial', v_serial));
  return v_serial;
end $$;

-- Genealogy: forward (unit to parts) and reverse (lot to units).
create or replace function prod.unit_genealogy(p_serial text)
returns table (component_sku text, component_serial text, lot_no text, supplier text, shipment_no text, unit_cost_minor bigint, installed_at timestamptz, removed_at timestamptz)
language sql stable as $$
  select i.sku, cs.serial_no, lo.lot_no, s.name, sh.shipment_no, uc.unit_cost_minor, uc.installed_at, uc.removed_at
  from prod.units u
  join prod.unit_components uc on uc.unit_id = u.id
  join catalog.items i on i.id = uc.item_id
  left join inv.component_serials cs on cs.id = uc.component_serial_id
  left join inv.lots lo on lo.id = uc.lot_id
  left join proc.suppliers s on s.id = lo.supplier_id
  left join proc.goods_receipt_lines gl on gl.id = lo.grn_line_id
  left join proc.goods_receipts gr on gr.id = gl.grn_id
  left join proc.shipments sh on sh.id = gr.shipment_id
  where u.serial_no = p_serial order by uc.installed_at $$;

create or replace function inv.units_by_lot(p_lot uuid) returns table (internal_ref text, serial_no text, status text)
language sql stable as $$
  select distinct u.internal_ref, u.serial_no, u.status from prod.unit_components uc join prod.units u on u.id = uc.unit_id where uc.lot_id = p_lot $$;

-- ===== 7. Views (security invoker so RLS applies) =====
create view inv.v_stock_on_hand with (security_invoker = true) as
select item_id, location_id, sum(qty) as qty from (
  select s.item_id, s.location_id, s.qty from inv.stock_snapshots s where s.period_end = (select max(period_end) from inv.stock_snapshots)
  union all
  select l.item_id, l.location_id, l.qty from inv.stock_ledger l
   where l.posted_at > coalesce((select (max(period_end) + 1)::timestamptz from inv.stock_snapshots), '-infinity'::timestamptz)
) x group by item_id, location_id;

create view inv.v_stock_available with (security_invoker = true) as
select o.item_id, o.location_id, o.qty as on_hand,
       coalesce((select sum(r.qty) from inv.reservations r where r.item_id = o.item_id and r.location_id is not distinct from o.location_id and r.status = 'active'), 0) as reserved,
       o.qty - coalesce((select sum(r.qty) from inv.reservations r where r.item_id = o.item_id and r.location_id is not distinct from o.location_id and r.status = 'active'), 0) as qty
from inv.v_stock_on_hand o;

create view prod.v_buildable with (security_invoker = true) as
select b.item_id, min(floor(coalesce(a.qty, 0) / (l.qty * (1 + l.scrap_pct / 100)))) as buildable_qty
from catalog.boms b
join catalog.bom_lines l on l.bom_id = b.id and not l.is_optional
left join (select v.item_id, sum(v.qty) as qty from inv.v_stock_available v
           join core.locations loc on loc.id = v.location_id and loc.kind = 'warehouse' group by v.item_id) a on a.item_id = l.component_item_id
where b.status = 'active' group by b.item_id;

create view proc.v_po_line_status with (security_invoker = true) as
select pl.id as po_line_id, pl.po_id, pl.item_id, pl.qty as qty_ordered, coalesce(sum(x.qty_accepted), 0) as qty_received
from proc.purchase_order_lines pl
left join (select gl.po_line_id, gl.qty_accepted from proc.goods_receipt_lines gl join proc.goods_receipts g on g.id = gl.grn_id and g.status = 'posted') x on x.po_line_id = pl.id
group by pl.id;

create view fin.v_ar_open with (security_invoker = true) as
select i.id as invoice_id, i.invoice_no, i.account_id, i.total_minor, coalesce(sum(pa.amount_minor), 0) as paid_minor,
       i.total_minor - coalesce(sum(pa.amount_minor), 0) as balance_minor, i.due_date, greatest(current_date - i.due_date, 0) as days_overdue
from fin.invoices i left join fin.payment_allocations pa on pa.invoice_id = i.id
where i.kind <> 'proforma' and i.status in ('issued', 'part_paid') group by i.id;

create view fin.v_budget_vs_actual with (security_invoker = true) as
select b.fiscal_year, b.cost_centre_id, b.account_id, b.amount_minor as budget_minor, coalesce(sum(jl.debit_minor - jl.credit_minor), 0) as actual_minor
from fin.budgets b
left join (fin.journal_lines jl join fin.journal_entries je on je.id = jl.entry_id)
  on jl.cost_centre_id = b.cost_centre_id and (b.account_id is null or jl.account_id = b.account_id) and extract(year from je.entry_date) = b.fiscal_year
group by b.fiscal_year, b.cost_centre_id, b.account_id, b.amount_minor;

create view prod.v_unit_cost with (security_invoker = true) as
select u.id as unit_id, u.serial_no, u.item_id,
       coalesce(sum(round(uc.qty * uc.unit_cost_minor)) filter (where uc.removed_at is null), 0) as live_components_minor, u.cost_total_minor
from prod.units u left join prod.unit_components uc on uc.unit_id = u.id group by u.id;

-- ===== 8. Partitions (call monthly with pg_cron) =====
do $$ declare m int; begin
  for m in 0..12 loop
    perform core.ensure_month_partition('core.audit_log'::regclass, (date_trunc('month', now()) + make_interval(months => m))::date);
    perform core.ensure_month_partition('inv.stock_ledger'::regclass, (date_trunc('month', now()) + make_interval(months => m))::date);
  end loop; end $$;
-- select cron.schedule('uap-partitions', '0 2 25 * *', $$select core.ensure_month_partition('core.audit_log'::regclass, (now() + interval '2 months')::date), core.ensure_month_partition('inv.stock_ledger'::regclass, (now() + interval '2 months')::date)$$);

-- ===== 9. Row-level security =====
-- Browser clients only ever read (and only through RLS). All writes go through the API (service role) and the functions above.
revoke all on all tables in schema core from anon, authenticated;
revoke all on all tables in schema catalog from anon, authenticated;
revoke all on all tables in schema proc from anon, authenticated;
revoke all on all tables in schema inv from anon, authenticated;
revoke all on all tables in schema prod from anon, authenticated;
revoke all on all tables in schema sales from anon, authenticated;
revoke all on all tables in schema fin from anon, authenticated;
revoke all on all tables in schema svc from anon, authenticated;
grant usage on schema core to authenticated;
grant usage on schema catalog to authenticated;
grant usage on schema proc to authenticated;
grant usage on schema inv to authenticated;
grant usage on schema prod to authenticated;
grant usage on schema sales to authenticated;
grant usage on schema fin to authenticated;
grant usage on schema svc to authenticated;
alter table core.profiles enable row level security;
create policy pol_read_profiles on core.profiles for select to authenticated using (id = auth.uid() or core.has_any_scope(array['users.manage','audit.read']));
grant select on core.profiles to authenticated;
alter table core.roles enable row level security;
create policy pol_read_roles on core.roles for select to authenticated using (core.is_staff());
grant select on core.roles to authenticated;
alter table core.user_roles enable row level security;
create policy pol_read_user_roles on core.user_roles for select to authenticated using (user_id = auth.uid() or core.has_scope('users.manage'));
grant select on core.user_roles to authenticated;
alter table core.locations enable row level security;
create policy pol_read_locations on core.locations for select to authenticated using (core.is_staff());
grant select on core.locations to authenticated;
alter table core.cost_centres enable row level security;
create policy pol_read_cost_centres on core.cost_centres for select to authenticated using (core.is_staff());
grant select on core.cost_centres to authenticated;
alter table core.customer_accounts enable row level security;
create policy pol_read_customer_accounts on core.customer_accounts for select to authenticated using (core.has_any_scope(array['orders.read','orders.write','invoices.write','dispatch.write','service.write','gl.read']));
grant select on core.customer_accounts to authenticated;
alter table core.currencies enable row level security;
create policy pol_read_currencies on core.currencies for select to authenticated using (core.is_staff());
grant select on core.currencies to authenticated;
alter table core.exchange_rates enable row level security;
create policy pol_read_exchange_rates on core.exchange_rates for select to authenticated using (core.is_staff());
grant select on core.exchange_rates to authenticated;
alter table core.tax_rates enable row level security;
create policy pol_read_tax_rates on core.tax_rates for select to authenticated using (core.is_staff());
grant select on core.tax_rates to authenticated;
alter table core.settings enable row level security;
create policy pol_read_settings on core.settings for select to authenticated using (core.is_staff());
grant select on core.settings to authenticated;
alter table core.doc_sequences enable row level security;
alter table core.approval_rules enable row level security;
create policy pol_read_approval_rules on core.approval_rules for select to authenticated using (core.is_staff());
grant select on core.approval_rules to authenticated;
alter table core.approvals enable row level security;
create policy pol_read_approvals on core.approvals for select to authenticated using (requested_by = auth.uid() or escalated_to = auth.uid() or core.has_any_scope(array['procurement.approve','orders.approve','payments.approve','expenses.approve','inventory.adjust.approve','service.approve','returns.approve','bom.approve','supplier.bank.approve','gl.close_period','users.manage']));
grant select on core.approvals to authenticated;
alter table core.attachments enable row level security;
create policy pol_read_attachments on core.attachments for select to authenticated using (core.is_staff());
grant select on core.attachments to authenticated;
alter table core.audit_log enable row level security;
create policy pol_read_audit_log on core.audit_log for select to authenticated using (core.has_scope('audit.read'));
grant select on core.audit_log to authenticated;
alter table core.outbox_events enable row level security;
alter table core.notifications enable row level security;
create policy pol_read_notifications on core.notifications for select to authenticated using (user_id = auth.uid());
grant select on core.notifications to authenticated;
alter table core.idempotency_keys enable row level security;
alter table core.api_clients enable row level security;
alter table core.import_batches enable row level security;
create policy pol_read_import_batches on core.import_batches for select to authenticated using (core.has_scope('data.import'));
grant select on core.import_batches to authenticated;
alter table catalog.brands enable row level security;
create policy pol_read_brands on catalog.brands for select to authenticated using (core.is_staff());
grant select on catalog.brands to authenticated;
alter table catalog.categories enable row level security;
create policy pol_read_categories on catalog.categories for select to authenticated using (core.is_staff());
grant select on catalog.categories to authenticated;
alter table catalog.item_families enable row level security;
create policy pol_read_item_families on catalog.item_families for select to authenticated using (core.is_staff());
grant select on catalog.item_families to authenticated;
alter table catalog.items enable row level security;
create policy pol_read_items on catalog.items for select to authenticated using (core.is_staff());
grant select on catalog.items to authenticated;
alter table catalog.boms enable row level security;
create policy pol_read_boms on catalog.boms for select to authenticated using (core.is_staff());
grant select on catalog.boms to authenticated;
alter table catalog.bom_lines enable row level security;
create policy pol_read_bom_lines on catalog.bom_lines for select to authenticated using (core.is_staff());
grant select on catalog.bom_lines to authenticated;
alter table catalog.item_suppliers enable row level security;
create policy pol_read_item_suppliers on catalog.item_suppliers for select to authenticated using (core.is_staff());
grant select on catalog.item_suppliers to authenticated;
alter table catalog.price_lists enable row level security;
create policy pol_read_price_lists on catalog.price_lists for select to authenticated using (core.is_staff());
grant select on catalog.price_lists to authenticated;
alter table catalog.price_list_items enable row level security;
create policy pol_read_price_list_items on catalog.price_list_items for select to authenticated using (core.is_staff());
grant select on catalog.price_list_items to authenticated;
alter table catalog.customs_tariffs enable row level security;
create policy pol_read_customs_tariffs on catalog.customs_tariffs for select to authenticated using (core.is_staff());
grant select on catalog.customs_tariffs to authenticated;
alter table proc.suppliers enable row level security;
create policy pol_read_suppliers on proc.suppliers for select to authenticated using (core.has_any_scope(array['procurement.write','procurement.approve','imports.write','suppliers.write','inventory.receive','landedcost.post','reports.read']));
grant select (id, created_at, updated_at, version, supplier_no, name, country, kind, tin, contact_name, email, phone, address, currency, payment_terms, lead_time_days, rating, status, notes) on proc.suppliers to authenticated;
alter table proc.supplier_bank_changes enable row level security;
create policy pol_read_supplier_bank_changes on proc.supplier_bank_changes for select to authenticated using (core.has_any_scope(array['procurement.write','procurement.approve','imports.write','suppliers.write','inventory.receive','landedcost.post','reports.read']));
grant select (id, created_at, updated_at, version, supplier_id, verified_by, verified_at, approval_id, status, applied_at) on proc.supplier_bank_changes to authenticated;
alter table proc.logistics_partners enable row level security;
create policy pol_read_logistics_partners on proc.logistics_partners for select to authenticated using (core.has_any_scope(array['procurement.write','procurement.approve','imports.write','suppliers.write','inventory.receive','landedcost.post','reports.read']));
grant select on proc.logistics_partners to authenticated;
alter table proc.supplier_warranty_terms enable row level security;
create policy pol_read_supplier_warranty_terms on proc.supplier_warranty_terms for select to authenticated using (core.has_any_scope(array['procurement.write','procurement.approve','imports.write','suppliers.write','inventory.receive','landedcost.post','reports.read']));
grant select on proc.supplier_warranty_terms to authenticated;
alter table proc.requisitions enable row level security;
create policy pol_read_requisitions on proc.requisitions for select to authenticated using (core.has_any_scope(array['procurement.write','procurement.approve','imports.write','suppliers.write','inventory.receive','landedcost.post','reports.read']));
grant select on proc.requisitions to authenticated;
alter table proc.requisition_lines enable row level security;
create policy pol_read_requisition_lines on proc.requisition_lines for select to authenticated using (core.has_any_scope(array['procurement.write','procurement.approve','imports.write','suppliers.write','inventory.receive','landedcost.post','reports.read']));
grant select on proc.requisition_lines to authenticated;
alter table proc.purchase_orders enable row level security;
create policy pol_read_purchase_orders on proc.purchase_orders for select to authenticated using (core.has_any_scope(array['procurement.write','procurement.approve','imports.write','suppliers.write','inventory.receive','landedcost.post','reports.read']));
grant select on proc.purchase_orders to authenticated;
alter table proc.purchase_order_lines enable row level security;
create policy pol_read_purchase_order_lines on proc.purchase_order_lines for select to authenticated using (core.has_any_scope(array['procurement.write','procurement.approve','imports.write','suppliers.write','inventory.receive','landedcost.post','reports.read']));
grant select on proc.purchase_order_lines to authenticated;
alter table proc.shipments enable row level security;
create policy pol_read_shipments on proc.shipments for select to authenticated using (core.has_any_scope(array['procurement.write','procurement.approve','imports.write','suppliers.write','inventory.receive','landedcost.post','reports.read']));
grant select on proc.shipments to authenticated;
alter table proc.shipment_lines enable row level security;
create policy pol_read_shipment_lines on proc.shipment_lines for select to authenticated using (core.has_any_scope(array['procurement.write','procurement.approve','imports.write','suppliers.write','inventory.receive','landedcost.post','reports.read']));
grant select on proc.shipment_lines to authenticated;
alter table proc.shipment_events enable row level security;
create policy pol_read_shipment_events on proc.shipment_events for select to authenticated using (core.has_any_scope(array['procurement.write','procurement.approve','imports.write','suppliers.write','inventory.receive','landedcost.post','reports.read']));
grant select on proc.shipment_events to authenticated;
alter table proc.customs_entries enable row level security;
create policy pol_read_customs_entries on proc.customs_entries for select to authenticated using (core.has_any_scope(array['procurement.write','procurement.approve','imports.write','suppliers.write','inventory.receive','landedcost.post','reports.read']));
grant select on proc.customs_entries to authenticated;
alter table proc.shipment_charges enable row level security;
create policy pol_read_shipment_charges on proc.shipment_charges for select to authenticated using (core.has_any_scope(array['procurement.write','procurement.approve','imports.write','suppliers.write','inventory.receive','landedcost.post','reports.read']));
grant select on proc.shipment_charges to authenticated;
alter table proc.goods_receipts enable row level security;
create policy pol_read_goods_receipts on proc.goods_receipts for select to authenticated using (core.has_any_scope(array['procurement.write','procurement.approve','imports.write','suppliers.write','inventory.receive','landedcost.post','reports.read']));
grant select on proc.goods_receipts to authenticated;
alter table proc.goods_receipt_lines enable row level security;
create policy pol_read_goods_receipt_lines on proc.goods_receipt_lines for select to authenticated using (core.has_any_scope(array['procurement.write','procurement.approve','imports.write','suppliers.write','inventory.receive','landedcost.post','reports.read']));
grant select on proc.goods_receipt_lines to authenticated;
alter table proc.landed_cost_runs enable row level security;
create policy pol_read_landed_cost_runs on proc.landed_cost_runs for select to authenticated using (core.has_any_scope(array['procurement.write','procurement.approve','imports.write','suppliers.write','inventory.receive','landedcost.post','reports.read']));
grant select on proc.landed_cost_runs to authenticated;
alter table proc.landed_cost_allocations enable row level security;
create policy pol_read_landed_cost_allocations on proc.landed_cost_allocations for select to authenticated using (core.has_any_scope(array['procurement.write','procurement.approve','imports.write','suppliers.write','inventory.receive','landedcost.post','reports.read']));
grant select on proc.landed_cost_allocations to authenticated;
alter table proc.supplier_invoices enable row level security;
create policy pol_read_supplier_invoices on proc.supplier_invoices for select to authenticated using (core.has_any_scope(array['procurement.write','procurement.approve','imports.write','suppliers.write','inventory.receive','landedcost.post','reports.read']));
grant select on proc.supplier_invoices to authenticated;
alter table proc.supplier_invoice_lines enable row level security;
create policy pol_read_supplier_invoice_lines on proc.supplier_invoice_lines for select to authenticated using (core.has_any_scope(array['procurement.write','procurement.approve','imports.write','suppliers.write','inventory.receive','landedcost.post','reports.read']));
grant select on proc.supplier_invoice_lines to authenticated;
alter table proc.supplier_rmas enable row level security;
create policy pol_read_supplier_rmas on proc.supplier_rmas for select to authenticated using (core.has_any_scope(array['procurement.write','procurement.approve','imports.write','suppliers.write','inventory.receive','landedcost.post','reports.read']));
grant select on proc.supplier_rmas to authenticated;
alter table proc.supplier_rma_lines enable row level security;
create policy pol_read_supplier_rma_lines on proc.supplier_rma_lines for select to authenticated using (core.has_any_scope(array['procurement.write','procurement.approve','imports.write','suppliers.write','inventory.receive','landedcost.post','reports.read']));
grant select on proc.supplier_rma_lines to authenticated;
alter table inv.lots enable row level security;
create policy pol_read_lots on inv.lots for select to authenticated using (core.has_any_scope(array['inventory.read']));
grant select on inv.lots to authenticated;
alter table inv.component_serials enable row level security;
create policy pol_read_component_serials on inv.component_serials for select to authenticated using (core.has_any_scope(array['inventory.read']));
grant select on inv.component_serials to authenticated;
alter table inv.stock_ledger enable row level security;
create policy pol_read_stock_ledger on inv.stock_ledger for select to authenticated using (core.has_any_scope(array['inventory.read']));
grant select on inv.stock_ledger to authenticated;
alter table inv.stock_snapshots enable row level security;
create policy pol_read_stock_snapshots on inv.stock_snapshots for select to authenticated using (core.has_any_scope(array['inventory.read']));
grant select on inv.stock_snapshots to authenticated;
alter table inv.item_cost_history enable row level security;
create policy pol_read_item_cost_history on inv.item_cost_history for select to authenticated using (core.has_any_scope(array['inventory.read']));
grant select on inv.item_cost_history to authenticated;
alter table inv.reservations enable row level security;
create policy pol_read_reservations on inv.reservations for select to authenticated using (core.has_any_scope(array['inventory.read']));
grant select on inv.reservations to authenticated;
alter table inv.transfers enable row level security;
create policy pol_read_transfers on inv.transfers for select to authenticated using (core.has_any_scope(array['inventory.read']));
grant select on inv.transfers to authenticated;
alter table inv.transfer_lines enable row level security;
create policy pol_read_transfer_lines on inv.transfer_lines for select to authenticated using (core.has_any_scope(array['inventory.read']));
grant select on inv.transfer_lines to authenticated;
alter table inv.adjustments enable row level security;
create policy pol_read_adjustments on inv.adjustments for select to authenticated using (core.has_any_scope(array['inventory.read']));
grant select on inv.adjustments to authenticated;
alter table inv.adjustment_lines enable row level security;
create policy pol_read_adjustment_lines on inv.adjustment_lines for select to authenticated using (core.has_any_scope(array['inventory.read']));
grant select on inv.adjustment_lines to authenticated;
alter table inv.stock_counts enable row level security;
create policy pol_read_stock_counts on inv.stock_counts for select to authenticated using (core.has_any_scope(array['inventory.read']));
grant select on inv.stock_counts to authenticated;
alter table inv.stock_count_lines enable row level security;
create policy pol_read_stock_count_lines on inv.stock_count_lines for select to authenticated using (core.has_any_scope(array['inventory.read']));
grant select on inv.stock_count_lines to authenticated;
alter table inv.reorder_policies enable row level security;
create policy pol_read_reorder_policies on inv.reorder_policies for select to authenticated using (core.has_any_scope(array['inventory.read']));
grant select on inv.reorder_policies to authenticated;
alter table inv.ewaste_records enable row level security;
create policy pol_read_ewaste_records on inv.ewaste_records for select to authenticated using (core.has_any_scope(array['inventory.read']));
grant select on inv.ewaste_records to authenticated;
alter table prod.work_centers enable row level security;
create policy pol_read_work_centers on prod.work_centers for select to authenticated using (core.has_any_scope(array['production.plan','production.work','qc.inspect','tests.record','reports.read','inventory.read']));
grant select on prod.work_centers to authenticated;
alter table prod.routings enable row level security;
create policy pol_read_routings on prod.routings for select to authenticated using (core.has_any_scope(array['production.plan','production.work','qc.inspect','tests.record','reports.read','inventory.read']));
grant select on prod.routings to authenticated;
alter table prod.routing_steps enable row level security;
create policy pol_read_routing_steps on prod.routing_steps for select to authenticated using (core.has_any_scope(array['production.plan','production.work','qc.inspect','tests.record','reports.read','inventory.read']));
grant select on prod.routing_steps to authenticated;
alter table prod.assembly_orders enable row level security;
create policy pol_read_assembly_orders on prod.assembly_orders for select to authenticated using (core.has_any_scope(array['production.plan','production.work','qc.inspect','tests.record','reports.read','inventory.read']));
grant select on prod.assembly_orders to authenticated;
alter table prod.assembly_order_materials enable row level security;
create policy pol_read_assembly_order_materials on prod.assembly_order_materials for select to authenticated using (core.has_any_scope(array['production.plan','production.work','qc.inspect','tests.record','reports.read','inventory.read']));
grant select on prod.assembly_order_materials to authenticated;
alter table prod.material_issues enable row level security;
create policy pol_read_material_issues on prod.material_issues for select to authenticated using (core.has_any_scope(array['production.plan','production.work','qc.inspect','tests.record','reports.read','inventory.read']));
grant select on prod.material_issues to authenticated;
alter table prod.material_issue_lines enable row level security;
create policy pol_read_material_issue_lines on prod.material_issue_lines for select to authenticated using (core.has_any_scope(array['production.plan','production.work','qc.inspect','tests.record','reports.read','inventory.read']));
grant select on prod.material_issue_lines to authenticated;
alter table prod.units enable row level security;
create policy pol_read_units on prod.units for select to authenticated using (core.has_any_scope(array['production.plan','production.work','qc.inspect','tests.record','reports.read','inventory.read']) or built_by = auth.uid());
grant select on prod.units to authenticated;
alter table prod.unit_components enable row level security;
create policy pol_read_unit_components on prod.unit_components for select to authenticated using (core.has_any_scope(array['production.plan','production.work','qc.inspect','tests.record','reports.read','inventory.read']));
grant select on prod.unit_components to authenticated;
alter table prod.unit_steps enable row level security;
create policy pol_read_unit_steps on prod.unit_steps for select to authenticated using (core.has_any_scope(array['production.plan','production.work','qc.inspect','tests.record','reports.read','inventory.read']) or technician_id = auth.uid());
grant select on prod.unit_steps to authenticated;
alter table prod.test_runs enable row level security;
create policy pol_read_test_runs on prod.test_runs for select to authenticated using (core.has_any_scope(array['production.plan','production.work','qc.inspect','tests.record','reports.read','inventory.read']));
grant select on prod.test_runs to authenticated;
alter table prod.software_licences enable row level security;
create policy pol_read_software_licences on prod.software_licences for select to authenticated using (core.has_any_scope(array['production.plan','production.work','qc.inspect','tests.record','reports.read','inventory.read']));
grant select (id, created_at, updated_at, version, licence_type, product_name, key_hint, status, assigned_unit_id, assigned_by, assigned_at, source_grn_line_id) on prod.software_licences to authenticated;
alter table prod.imaging_records enable row level security;
create policy pol_read_imaging_records on prod.imaging_records for select to authenticated using (core.has_any_scope(array['production.plan','production.work','qc.inspect','tests.record','reports.read','inventory.read']));
grant select on prod.imaging_records to authenticated;
alter table prod.defect_codes enable row level security;
create policy pol_read_defect_codes on prod.defect_codes for select to authenticated using (core.has_any_scope(array['production.plan','production.work','qc.inspect','tests.record','reports.read','inventory.read']));
grant select on prod.defect_codes to authenticated;
alter table prod.qc_inspections enable row level security;
create policy pol_read_qc_inspections on prod.qc_inspections for select to authenticated using (core.has_any_scope(array['production.plan','production.work','qc.inspect','tests.record','reports.read','inventory.read']));
grant select on prod.qc_inspections to authenticated;
alter table prod.incoming_inspections enable row level security;
create policy pol_read_incoming_inspections on prod.incoming_inspections for select to authenticated using (core.has_any_scope(array['production.plan','production.work','qc.inspect','tests.record','reports.read','inventory.read']));
grant select on prod.incoming_inspections to authenticated;
alter table prod.qc_defects enable row level security;
create policy pol_read_qc_defects on prod.qc_defects for select to authenticated using (core.has_any_scope(array['production.plan','production.work','qc.inspect','tests.record','reports.read','inventory.read']));
grant select on prod.qc_defects to authenticated;
alter table prod.rework_orders enable row level security;
create policy pol_read_rework_orders on prod.rework_orders for select to authenticated using (core.has_any_scope(array['production.plan','production.work','qc.inspect','tests.record','reports.read','inventory.read']));
grant select on prod.rework_orders to authenticated;
alter table sales.internal_orders enable row level security;
create policy pol_read_internal_orders on sales.internal_orders for select to authenticated using (core.has_any_scope(array['orders.read','orders.write','dispatch.write']));
grant select on sales.internal_orders to authenticated;
alter table sales.internal_order_lines enable row level security;
create policy pol_read_internal_order_lines on sales.internal_order_lines for select to authenticated using (core.has_any_scope(array['orders.read','orders.write','dispatch.write']));
grant select on sales.internal_order_lines to authenticated;
alter table sales.order_line_units enable row level security;
create policy pol_read_order_line_units on sales.order_line_units for select to authenticated using (core.has_any_scope(array['orders.read','orders.write','dispatch.write']));
grant select on sales.order_line_units to authenticated;
alter table sales.dispatches enable row level security;
create policy pol_read_dispatches on sales.dispatches for select to authenticated using (core.has_any_scope(array['orders.read','orders.write','dispatch.write']));
grant select on sales.dispatches to authenticated;
alter table sales.dispatch_lines enable row level security;
create policy pol_read_dispatch_lines on sales.dispatch_lines for select to authenticated using (core.has_any_scope(array['orders.read','orders.write','dispatch.write']));
grant select on sales.dispatch_lines to authenticated;
alter table sales.sales_returns enable row level security;
create policy pol_read_sales_returns on sales.sales_returns for select to authenticated using (core.has_any_scope(array['orders.read','orders.write','dispatch.write']));
grant select on sales.sales_returns to authenticated;
alter table sales.sales_return_lines enable row level security;
create policy pol_read_sales_return_lines on sales.sales_return_lines for select to authenticated using (core.has_any_scope(array['orders.read','orders.write','dispatch.write']));
grant select on sales.sales_return_lines to authenticated;
alter table fin.fiscal_periods enable row level security;
create policy pol_read_fiscal_periods on fin.fiscal_periods for select to authenticated using (core.has_any_scope(array['gl.read','invoices.write','payments.write','expenses.approve']));
grant select on fin.fiscal_periods to authenticated;
alter table fin.chart_of_accounts enable row level security;
create policy pol_read_chart_of_accounts on fin.chart_of_accounts for select to authenticated using (core.has_any_scope(array['gl.read','invoices.write','payments.write','expenses.approve']));
grant select on fin.chart_of_accounts to authenticated;
alter table fin.journal_entries enable row level security;
create policy pol_read_journal_entries on fin.journal_entries for select to authenticated using (core.has_any_scope(array['gl.read','invoices.write','payments.write','expenses.approve']));
grant select on fin.journal_entries to authenticated;
alter table fin.journal_lines enable row level security;
create policy pol_read_journal_lines on fin.journal_lines for select to authenticated using (core.has_any_scope(array['gl.read','invoices.write','payments.write','expenses.approve']));
grant select on fin.journal_lines to authenticated;
alter table fin.bank_accounts enable row level security;
create policy pol_read_bank_accounts on fin.bank_accounts for select to authenticated using (core.has_any_scope(array['gl.read','invoices.write','payments.write','expenses.approve']));
grant select (id, created_at, updated_at, version, name, bank_name, account_last4, currency, gl_account_id, active) on fin.bank_accounts to authenticated;
alter table fin.invoices enable row level security;
create policy pol_read_invoices on fin.invoices for select to authenticated using (core.has_any_scope(array['gl.read','invoices.write','payments.write','expenses.approve']));
grant select on fin.invoices to authenticated;
alter table fin.invoice_lines enable row level security;
create policy pol_read_invoice_lines on fin.invoice_lines for select to authenticated using (core.has_any_scope(array['gl.read','invoices.write','payments.write','expenses.approve']));
grant select on fin.invoice_lines to authenticated;
alter table fin.payments enable row level security;
create policy pol_read_payments on fin.payments for select to authenticated using (core.has_any_scope(array['gl.read','invoices.write','payments.write','expenses.approve']));
grant select on fin.payments to authenticated;
alter table fin.payment_allocations enable row level security;
create policy pol_read_payment_allocations on fin.payment_allocations for select to authenticated using (core.has_any_scope(array['gl.read','invoices.write','payments.write','expenses.approve']));
grant select on fin.payment_allocations to authenticated;
alter table fin.expense_categories enable row level security;
create policy pol_read_expense_categories on fin.expense_categories for select to authenticated using (core.has_any_scope(array['gl.read','invoices.write','payments.write','expenses.approve']));
grant select on fin.expense_categories to authenticated;
alter table fin.expenses enable row level security;
create policy pol_read_expenses on fin.expenses for select to authenticated using (core.has_any_scope(array['gl.read','invoices.write','payments.write','expenses.approve']) or true = false);
grant select on fin.expenses to authenticated;
alter table fin.budgets enable row level security;
create policy pol_read_budgets on fin.budgets for select to authenticated using (core.has_any_scope(array['gl.read','invoices.write','payments.write','expenses.approve']));
grant select on fin.budgets to authenticated;
alter table svc.warranties enable row level security;
create policy pol_read_warranties on svc.warranties for select to authenticated using (core.has_any_scope(array['warranty.read','service.write','service.work','service.approve']));
grant select on svc.warranties to authenticated;
alter table svc.service_tickets enable row level security;
create policy pol_read_service_tickets on svc.service_tickets for select to authenticated using (core.has_any_scope(array['warranty.read','service.write','service.work','service.approve']));
grant select on svc.service_tickets to authenticated;
alter table svc.service_parts enable row level security;
create policy pol_read_service_parts on svc.service_parts for select to authenticated using (core.has_any_scope(array['warranty.read','service.write','service.work','service.approve']));
grant select on svc.service_parts to authenticated;
alter table svc.service_events enable row level security;
create policy pol_read_service_events on svc.service_events for select to authenticated using (core.has_any_scope(array['warranty.read','service.write','service.work','service.approve']));
grant select on svc.service_events to authenticated;
grant select on core.profiles, core.approvals, core.notifications, core.user_roles, core.customer_accounts, core.import_batches, core.audit_log, core.roles, core.locations, core.cost_centres, core.currencies, core.exchange_rates, core.tax_rates, core.settings, core.approval_rules, core.attachments to authenticated;
grant select on inv.v_stock_on_hand, inv.v_stock_available, prod.v_buildable, proc.v_po_line_status, fin.v_ar_open, fin.v_budget_vs_actual, prod.v_unit_cost to authenticated;
-- Notifications: users may mark their own as read through the API only; no write policies exist.

-- ===== 10. Seed data =====
insert into core.currencies(code, name) values ('GHS','Ghana cedi'),('USD','US dollar'),('EUR','Euro'),('GBP','Pound sterling'),('CNY','Chinese yuan'),('AED','UAE dirham') on conflict do nothing;
insert into core.roles(code, name, description, default_scopes) values
 ('super_admin','Super Admin','System administration, users, permissions, configuration, security', array['catalog.read','catalog.write','bom.write','inventory.read','orders.read','expenses.submit','gl.read','warranty.read','reports.read','audit.read','data.import','users.manage','roles.manage','settings.write','api_clients.manage']),
 ('management','Management','Approvals, oversight, KPIs, reports, business decisions', array['catalog.read','bom.approve','pricing.write','supplier.bank.approve','procurement.approve','inventory.read','inventory.adjust.approve','production.plan','licence.view','qc.override','orders.read','orders.approve','returns.approve','payments.approve','expenses.submit','expenses.approve','budgets.write','gl.read','gl.close_period','warranty.read','warranty.override','service.approve','reports.read','audit.read']),
 ('procurement_imports','Procurement & Imports Officer','Suppliers, purchasing, shipments, customs, clearing, landed costs','{catalog.read,catalog.write,suppliers.write,supplier.bank.write,procurement.write,imports.write,landedcost.post,rma.write,inventory.read,inventory.receive,expenses.submit,warranty.read,reports.read,data.import}'),
 ('inventory_sales','Inventory & Sales Officer','Warehouse, stock, internal sales, dispatch, build planning','{catalog.read,catalog.write,bom.write,pricing.write,procurement.write,inventory.read,inventory.receive,inventory.issue,inventory.adjust,count.run,production.plan,production.work,licence.view,orders.read,orders.write,dispatch.write,expenses.submit,warranty.read,reports.read,data.import}'),
 ('finance_service','Finance & Service Officer','Finance, payments, expenses, warranty, repairs, after-sales','{catalog.read,supplier.bank.approve,landedcost.post,rma.write,inventory.read,orders.read,invoices.write,payments.write,expenses.submit,budgets.write,gl.read,gl.post_manual,gl.close_period,warranty.read,service.write,service.work,reports.read}'),
 ('assembly_technician','Assembly Technician','Builds units, logs steps and tests, performs assigned repairs','{catalog.read,inventory.read,production.work,tests.record,licence.view,expenses.submit,warranty.read,service.work}'),
 ('qc_inspector','QC Inspector','Inspects incoming goods and finished units, records defects, retests','{catalog.read,inventory.read,count.run,tests.record,qc.inspect,rma.write,expenses.submit,warranty.read,service.work,reports.read}')
on conflict do nothing;
insert into core.locations(code, name, kind) values ('WH-MAIN','Main warehouse','warehouse'),('ASM-WIP','Assembly floor (WIP)','assembly_wip'),('RPR-01','Repair bench','repair_bench'),('QRN-01','Quarantine','quarantine'),('TRN-01','In transit','in_transit'),('DSP-01','Dispatch bay','dispatch') on conflict do nothing;
insert into prod.defect_codes(code, name, category, default_severity) values
 ('CS-001','Scratch or dent on chassis','cosmetic','minor'),('CS-002','Keyboard misalignment','cosmetic','minor'),('FN-001','Fails POST','functional','critical'),('FN-002','Display defect','functional','major'),
 ('FN-003','Battery not charging','functional','major'),('FN-004','Network adapter fault','functional','major'),('CP-001','Faulty RAM module','component','major'),('CP-002','Faulty storage device','component','major'),
 ('PR-001','Incorrect component installed','process','major'),('PR-002','Missing screw or cable','process','minor'),('DC-001','Label or serial mismatch','documentation','minor') on conflict do nothing;
insert into fin.chart_of_accounts(code, name, type, normal_side) values
 ('1000','Cash','asset','debit'),('1010','Bank','asset','debit'),('1020','Mobile money clearing','asset','debit'),('1100','Accounts receivable','asset','debit'),('1200','Inventory – components','asset','debit'),
 ('1210','Inventory – finished goods','asset','debit'),('1300','Input VAT recoverable','asset','debit'),('2000','Accounts payable','liability','credit'),('2100','Goods received not invoiced','liability','credit'),
 ('2110','Accrued import charges','liability','credit'),('2200','Output VAT payable','liability','credit'),('3000','Fund balance','equity','credit'),('4000','Internal sales revenue','revenue','credit'),
 ('4100','Other income','revenue','credit'),('5000','Cost of goods sold','cogs','debit'),('5100','Warranty expense','expense','debit'),('5200','Inventory loss and adjustments','expense','debit'),
 ('5300','Landed-cost variance','expense','debit'),('5400','Exchange gain or loss','expense','debit'),('6000','Operating expenses','expense','debit'),('6100','Bank charges','expense','debit') on conflict do nothing;
-- Placeholder approval limits (minor units). CONFIRM WITH MANAGEMENT before go-live.
insert into core.approval_rules(action_type, min_amount_minor, approver_role_code, delegate_role_code, sla_hours) values
 ('po', 1000000, 'management', 'super_admin', 24),('stock_writeoff', 100000, 'management', null, 24),('discount', 0, 'management', null, 24),('refund', 0, 'management', null, 24),
 ('expense', 500000, 'management', null, 48),('supplier_bank', 0, 'management', null, 24),('lc_reversal', 0, 'management', null, 24),('period_close', 0, 'management', null, 72);
insert into core.settings(key, value, description) values
 ('costing', '{"labour_rate_per_minute_minor": 0, "method": "moving_average"}', 'Labour rate per routing minute; method for item cost'),
 ('imports', '{"eta_slip_alert_days": 3, "demurrage_alert_days": 3}', 'Alert thresholds for shipments'),
 ('warranty', '{"default_months": 12, "expiry_notice_days": 30}', 'Warranty defaults'),
 ('approvals', '{"escalation_hours": 24}', 'Default escalation'),
 ('base_currency', '"GHS"', 'Base currency') on conflict do nothing;


-- Storage moves from Supabase Storage to Cloudinary. storage_path now holds the Cloudinary public_id;
-- assets are uploaded with type=authenticated and are only reachable through server-signed URLs.
alter table core.attachments
  add column if not exists provider text not null default 'cloudinary' check (provider in ('cloudinary')),
  add column if not exists resource_type text not null default 'raw' check (resource_type in ('image', 'raw', 'video')),
  add column if not exists delivery_type text not null default 'authenticated' check (delivery_type = 'authenticated'),
  add column if not exists asset_version bigint,
  add column if not exists format text;

comment on column core.attachments.storage_path is 'Cloudinary public_id (private, type=authenticated).';
comment on table core.attachments is 'File metadata; files live in Cloudinary as authenticated (private) assets.';

create unique index if not exists uq_attachments_public_id on core.attachments (storage_path);
create unique index if not exists uq_attachments_entity_sha on core.attachments (entity_type, entity_id, sha256);

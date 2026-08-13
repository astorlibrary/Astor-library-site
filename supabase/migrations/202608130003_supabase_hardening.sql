-- Keep internal Auth trigger functions out of the public RPC surface.
-- Their triggers continue to execute with the function owner's privileges.
revoke all on function public.handle_new_auth_user()
  from public, anon, authenticated;
revoke all on function public.sync_auth_user_identity()
  from public, anon, authenticated;

-- Cover the resource-catalogue foreign key for efficient integrity checks
-- if the catalogue grows or a retired resource is removed later.
create index if not exists resource_library_resource_idx
  on public.resource_library_items (resource_id);

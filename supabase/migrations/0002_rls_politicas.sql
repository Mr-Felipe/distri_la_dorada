-- 0002 RLS — helper de rol, políticas por rol (matriz 5.7.1) y reglas de columna

-- Helper SECURITY DEFINER: evita recursión de políticas sobre perfiles.
-- Se envuelve en (select ...) en las policies para evaluación initplan (una vez por statement).
create or replace function public.rol_actual() returns text
language sql stable security definer set search_path = '' as $$
  select coalesce(
    (select p.rol from public.perfiles p where p.id = auth.uid() and p.activo),
    nullif(auth.jwt() #>> '{app_metadata,rol}', '')
  );
$$;

revoke execute on function public.rol_actual() from public, anon, service_role;
grant execute on function public.rol_actual() to authenticated;

-- perfiles: cada quien lo suyo; admin ve y edita todo
create policy perfiles_select on public.perfiles for select to authenticated
  using (id = (select auth.uid()) or public.rol_actual() = 'admin');

create policy perfiles_update on public.perfiles for update to authenticated
  using (id = (select auth.uid()) or public.rol_actual() = 'admin')
  with check (id = (select auth.uid()) or public.rol_actual() = 'admin');

-- nadie cambia su propio rol (solo admin)
create or replace function public.fn_perfiles_rol() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.rol is distinct from old.rol and public.rol_actual() <> 'admin' then
    raise exception 'PERMISO_DENEGADO: solo un administrador cambia roles';
  end if;
  return new;
end $$;

create trigger trg_perfiles_rol before update of rol on public.perfiles
  for each row execute function public.fn_perfiles_rol();

-- productos: todos los autenticados leen; solo admin crea/edita; bodega solo existencias (ajuste en trigger)
create policy productos_select on public.productos for select to authenticated
  using (true);

create policy productos_insert on public.productos for insert to authenticated
  with check (public.rol_actual() = 'admin');

create policy productos_update on public.productos for update to authenticated
  using (public.rol_actual() in ('admin','bodega'))
  with check (public.rol_actual() in ('admin','bodega'));

create policy productos_delete on public.productos for delete to authenticated
  using (public.rol_actual() = 'admin' and activo = false);

-- reglas de columna por rol: admin = todo; bodega = solo existencias; vendedor = nada.
-- Se omite cuando la escritura viene de una RPC transaccional (app.origen = 'rpc').
create or replace function public.fn_productos_reglas() returns trigger
language plpgsql set search_path = '' as $$
declare
  v_rol text;
begin
  if coalesce(current_setting('app.origen', true), '') = 'rpc' then
    return new;
  end if;
  v_rol := public.rol_actual();
  if v_rol = 'admin' then
    return new;
  end if;
  if v_rol = 'bodega' then
    if (new.referencia, new.nombre, new.precio, new.activo)
       is distinct from (old.referencia, old.nombre, old.precio, old.activo) then
      raise exception 'PERMISO_DENEGADO: bodega solo puede ajustar existencias';
    end if;
    return new;
  end if;
  raise exception 'PERMISO_DENEGADO: solo un administrador modifica productos';
end $$;

create trigger trg_productos_reglas before update on public.productos
  for each row execute function public.fn_productos_reglas();

-- pedidos y items: solo lectura directa; toda escritura pasa por las RPC (0003)
create policy pedidos_select on public.pedidos for select to authenticated
  using (true);

create policy pedido_items_select on public.pedido_items for select to authenticated
  using (true);

-- auditoria: solo admin consulta; la escriben los triggers (definer)
create policy auditoria_select on public.auditoria for select to authenticated
  using (public.rol_actual() = 'admin');

-- funciones que solo deben correr como trigger (owner/postgres), nunca desde la API
revoke execute on function public.fn_handle_new_user() from public, anon, authenticated, service_role;
revoke execute on function public.fn_perfiles_rol() from public, anon, authenticated, service_role;
revoke execute on function public.fn_productos_reglas() from public, anon, authenticated, service_role;
revoke execute on function public.fn_pedidos_transicion() from public, anon, authenticated, service_role;
revoke execute on function public.fn_actualizar_en() from public, anon, authenticated, service_role;

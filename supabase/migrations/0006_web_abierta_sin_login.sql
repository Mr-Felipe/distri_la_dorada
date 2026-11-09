-- 0006 Web abierta sin sesión — RF-08 queda como propuesta documental (no implementada)
-- El sistema pasa a ser público: todos acceden al catálogo, pedidos y resumen sin login.
-- Cambios: acceso anon completo, sin chequeos de rol en la capa de negocio y retiro
-- de las estructuras de roles (perfiles / vendedor_id).

-- ───────────────────────────────────────────────────────────────
-- 1) Retiro de estructuras de roles
-- ───────────────────────────────────────────────────────────────
alter table public.pedidos drop column if exists vendedor_id;

drop trigger if exists on_auth_user_created on auth.users;
drop table if exists public.perfiles cascade;
drop function if exists public.fn_handle_new_user();
drop function if exists public.fn_perfiles_rol();

-- rol_actual() deja de depender de perfiles: solo lee el reclamo JWT si hay sesión.
create or replace function public.rol_actual() returns text
language sql stable security definer set search_path = '' as $$
  select nullif(auth.jwt() #>> '{app_metadata,rol}', '');
$$;

revoke execute on function public.rol_actual() from public, anon, service_role;
grant execute on function public.rol_actual() to authenticated;

-- ───────────────────────────────────────────────────────────────
-- 2) Sin reglas de columna por rol en productos
-- ───────────────────────────────────────────────────────────────
drop trigger if exists trg_productos_reglas on public.productos;
drop function if exists public.fn_productos_reglas();

-- ───────────────────────────────────────────────────────────────
-- 3) Permisos para el rol anon (público de la web)
-- ───────────────────────────────────────────────────────────────
grant usage on schema public to anon;

grant select, insert, update, delete on public.productos to anon;
grant select on public.pedidos to anon;
grant select on public.pedido_items to anon;
grant select on public.vw_resumen_por_estado to anon;

grant execute on function public.crear_pedido(text, jsonb, text) to anon;
grant execute on function public.confirmar_pedido(uuid) to anon;
grant execute on function public.despachar_pedido(uuid) to anon;
grant execute on function public.cancelar_pedido(uuid, text) to anon;
grant execute on function public.resumen_por_estado() to anon;

-- ───────────────────────────────────────────────────────────────
-- 4) Políticas RLS abiertas para anon
-- ───────────────────────────────────────────────────────────────
create policy anon_productos_select on public.productos
  for select to anon using (true);
create policy anon_productos_insert on public.productos
  for insert to anon with check (true);
create policy anon_productos_update on public.productos
  for update to anon using (true) with check (true);
create policy anon_productos_delete on public.productos
  for delete to anon using (true);

create policy anon_pedidos_select on public.pedidos
  for select to anon using (true);
create policy anon_pedido_items_select on public.pedido_items
  for select to anon using (true);

-- ───────────────────────────────────────────────────────────────
-- 5) RPCs sin chequeos de rol (la lógica de negocio se mantiene intacta)
-- ───────────────────────────────────────────────────────────────
create or replace function public.crear_pedido(
  p_cliente text,
  p_items jsonb,
  p_observacion text default null
) returns public.pedidos
language plpgsql security definer set search_path = '' as $$
declare
  v_pedido_id uuid;
  v_total numeric(14,2);
  v_precio numeric(12,2);
  v_item record;
  v_result public.pedidos;
begin
  if p_cliente is null or length(btrim(p_cliente)) = 0 then
    raise exception 'CLIENTE_INVALIDO: el pedido debe indicar el cliente';
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'PEDIDO_VACIO: agrega al menos un producto';
  end if;
  -- cantidades enteras mayores que cero
  if exists (
    select 1 from jsonb_array_elements(p_items) e
    where coalesce(e ->> 'producto_id', '') !~ '^[0-9a-fA-F-]{36}$'
       or coalesce(e ->> 'cantidad', '') !~ '^[1-9][0-9]*$'
  ) then
    raise exception 'CANTIDAD_INVALIDA: cada linea requiere producto_id valido y cantidad mayor que cero';
  end if;

  insert into public.pedidos (cliente, observacion, estado)
  values (btrim(p_cliente),
          nullif(btrim(coalesce(p_observacion, '')), ''),
          'pendiente')
  returning id into v_pedido_id;

  for v_item in
    select (e ->> 'producto_id')::uuid as producto_id,
           sum((e ->> 'cantidad')::int)::int as cantidad
    from jsonb_array_elements(p_items) e
    group by 1
  loop
    select pr.precio into v_precio
    from public.productos pr
    where pr.id = v_item.producto_id and pr.activo;
    if not found then
      raise exception 'PRODUCTO_INVALIDO: el producto % no existe o esta inactivo', v_item.producto_id;
    end if;
    insert into public.pedido_items (pedido_id, producto_id, cantidad, precio_unitario)
    values (v_pedido_id, v_item.producto_id, v_item.cantidad, v_precio);
  end loop;

  select coalesce(sum(pi.cantidad * pi.precio_unitario), 0) into v_total
  from public.pedido_items pi
  where pi.pedido_id = v_pedido_id;

  update public.pedidos set total = v_total where id = v_pedido_id;

  select * into v_result from public.pedidos where id = v_pedido_id;
  return v_result;
end $$;

create or replace function public.confirmar_pedido(p_pedido_id uuid)
returns public.pedidos
language plpgsql security definer set search_path = '' as $$
declare
  v_pedido public.pedidos;
  v_faltante text;
begin
  -- bloquea la fila: dos confirmaciones concurrentes se serializan
  select * into v_pedido from public.pedidos where id = p_pedido_id for update;
  if not found then
    raise exception 'PEDIDO_NO_ENCONTRADO: no existe el pedido';
  end if;
  if v_pedido.estado <> 'pendiente' then
    raise exception 'TRANSICION_INVALIDA: el pedido esta "%" y solo se confirma un pedido pendiente', v_pedido.estado;
  end if;

  -- bloqueo con motivo concreto (no se confía en lo cargado en pantalla)
  select string_agg(format('%s (disponibles %s, solicitados %s)', pr.nombre, pr.existencias, s.cantidad), '; ')
    into v_faltante
  from (select producto_id, sum(cantidad)::int as cantidad
        from public.pedido_items where pedido_id = p_pedido_id group by producto_id) s
  join public.productos pr on pr.id = s.producto_id
  where pr.existencias < s.cantidad;

  if v_faltante is not null then
    raise exception 'INVENTARIO_INSUFICIENTE: %', v_faltante;
  end if;

  perform set_config('app.origen', 'rpc', true);

  -- descuento exactamente una vez, en la misma transacción
  update public.productos pr
     set existencias = pr.existencias - s.cantidad
  from (select producto_id, sum(cantidad)::int as cantidad
        from public.pedido_items where pedido_id = p_pedido_id group by producto_id) s
  where pr.id = s.producto_id;

  update public.pedidos
     set estado = 'confirmado', confirmado_en = now()
   where id = p_pedido_id;

  select * into v_pedido from public.pedidos where id = p_pedido_id;
  return v_pedido;
end $$;

create or replace function public.despachar_pedido(p_pedido_id uuid)
returns public.pedidos
language plpgsql security definer set search_path = '' as $$
declare
  v_pedido public.pedidos;
begin
  select * into v_pedido from public.pedidos where id = p_pedido_id for update;
  if not found then
    raise exception 'PEDIDO_NO_ENCONTRADO: no existe el pedido';
  end if;
  if v_pedido.estado <> 'confirmado' then
    raise exception 'TRANSICION_INVALIDA: el pedido esta "%" y solo se despacha un pedido confirmado', v_pedido.estado;
  end if;
  update public.pedidos
     set estado = 'despachado', despachado_en = now()
   where id = p_pedido_id;
  select * into v_pedido from public.pedidos where id = p_pedido_id;
  return v_pedido;
end $$;

create or replace function public.cancelar_pedido(p_pedido_id uuid, p_motivo text)
returns public.pedidos
language plpgsql security definer set search_path = '' as $$
declare
  v_pedido public.pedidos;
begin
  if p_motivo is null or length(btrim(p_motivo)) = 0 then
    raise exception 'MOTIVO_REQUERIDO: indica el motivo de la cancelacion';
  end if;
  select * into v_pedido from public.pedidos where id = p_pedido_id for update;
  if not found then
    raise exception 'PEDIDO_NO_ENCONTRADO: no existe el pedido';
  end if;
  if v_pedido.estado not in ('pendiente','confirmado') then
    raise exception 'TRANSICION_INVALIDA: el pedido esta "%" y no se puede cancelar', v_pedido.estado;
  end if;

  if v_pedido.estado = 'confirmado' then
    perform set_config('app.origen', 'rpc', true);
    -- reversión única de existencias (solo si ya se habían descontado)
    update public.productos pr
       set existencias = pr.existencias + s.cantidad
    from (select producto_id, sum(cantidad)::int as cantidad
          from public.pedido_items where pedido_id = p_pedido_id group by producto_id) s
    where pr.id = s.producto_id;
  end if;

  update public.pedidos
     set estado = 'rechazado', motivo_rechazo = btrim(p_motivo), rechazado_en = now()
   where id = p_pedido_id;

  select * into v_pedido from public.pedidos where id = p_pedido_id;
  return v_pedido;
end $$;

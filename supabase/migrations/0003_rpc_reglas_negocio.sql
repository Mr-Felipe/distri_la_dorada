-- 0003 RPC — capa de lógica con las reglas de negocio (RB-01..RB-04)
-- Todas son security definer: evitan policies de escritura directa (42501) y
-- serializan el control de inventario con FOR UPDATE (RB-02/RB-03, R-1).

create or replace function public.crear_pedido(
  p_cliente text,
  p_items jsonb,
  p_observacion text default null
) returns public.pedidos
language plpgsql security definer set search_path = '' as $$
declare
  v_rol text := public.rol_actual();
  v_pedido_id uuid;
  v_total numeric(14,2);
  v_precio numeric(12,2);
  v_item record;
  v_result public.pedidos;
begin
  if v_rol not in ('admin','vendedor') then
    raise exception 'PERMISO_DENEGADO: solo vendedor o administrador registran pedidos';
  end if;
  if p_cliente is null or length(btrim(p_cliente)) = 0 then
    raise exception 'CLIENTE_INVALIDO: el pedido debe indicar el cliente';
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'PEDIDO_VACIO: agrega al menos un producto';
  end if;
  -- RB-01: cantidades enteras > 0
  if exists (
    select 1 from jsonb_array_elements(p_items) e
    where coalesce(e ->> 'producto_id', '') !~ '^[0-9a-fA-F-]{36}$'
       or coalesce(e ->> 'cantidad', '') !~ '^[1-9][0-9]*$'
  ) then
    raise exception 'CANTIDAD_INVALIDA: cada linea requiere producto_id valido y cantidad mayor que cero';
  end if;

  insert into public.pedidos (cliente, observacion, vendedor_id, estado)
  values (btrim(p_cliente),
          nullif(btrim(coalesce(p_observacion, '')), ''),
          auth.uid(),
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
  v_rol text := public.rol_actual();
  v_pedido public.pedidos;
  v_faltante text;
begin
  if v_rol not in ('admin','vendedor') then
    raise exception 'PERMISO_DENEGADO: solo vendedor o administrador confirman pedidos';
  end if;
  -- bloquea la fila: dos confirmaciones concurrentes se serializan (RB-03, R-1)
  select * into v_pedido from public.pedidos where id = p_pedido_id for update;
  if not found then
    raise exception 'PEDIDO_NO_ENCONTRADO: no existe el pedido';
  end if;
  if v_pedido.estado <> 'pendiente' then
    raise exception 'TRANSICION_INVALIDA: el pedido esta "%" y solo se confirma un pedido pendiente', v_pedido.estado;
  end if;

  -- RB-02: bloqueo con motivo concreto (no se confía en lo cargado en pantalla)
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

  -- RB-03: descuento exactamente una vez, en la misma transacción
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
  v_rol text := public.rol_actual();
  v_pedido public.pedidos;
begin
  if v_rol not in ('admin','bodega') then
    raise exception 'PERMISO_DENEGADO: solo bodega o administrador despachan pedidos';
  end if;
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
  v_rol text := public.rol_actual();
  v_pedido public.pedidos;
begin
  if v_rol not in ('admin','vendedor') then
    raise exception 'PERMISO_DENEGADO: solo vendedor o administrador cancelan pedidos';
  end if;
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

create or replace function public.resumen_por_estado()
returns table (estado text, pedidos bigint, valor numeric)
language sql stable set search_path = '' as $$
  select p.estado, count(*)::bigint, coalesce(sum(p.total), 0)
  from public.pedidos p
  group by p.estado
  order by array_position(array['pendiente','confirmado','despachado','rechazado'], p.estado);
$$;

-- vista RF-07 con RLS del invocador (PG15+)
create or replace view public.vw_resumen_por_estado
with (security_invoker = true)
as
  select estado,
         count(*)::int as pedidos,
         coalesce(sum(total), 0) as valor
  from public.pedidos
  group by estado;

grant select on public.vw_resumen_por_estado to authenticated, service_role;

-- exposición deliberada de funciones RPC (solo app autenticada; nunca anon)
revoke execute on function public.crear_pedido(text, jsonb, text) from public, anon;
revoke execute on function public.confirmar_pedido(uuid) from public, anon;
revoke execute on function public.despachar_pedido(uuid) from public, anon;
revoke execute on function public.cancelar_pedido(uuid, text) from public, anon;
revoke execute on function public.resumen_por_estado() from public, anon;
grant execute on function public.crear_pedido(text, jsonb, text) to authenticated, service_role;
grant execute on function public.confirmar_pedido(uuid) to authenticated, service_role;
grant execute on function public.despachar_pedido(uuid) to authenticated, service_role;
grant execute on function public.cancelar_pedido(uuid, text) to authenticated, service_role;
grant execute on function public.resumen_por_estado() to authenticated, service_role;

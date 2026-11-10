-- 0009 RPC editar_pedido — CU-09: ajustar un pedido PENDIENTE
-- Revalida todo en el servidor (no confía en lo cargado en pantalla), reemplaza
-- las líneas, recalcula el total y actualiza cliente/observación en una sola
-- transacción (todo o nada). El estado NO cambia: el pedido sigue PENDIENTE y
-- las existencias no se tocan hasta la confirmación manual (CU-04).

create or replace function public.editar_pedido(
  p_pedido_id uuid,
  p_cliente text,
  p_items jsonb,
  p_observacion text default null
) returns public.pedidos
language plpgsql security definer set search_path = '' as $$
declare
  v_pedido public.pedidos;
  v_total numeric(14,2);
  v_precio numeric(12,2);
  v_item record;
begin
  if p_cliente is null or length(btrim(p_cliente)) = 0 then
    raise exception 'CLIENTE_INVALIDO: el pedido debe indicar el cliente';
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'PEDIDO_VACIO: agrega al menos un producto';
  end if;
  -- cantidades enteras mayores que cero (misma regla que crear_pedido)
  if exists (
    select 1 from jsonb_array_elements(p_items) e
    where coalesce(e ->> 'producto_id', '') !~ '^[0-9a-fA-F-]{36}$'
       or coalesce(e ->> 'cantidad', '') !~ '^[1-9][0-9]*$'
  ) then
    raise exception 'CANTIDAD_INVALIDA: cada linea requiere producto_id valido y cantidad mayor que cero';
  end if;

  -- bloquea la fila: dos ediciones concurrentes se serializan
  select * into v_pedido from public.pedidos where id = p_pedido_id for update;
  if not found then
    raise exception 'PEDIDO_NO_ENCONTRADO: no existe el pedido';
  end if;
  if v_pedido.estado <> 'pendiente' then
    raise exception 'TRANSICION_INVALIDA: el pedido esta "%" y solo se ajusta un pedido pendiente', v_pedido.estado;
  end if;

  -- revalida productos: existentes y activos (A2 del CU-09), antes de tocar nada
  for v_item in
    select distinct (e ->> 'producto_id')::uuid as producto_id
    from jsonb_array_elements(p_items) e
  loop
    perform 1
    from public.productos pr
    where pr.id = v_item.producto_id and pr.activo;
    if not found then
      raise exception 'PRODUCTO_INVALIDO: el producto % no existe o esta inactivo', v_item.producto_id;
    end if;
  end loop;

  -- reemplaza las líneas y recalcula el total en la misma transacción
  delete from public.pedido_items where pedido_id = p_pedido_id;

  for v_item in
    select (e ->> 'producto_id')::uuid as producto_id,
           sum((e ->> 'cantidad')::int)::int as cantidad
    from jsonb_array_elements(p_items) e
    group by 1
  loop
    select pr.precio into v_precio
    from public.productos pr
    where pr.id = v_item.producto_id and pr.activo;

    insert into public.pedido_items (pedido_id, producto_id, cantidad, precio_unitario)
    values (p_pedido_id, v_item.producto_id, v_item.cantidad, v_precio);
  end loop;

  select coalesce(sum(pi.cantidad * pi.precio_unitario), 0) into v_total
  from public.pedido_items pi
  where pi.pedido_id = p_pedido_id;

  update public.pedidos
     set cliente = btrim(p_cliente),
         observacion = nullif(btrim(coalesce(p_observacion, '')), ''),
         total = v_total
   where id = p_pedido_id;

  select * into v_pedido from public.pedidos where id = p_pedido_id;
  return v_pedido;
end $$;

-- exposición: misma política que el resto de RPCs (0003 + 0006, web abierta)
revoke execute on function public.editar_pedido(uuid, text, jsonb, text) from public, anon;
grant execute on function public.editar_pedido(uuid, text, jsonb, text) to authenticated, service_role;
grant execute on function public.editar_pedido(uuid, text, jsonb, text) to anon;

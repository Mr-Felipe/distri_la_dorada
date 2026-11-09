-- 0004 Auditoría — quién cambió qué, con fecha y rol (PLAN_MAESTRO §7)

create or replace function public.fn_auditar() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  -- defensa: la función solo puede ejecutarse como trigger
  if tg_op is null then
    raise exception 'PERMISO_DENEGADO: funcion reservada para triggers';
  end if;
  if tg_op = 'INSERT' then
    insert into public.auditoria (tabla, registro_id, accion, datos_despues, usuario_id, usuario_rol)
    values (tg_argv[0], new.id, 'INSERT', to_jsonb(new), auth.uid(), public.rol_actual());
  elsif tg_op = 'UPDATE' then
    insert into public.auditoria (tabla, registro_id, accion, datos_antes, datos_despues, usuario_id, usuario_rol)
    values (tg_argv[0], new.id, 'UPDATE', to_jsonb(old), to_jsonb(new), auth.uid(), public.rol_actual());
  else
    insert into public.auditoria (tabla, registro_id, accion, datos_antes, usuario_id, usuario_rol)
    values (tg_argv[0], old.id, 'DELETE', to_jsonb(old), auth.uid(), public.rol_actual());
  end if;
  return coalesce(new, old);
end $$;

-- solo el owner (postgres) la ejecuta; jamás desde la API
revoke execute on function public.fn_auditar() from public, anon, authenticated, service_role;
grant execute on function public.fn_auditar() to postgres;

create trigger trg_auditoria_productos after insert or update or delete on public.productos
  for each row execute function public.fn_auditar('productos');
create trigger trg_auditoria_pedidos after insert or update or delete on public.pedidos
  for each row execute function public.fn_auditar('pedidos');
create trigger trg_auditoria_items after insert or update or delete on public.pedido_items
  for each row execute function public.fn_auditar('pedido_items');

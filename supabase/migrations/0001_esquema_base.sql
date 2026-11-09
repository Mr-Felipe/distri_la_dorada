-- 0001 esquema base — La Dorada (estado final consolidado)
-- Tablas, secuencia, índices, triggers base y grants.
-- NOTA: los grants incluyen solo authenticated/service_role (nunca anon).

create sequence if not exists public.pedidos_numero_seq start 1000;

create table public.perfiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nombre text not null,
  rol text not null default 'vendedor' check (rol in ('admin','vendedor','bodega')),
  activo boolean not null default true,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

create table public.productos (
  id uuid primary key default gen_random_uuid(),
  referencia text not null unique,
  nombre text not null,
  precio numeric(12,2) not null check (precio >= 0),
  existencias integer not null default 0 check (existencias >= 0),
  activo boolean not null default true,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

create table public.pedidos (
  id uuid primary key default gen_random_uuid(),
  numero text not null default ('PED-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.pedidos_numero_seq')::text, 4, '0')),
  cliente text not null,
  observacion text,
  estado text not null default 'pendiente'
    check (estado in ('pendiente','confirmado','despachado','rechazado')),
  total numeric(14,2) not null default 0,
  vendedor_id uuid not null references public.perfiles (id),
  motivo_rechazo text,
  creado_en timestamptz not null default now(),
  confirmado_en timestamptz,
  despachado_en timestamptz,
  rechazado_en timestamptz,
  actualizado_en timestamptz not null default now(),
  unique (numero)
);

create table public.pedido_items (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid not null references public.pedidos (id) on delete cascade,
  producto_id uuid not null references public.productos (id),
  cantidad integer not null check (cantidad > 0),
  precio_unitario numeric(12,2) not null check (precio_unitario >= 0)
);

create table public.auditoria (
  id bigint generated always as identity primary key,
  tabla text not null,
  registro_id uuid,
  accion text not null check (accion in ('INSERT','UPDATE','DELETE')),
  datos_antes jsonb,
  datos_despues jsonb,
  usuario_id uuid,
  usuario_rol text,
  creado_en timestamptz not null default now()
);

create index if not exists ix_productos_nombre on public.productos (lower(nombre));
create index if not exists ix_productos_catalogo on public.productos (activo, referencia);
create index if not exists ix_pedidos_estado_creado on public.pedidos (estado, creado_en desc);
create index if not exists ix_pedidos_vendedor on public.pedidos (vendedor_id, creado_en desc);
create index if not exists ix_pedido_items_pedido on public.pedido_items (pedido_id);
create index if not exists ix_pedido_items_producto on public.pedido_items (producto_id);
create index if not exists ix_auditoria_registro on public.auditoria (tabla, registro_id, creado_en desc);
create index if not exists ix_auditoria_usuario on public.auditoria (usuario_id, creado_en desc);
create index if not exists ix_auditoria_tabla_creado on public.auditoria (tabla, creado_en desc);

-- updated_at automático
create or replace function public.fn_actualizar_en() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.actualizado_en := now();
  return new;
end $$;

create trigger trg_perfiles_en before update on public.perfiles
  for each row execute function public.fn_actualizar_en();
create trigger trg_productos_en before update on public.productos
  for each row execute function public.fn_actualizar_en();
create trigger trg_pedidos_en before update on public.pedidos
  for each row execute function public.fn_actualizar_en();

-- RB-04: máquina de estados pendiente -> confirmado -> despachado; rechazado es final
create or replace function public.fn_pedidos_transicion() returns trigger
language plpgsql set search_path = '' as $$
begin
  if old.estado = new.estado then
    return new;
  end if;
  if old.estado = 'rechazado' then
    raise exception 'TRANSICION_INVALIDA: un pedido rechazado es definitivo';
  end if;
  if not (
    (old.estado = 'pendiente'  and new.estado in ('confirmado','rechazado')) or
    (old.estado = 'confirmado' and new.estado in ('despachado','rechazado'))
  ) then
    raise exception 'TRANSICION_INVALIDA: no se puede pasar de "%" a "%"', old.estado, new.estado;
  end if;
  return new;
end $$;

create trigger trg_pedidos_transicion before update of estado on public.pedidos
  for each row execute function public.fn_pedidos_transicion();

-- alta de perfiles al registrarse en auth.users (rol desde app_metadata)
create or replace function public.fn_handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.perfiles (id, nombre, rol)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'nombre', ''), split_part(new.email, '@', 1)),
    coalesce(nullif(new.raw_app_meta_data ->> 'rol', ''), 'vendedor')
  )
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.fn_handle_new_user();

-- grants: solo authenticated y service_role (nunca anon)
grant usage on schema public to authenticated, service_role;
grant select, insert, update, delete on public.perfiles to authenticated, service_role;
grant select, insert, update, delete on public.productos to authenticated, service_role;
grant select, insert, update, delete on public.pedidos to authenticated, service_role;
grant select, insert, update, delete on public.pedido_items to authenticated, service_role;
grant select, insert, update, delete on public.auditoria to authenticated, service_role;
grant usage, select on sequence public.pedidos_numero_seq to authenticated, service_role;

alter table public.perfiles enable row level security;
alter table public.productos enable row level security;
alter table public.pedidos enable row level security;
alter table public.pedido_items enable row level security;
alter table public.auditoria enable row level security;

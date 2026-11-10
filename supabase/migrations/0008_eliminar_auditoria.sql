-- 0008 Elimina la bitácora de auditoría — decisión del equipo: esta versión
-- no lleva auditorías. Se retiran los tres disparadores que escribían en la
-- tabla (productos, pedidos, pedido_items), la función fn_auditar() y la
-- tabla auditoria (políticas, índices y grants se eliminan con ella).
-- Queda anotada como mejora futura en el documento técnico (5.10.2).
-- Nota: public.rol_actual() se conserva porque la usan las RPC de negocio.

drop trigger if exists trg_auditoria_productos on public.productos;
drop trigger if exists trg_auditoria_pedidos on public.pedidos;
drop trigger if exists trg_auditoria_items on public.pedido_items;
drop function if exists public.fn_auditar();
drop table if exists public.auditoria;

-- 0007 Precio mayor a cero — regla de negocio unificada con las cantidades:
-- el precio de un producto (y su copia congelada en cada línea de pedido)
-- debe ser estrictamente mayor que 0. Las existencias siguen admitiendo >= 0
-- (un producto puede estar agotado).
-- Verificado antes del cambio: 0 productos y 0 lineas con precio <= 0.

alter table public.productos drop constraint productos_precio_check;
alter table public.productos add constraint productos_precio_check check (precio > 0);

alter table public.pedido_items drop constraint pedido_items_precio_unitario_check;
alter table public.pedido_items add constraint pedido_items_precio_unitario_check check (precio_unitario > 0);

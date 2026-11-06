import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { EstadoPedido } from '../models/enums';
import { ItemSolicitadoDTO, Pedido, PedidoItem } from '../models/pedido';
import { mapError } from '../utils/errores';

@Injectable({
  providedIn: 'root'
})
export class PedidoService {
  private readonly supabase = inject(SupabaseService);

  /**
   * Lista los pedidos con filtros opcionales de estado y búsqueda por cliente o número.
   * Solo lectura (SELECT).
   */
  async listar(filtros?: { estado?: EstadoPedido | 'todos'; busqueda?: string }): Promise<Pedido[]> {
    let query = this.supabase.client
      .from('pedidos')
      .select('*')
      .order('creado_en', { ascending: false });

    if (filtros?.estado && filtros.estado !== 'todos') {
      query = query.eq('estado', filtros.estado);
    }

    if (filtros?.busqueda && filtros.busqueda.trim().length > 0) {
      const termino = filtros.busqueda.trim();
      const num = parseInt(termino.replace('#', ''), 10);
      if (!isNaN(num)) {
        query = query.or(`cliente.ilike.%${termino}%,numero.eq.${num}`);
      } else {
        query = query.ilike('cliente', `%${termino}%`);
      }
    }

    const { data, error } = await query;

    if (error) {
      throw mapError(error);
    }

    return (data || []).map(p => ({
      ...p,
      numero: Number(p.numero),
      total: Number(p.total)
    }));
  }

  /**
   * Obtiene el detalle completo de un pedido incluyendo sus líneas e información del producto.
   */
  async obtenerPorId(id: string): Promise<Pedido> {
    const { data: pedido, error: errPedido } = await this.supabase.client
      .from('pedidos')
      .select('*')
      .eq('id', id)
      .single();

    if (errPedido) {
      throw mapError(errPedido);
    }

    const { data: items, error: errItems } = await this.supabase.client
      .from('pedido_items')
      .select(`
        id,
        pedido_id,
        producto_id,
        cantidad,
        precio_unitario,
        creado_en,
        producto:productos (
          id,
          referencia,
          nombre,
          precio,
          existencias,
          activo
        )
      `)
      .eq('pedido_id', id);

    if (errItems) {
      throw mapError(errItems);
    }

    interface ItemRow {
      id: string;
      pedido_id: string;
      producto_id: string;
      cantidad: number;
      precio_unitario: number;
      creado_en?: string;
      producto?: {
        id: string;
        referencia: string;
        nombre: string;
        precio: number;
        existencias: number;
        activo: boolean;
      };
    }

    const itemsMapeados: PedidoItem[] = ((items || []) as unknown as ItemRow[]).map(it => ({
      id: it.id,
      pedido_id: it.pedido_id,
      producto_id: it.producto_id,
      cantidad: Number(it.cantidad),
      precio_unitario: Number(it.precio_unitario),
      creado_en: it.creado_en,
      producto: it.producto ? {
        ...it.producto,
        precio: Number(it.producto.precio),
        existencias: Number(it.producto.existencias)
      } : undefined
    }));

    return {
      ...pedido,
      numero: Number(pedido.numero),
      total: Number(pedido.total),
      items: itemsMapeados
    };
  }

  /**
   * RPC: crear_pedido
   * Parámetros: p_cliente, p_items, p_observacion (opcional)
   */
  async crearPedido(cliente: string, items: ItemSolicitadoDTO[], observacion?: string): Promise<string> {
    const params: { p_cliente: string; p_items: ItemSolicitadoDTO[]; p_observacion?: string } = {
      p_cliente: cliente.trim(),
      p_items: items.map(i => ({
        producto_id: i.producto_id,
        cantidad: Math.floor(Number(i.cantidad))
      }))
    };

    if (observacion && observacion.trim().length > 0) {
      params.p_observacion = observacion.trim();
    }

    const { data, error } = await this.supabase.client.rpc('crear_pedido', params);

    if (error) {
      throw mapError(error);
    }

    // Retorna el ID del nuevo pedido o el objeto devuelto
    if (typeof data === 'string') {
      return data;
    }
    if (data && typeof data === 'object' && 'id' in data) {
      return (data as { id: string }).id;
    }
    return String(data);
  }

  /**
   * RPC: confirmar_pedido
   * Parámetro: p_pedido_id
   * Descuento único de existencias en el servidor.
   */
  async confirmarPedido(pedidoId: string): Promise<void> {
    const { error } = await this.supabase.client.rpc('confirmar_pedido', {
      p_pedido_id: pedidoId
    });

    if (error) {
      throw mapError(error);
    }
  }

  /**
   * RPC: despachar_pedido
   * Parámetro: p_pedido_id
   * Solo confirmado -> despachado; rol admin/bodega.
   */
  async despacharPedido(pedidoId: string): Promise<void> {
    const { error } = await this.supabase.client.rpc('despachar_pedido', {
      p_pedido_id: pedidoId
    });

    if (error) {
      throw mapError(error);
    }
  }

  /**
   * RPC: cancelar_pedido
   * Parámetros: p_pedido_id, p_motivo
   * Pasa a rechazado y reversa inventario si estaba confirmado.
   */
  async cancelarPedido(pedidoId: string, motivo: string): Promise<void> {
    if (!motivo || motivo.trim().length === 0) {
      throw {
        titulo: 'Motivo requerido',
        mensaje: 'Debe ingresar un motivo para cancelar el pedido.'
      };
    }

    const { error } = await this.supabase.client.rpc('cancelar_pedido', {
      p_pedido_id: pedidoId,
      p_motivo: motivo.trim()
    });

    if (error) {
      throw mapError(error);
    }
  }
}

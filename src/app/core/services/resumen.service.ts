import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { ResumenEstado } from '../models/pedido';
import { EstadoPedido } from '../models/enums';
import { mapError } from '../utils/errores';

@Injectable({
  providedIn: 'root'
})
export class ResumenService {
  private readonly supabase = inject(SupabaseService);

  async obtenerResumen(): Promise<ResumenEstado[]> {
    interface FilaResumen {
      estado: EstadoPedido;
      pedidos: number;
      valor: number;
    }

    // 1. Intentar primero con la RPC 'resumen_por_estado'
    try {
      const { data, error } = await this.supabase.client.rpc('resumen_por_estado');
      if (!error && Array.isArray(data)) {
        return (data as unknown as FilaResumen[]).map(item => ({
          estado: item.estado,
          pedidos: Number(item.pedidos || 0),
          valor: Number(item.valor || 0)
        }));
      }
    } catch {
      // Si la RPC falla, intentar leer desde la vista
    }

    // 2. Fallback a la vista vw_resumen_por_estado
    const { data: vistaData, error: errVista } = await this.supabase.client
      .from('vw_resumen_por_estado')
      .select('*');

    if (errVista) {
      throw mapError(errVista);
    }

    return ((vistaData || []) as unknown as FilaResumen[]).map(item => ({
      estado: item.estado,
      pedidos: Number(item.pedidos || 0),
      valor: Number(item.valor || 0)
    }));
  }
}

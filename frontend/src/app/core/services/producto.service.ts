import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { Producto, ProductoDTO } from '../models/producto';
import { mapError } from '../utils/errores';

@Injectable({
  providedIn: 'root'
})
export class ProductoService {
  private readonly supabase = inject(SupabaseService);

  async listar(busqueda?: string, soloActivos = false): Promise<Producto[]> {
    let query = this.supabase.client
      .from('productos')
      .select('*')
      .order('nombre', { ascending: true });

    if (soloActivos) {
      query = query.eq('activo', true);
    }

    if (busqueda && busqueda.trim().length > 0) {
      const termino = busqueda.trim();
      query = query.or(`nombre.ilike.%${termino}%,referencia.ilike.%${termino}%`);
    }

    const { data, error } = await query;

    if (error) {
      throw mapError(error);
    }

    return (data || []).map(item => ({
      ...item,
      precio: Number(item.precio),
      existencias: Number(item.existencias)
    }));
  }

  async obtenerPorId(id: string): Promise<Producto> {
    const { data, error } = await this.supabase.client
      .from('productos')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      throw mapError(error);
    }

    return {
      ...data,
      precio: Number(data.precio),
      existencias: Number(data.existencias)
    };
  }

  async crear(dto: ProductoDTO): Promise<Producto> {
    const payload = {
      referencia: dto.referencia.trim().toUpperCase(),
      nombre: dto.nombre.trim(),
      precio: Number(dto.precio),
      existencias: dto.existencias !== undefined ? Number(dto.existencias) : 0,
      activo: dto.activo !== undefined ? dto.activo : true
    };

    const { data, error } = await this.supabase.client
      .from('productos')
      .insert(payload)
      .select()
      .single();

    if (error) {
      throw mapError(error);
    }

    return {
      ...data,
      precio: Number(data.precio),
      existencias: Number(data.existencias)
    };
  }

  async actualizar(id: string, dto: Partial<ProductoDTO>): Promise<Producto> {
    const payload: Record<string, unknown> = {};

    if (dto.referencia !== undefined) payload['referencia'] = dto.referencia.trim().toUpperCase();
    if (dto.nombre !== undefined) payload['nombre'] = dto.nombre.trim();
    if (dto.precio !== undefined) payload['precio'] = Number(dto.precio);
    if (dto.existencias !== undefined) payload['existencias'] = Number(dto.existencias);
    if (dto.activo !== undefined) payload['activo'] = dto.activo;

    const { data, error } = await this.supabase.client
      .from('productos')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw mapError(error);
    }

    return {
      ...data,
      precio: Number(data.precio),
      existencias: Number(data.existencias)
    };
  }

  async ajustarExistencias(id: string, existencias: number): Promise<Producto> {
    return this.actualizar(id, { existencias: Math.max(0, Math.floor(existencias)) });
  }

  async alternarActivo(id: string, activo: boolean): Promise<Producto> {
    return this.actualizar(id, { activo });
  }
}

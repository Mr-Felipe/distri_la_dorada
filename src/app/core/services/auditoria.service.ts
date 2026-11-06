import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { AuditoriaRegistro } from '../models/auditoria';
import { mapError } from '../utils/errores';

@Injectable({
  providedIn: 'root'
})
export class AuditoriaService {
  private readonly supabase = inject(SupabaseService);

  async listarRecientes(limite = 50): Promise<AuditoriaRegistro[]> {
    const { data, error } = await this.supabase.client
      .from('auditoria')
      .select('*')
      .order('creado_en', { ascending: false })
      .limit(limite);

    if (error) {
      throw mapError(error);
    }

    return (data || []).map(item => ({
      ...item,
      id: Number(item.id)
    }));
  }
}

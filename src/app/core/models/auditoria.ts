import { AccionAuditoria, RolUsuario } from './enums';

export interface AuditoriaRegistro {
  id: number;
  tabla: string;
  registro_id?: string | null;
  accion: AccionAuditoria;
  datos_antes?: Record<string, unknown> | null;
  datos_despues?: Record<string, unknown> | null;
  usuario_id?: string | null;
  usuario_rol?: RolUsuario | string | null;
  creado_en: string;
}

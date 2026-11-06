import { RolUsuario } from './enums';

export interface Perfil {
  id: string;
  nombre: string;
  rol: RolUsuario;
  activo: boolean;
  creado_en?: string;
  actualizado_en?: string;
}

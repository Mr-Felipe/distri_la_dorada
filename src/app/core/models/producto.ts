export interface Producto {
  id: string;
  referencia: string;
  nombre: string;
  precio: number;
  existencias: number;
  activo: boolean;
  creado_en?: string;
  actualizado_en?: string;
}

export interface ProductoDTO {
  referencia: string;
  nombre: string;
  precio: number;
  existencias?: number;
  activo?: boolean;
}

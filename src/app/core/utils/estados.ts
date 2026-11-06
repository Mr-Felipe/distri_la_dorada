import { EstadoPedido, RolUsuario } from '../models/enums';

export interface InfoEstado {
  codigo: EstadoPedido;
  etiqueta: string;
  colorTexto: string;
  colorFondo: string;
  colorBorde: string;
  icono: string;
  descripcion: string;
}

export const ESTADOS_PEDIDO_INFO: Record<EstadoPedido, InfoEstado> = {
  pendiente: {
    codigo: 'pendiente',
    etiqueta: 'Pendiente',
    colorTexto: '#b45309', // amber-700
    colorFondo: '#fef3c7', // amber-100
    colorBorde: '#fcd34d', // amber-300
    icono: 'schedule',
    descripcion: 'Esperando confirmación comercial para reservar existencias'
  },
  confirmado: {
    codigo: 'confirmado',
    etiqueta: 'Confirmado',
    colorTexto: '#1d4ed8', // blue-700
    colorFondo: '#dbeafe', // blue-100
    colorBorde: '#93c5fd', // blue-300
    icono: 'check_circle',
    descripcion: 'Inventario descontado exitosamente, listo para despacho en bodega'
  },
  despachado: {
    codigo: 'despachado',
    etiqueta: 'Despachado',
    colorTexto: '#047857', // emerald-700
    colorFondo: '#d1fae5', // emerald-100
    colorBorde: '#6ee7b7', // emerald-300
    icono: 'local_shipping',
    descripcion: 'Mercancía entregada o despachada desde bodega'
  },
  rechazado: {
    codigo: 'rechazado',
    etiqueta: 'Rechazado',
    colorTexto: '#b91c1c', // red-700
    colorFondo: '#fee2e2', // red-100
    colorBorde: '#fca5a5', // red-300
    icono: 'cancel',
    descripcion: 'Pedido cancelado; existencias reversadas si estaba confirmado'
  }
};

export function obtenerInfoEstado(estado: EstadoPedido): InfoEstado {
  return ESTADOS_PEDIDO_INFO[estado] ?? {
    codigo: estado,
    etiqueta: estado,
    colorTexto: '#475569',
    colorFondo: '#f1f5f9',
    colorBorde: '#cbd5e1',
    icono: 'help_outline',
    descripcion: ''
  };
}

/** Permisos del sistema según la matriz de especificación §6 */
export function puedeCrearEditarProducto(rol: RolUsuario | null | undefined): boolean {
  return rol === 'admin' || rol === 'vendedor';
}

export function puedeAjustarExistencias(rol: RolUsuario | null | undefined): boolean {
  return rol === 'admin' || rol === 'bodega';
}

export function puedeDesactivarProducto(rol: RolUsuario | null | undefined): boolean {
  return rol === 'admin';
}

export function puedeCrearPedido(rol: RolUsuario | null | undefined): boolean {
  return rol === 'admin' || rol === 'vendedor';
}

export function puedeConfirmarCancelarPedido(rol: RolUsuario | null | undefined): boolean {
  return rol === 'admin' || rol === 'vendedor';
}

export function puedeDespacharPedido(rol: RolUsuario | null | undefined): boolean {
  return rol === 'admin' || rol === 'bodega';
}

export function puedeVerActividad(rol: RolUsuario | null | undefined): boolean {
  return rol === 'admin';
}

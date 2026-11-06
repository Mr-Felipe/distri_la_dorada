import { EstadoPedido } from './enums';
import { Producto } from './producto';

export interface PedidoItem {
  id: string;
  pedido_id: string;
  producto_id: string;
  cantidad: number;
  precio_unitario: number;
  creado_en?: string;
  producto?: Producto;
}

export interface Pedido {
  id: string;
  numero: number;
  cliente: string;
  observacion?: string | null;
  estado: EstadoPedido;
  total: number;
  vendedor_id: string;
  motivo_rechazo?: string | null;
  creado_en: string;
  confirmado_en?: string | null;
  despachado_en?: string | null;
  rechazado_en?: string | null;
  actualizado_en?: string;
  items?: PedidoItem[];
}

export interface ItemSolicitadoDTO {
  producto_id: string;
  cantidad: number;
}

export interface ResumenEstado {
  estado: EstadoPedido;
  pedidos: number;
  valor: number;
}

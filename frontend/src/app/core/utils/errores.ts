export interface AppError {
  titulo: string;
  mensaje: string;
  codigo?: string;
  detalle?: string;
}

export function mapError(err: unknown): AppError {
  if (!err) {
    return {
      titulo: 'Error inesperado',
      mensaje: 'Ha ocurrido un error desconocido. Por favor intenta nuevamente.'
    };
  }

  // Si ya es un AppError
  if (typeof err === 'object' && err !== null && 'titulo' in err && 'mensaje' in err) {
    return err as AppError;
  }

  const anyErr = err as {
    message?: string;
    code?: string | number;
    details?: string;
    hint?: string;
    status?: number;
  };

  const rawMsg = anyErr.message || (typeof err === 'string' ? err : 'Error en la operación');
  const code = anyErr.code ? String(anyErr.code) : undefined;

  // Supabase RPC custom exceptions
  if (rawMsg.includes('INVENTARIO_INSUFICIENTE')) {
    const detalle = rawMsg.replace(/^.*?INVENTARIO_INSUFICIENTE:\s*/i, '').trim();
    return {
      titulo: 'Inventario insuficiente',
      mensaje: detalle || 'No hay existencias suficientes para completar esta solicitud.',
      codigo: 'INVENTARIO_INSUFICIENTE',
      detalle
    };
  }

  if (rawMsg.includes('TRANSICION_INVALIDA')) {
    const detalle = rawMsg.replace(/^.*?TRANSICION_INVALIDA:\s*/i, '').trim();
    return {
      titulo: 'Transición no permitida',
      mensaje: 'Esta acción no está permitida en el estado actual del pedido. ' + (detalle ? `(${detalle})` : ''),
      codigo: 'TRANSICION_INVALIDA',
      detalle
    };
  }

  if (rawMsg.includes('PERMISO_DENEGADO') || code === '42501') {
    return {
      titulo: 'Permiso denegado',
      mensaje: 'No tienes permisos suficientes para realizar esta acción.',
      codigo: 'PERMISO_DENEGADO'
    };
  }

  if (rawMsg.includes('PEDIDO_VACIO')) {
    return {
      titulo: 'Pedido vacío',
      mensaje: 'Debe agregar al menos un producto al pedido con cantidad mayor a cero.',
      codigo: 'PEDIDO_VACIO'
    };
  }

  if (rawMsg.includes('CANTIDAD_INVALIDA')) {
    return {
      titulo: 'Cantidad inválida',
      mensaje: 'Todas las cantidades deben ser números enteros mayores a 0.',
      codigo: 'CANTIDAD_INVALIDA'
    };
  }

  if (rawMsg.includes('CLIENTE_INVALIDO')) {
    return {
      titulo: 'Cliente inválido',
      mensaje: 'El nombre del cliente es obligatorio.',
      codigo: 'CLIENTE_INVALIDO'
    };
  }

  if (rawMsg.includes('MOTIVO_REQUERIDO')) {
    return {
      titulo: 'Motivo requerido',
      mensaje: 'Debe indicar un motivo obligatorio para cancelar el pedido.',
      codigo: 'MOTIVO_REQUERIDO'
    };
  }

  if (rawMsg.includes('PRODUCTO_INVALIDO')) {
    return {
      titulo: 'Producto inválido',
      mensaje: 'Uno o más productos seleccionados no existen o están inactivos.',
      codigo: 'PRODUCTO_INVALIDO'
    };
  }

  // Supabase / Postgres unique violation (e.g. referencia duplicada)
  if (code === '23505' || rawMsg.toLowerCase().includes('duplicate key') || rawMsg.toLowerCase().includes('unique')) {
    return {
      titulo: 'Registro duplicado',
      mensaje: 'La referencia ingresada ya existe en el catálogo. Por favor utiliza una referencia única.',
      codigo: '23505'
    };
  }

  // Network / server errors
  if (rawMsg.includes('Failed to fetch') || rawMsg.includes('NetworkError') || anyErr.status === 500 || anyErr.status === 503) {
    return {
      titulo: 'Error de conexión',
      mensaje: 'No se pudo conectar con el servidor. Verifica tu conexión a internet e intenta de nuevo.',
      codigo: 'NETWORK_ERROR'
    };
  }

  return {
    titulo: 'Error en la solicitud',
    mensaje: rawMsg,
    codigo: code
  };
}

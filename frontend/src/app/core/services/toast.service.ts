import { Injectable, signal } from '@angular/core';

export type ToastTipo = 'exito' | 'error' | 'advertencia' | 'info';

export interface ToastMensaje {
  id: string;
  tipo: ToastTipo;
  titulo: string;
  mensaje: string;
  duracionMs?: number;
}

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  private readonly _toasts = signal<ToastMensaje[]>([]);
  readonly toasts = this._toasts.asReadonly();

  mostrar(tipo: ToastTipo, titulo: string, mensaje: string, duracionMs = 5000): void {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const nuevoToast: ToastMensaje = { id, tipo, titulo, mensaje, duracionMs };

    this._toasts.update(list => [...list, nuevoToast]);

    if (duracionMs > 0) {
      setTimeout(() => {
        this.remover(id);
      }, duracionMs);
    }
  }

  exito(mensaje: string, titulo = 'Operación exitosa', duracionMs = 4000): void {
    this.mostrar('exito', titulo, mensaje, duracionMs);
  }

  error(mensaje: string, titulo = 'Error', duracionMs = 7000): void {
    this.mostrar('error', titulo, mensaje, duracionMs);
  }

  advertencia(mensaje: string, titulo = 'Atención', duracionMs = 5000): void {
    this.mostrar('advertencia', titulo, mensaje, duracionMs);
  }

  info(mensaje: string, titulo = 'Información', duracionMs = 4000): void {
    this.mostrar('info', titulo, mensaje, duracionMs);
  }

  remover(id: string): void {
    this._toasts.update(list => list.filter(t => t.id !== id));
  }

  limpiar(): void {
    this._toasts.set([]);
  }
}

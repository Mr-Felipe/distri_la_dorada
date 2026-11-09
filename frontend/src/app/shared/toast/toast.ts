import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-toast-contenedor',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="toast-area" role="region" aria-label="Notificaciones del sistema" aria-live="polite">
      @for (toast of toastService.toasts(); track toast.id) {
        <div class="toast-item" [class]="'toast-' + toast.tipo">
          <div class="toast-icono-wrap">
            <span class="material-icons toast-icono">
              @switch (toast.tipo) {
                @case ('exito') { check_circle }
                @case ('error') { error }
                @case ('advertencia') { warning }
                @case ('info') { info }
              }
            </span>
          </div>

          <div class="toast-contenido">
            <h4 class="toast-titulo">{{ toast.titulo }}</h4>
            <p class="toast-mensaje">{{ toast.mensaje }}</p>
          </div>

          <button
            type="button"
            class="toast-btn-cerrar"
            aria-label="Cerrar notificación"
            (click)="toastService.remover(toast.id)"
          >
            <span class="material-icons">close</span>
          </button>
        </div>
      }
    </div>
  `,
  styles: [`
    .toast-area {
      position: fixed;
      top: 1.25rem;
      right: 1.25rem;
      z-index: 1100;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      max-width: 24rem;
      width: calc(100vw - 2.5rem);
      pointer-events: none;
    }

    .toast-item {
      pointer-events: auto;
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
      padding: 0.875rem 1rem;
      border-radius: 0.75rem;
      background: #ffffff;
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.15), 0 4px 6px -4px rgba(0, 0, 0, 0.1);
      border-left: 4px solid #cbd5e1;
      border-top: 1px solid #f1f5f9;
      border-right: 1px solid #f1f5f9;
      border-bottom: 1px solid #e2e8f0;
      animation: slideIn 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .toast-exito {
      border-left-color: #059669;
    }
    .toast-exito .toast-icono {
      color: #059669;
    }

    .toast-error {
      border-left-color: #dc2626;
    }
    .toast-error .toast-icono {
      color: #dc2626;
    }

    .toast-advertencia {
      border-left-color: #d97706;
    }
    .toast-advertencia .toast-icono {
      color: #d97706;
    }

    .toast-info {
      border-left-color: #0f2744;
    }
    .toast-info .toast-icono {
      color: #0f2744;
    }

    .toast-icono-wrap {
      flex-shrink: 0;
      margin-top: 0.125rem;
    }
    .toast-icono {
      font-size: 1.25rem;
    }

    .toast-contenido {
      flex: 1;
      min-width: 0;
    }

    .toast-titulo {
      margin: 0;
      font-size: 0.875rem;
      font-weight: 700;
      color: #0f2744;
      line-height: 1.25;
    }

    .toast-mensaje {
      margin: 0.25rem 0 0 0;
      font-size: 0.8125rem;
      color: #475569;
      line-height: 1.35;
      word-break: break-word;
    }

    .toast-btn-cerrar {
      flex-shrink: 0;
      background: transparent;
      border: none;
      color: #94a3b8;
      cursor: pointer;
      padding: 0.125rem;
      border-radius: 0.25rem;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .toast-btn-cerrar:hover {
      color: #334155;
    }
    .toast-btn-cerrar .material-icons {
      font-size: 1.1rem;
    }

    @keyframes slideIn {
      from {
        opacity: 0;
        transform: translateX(20px);
      }
      to {
        opacity: 1;
        transform: translateX(0);
      }
    }

    @media (max-width: 640px) {
      .toast-area {
        top: auto;
        bottom: 1rem;
        right: 1rem;
        left: 1rem;
        max-width: none;
        width: auto;
      }
    }
  `]
})
export class ToastContenedor {
  readonly toastService = inject(ToastService);
}

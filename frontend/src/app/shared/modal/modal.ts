import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
  selector: 'app-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (abierto()) {
      <div class="modal-backdrop-wrap">
        <button
          type="button"
          class="modal-backdrop"
          aria-label="Cerrar modal"
          tabindex="-1"
          (click)="alClicFondo()"
        ></button>
        <div
          class="modal-contenedor"
          [class]="'modal-' + tamano()"
          role="dialog"
          aria-modal="true"
          [attr.aria-labelledby]="'modal-titulo-' + idUnico"
        >
          <!-- Encabezado -->
          <div class="modal-header">
            <div class="modal-header-titulo">
              @if (icono()) {
                <span class="material-icons modal-header-icono">{{ icono() }}</span>
              }
              <h3 [id]="'modal-titulo-' + idUnico" class="modal-titulo">{{ titulo() }}</h3>
            </div>
            <button
              type="button"
              class="modal-btn-cerrar"
              aria-label="Cerrar modal"
              (click)="cerrar.emit()"
            >
              <span class="material-icons">close</span>
            </button>
          </div>

          <!-- Cuerpo -->
          <div class="modal-body">
            <ng-content></ng-content>
          </div>

          <!-- Pie (opcional) -->
          <div class="modal-footer">
            <ng-content select="[slot=footer]"></ng-content>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .modal-backdrop-wrap {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      padding: 1rem;
      animation: fadeIn 0.15s ease-out;
    }

    .modal-backdrop {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(10, 25, 47, 0.65);
      backdrop-filter: blur(4px);
      border: none;
      padding: 0;
      margin: 0;
      cursor: pointer;
    }

    .modal-contenedor {
      position: relative;
      z-index: 1001;
      background: #ffffff;
      border-radius: 1rem;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.25), 0 8px 10px -6px rgba(0, 0, 0, 0.2);
      width: 100%;
      max-height: 90vh;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      animation: scaleUp 0.2s cubic-bezier(0.16, 1, 0.3, 1);
      border: 1px solid rgba(226, 232, 240, 0.8);
    }

    .modal-sm { max-width: 24rem; }
    .modal-md { max-width: 32rem; }
    .modal-lg { max-width: 44rem; }
    .modal-xl { max-width: 56rem; }

    .modal-header {
      padding: 1.25rem 1.5rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid #e2e8f0;
      background-color: #f8fafc;
    }

    .modal-header-titulo {
      display: flex;
      align-items: center;
      gap: 0.625rem;
    }

    .modal-header-icono {
      color: #0f2744;
      font-size: 1.4rem;
    }

    .modal-titulo {
      margin: 0;
      font-size: 1.125rem;
      font-weight: 700;
      color: #0f2744;
    }

    .modal-btn-cerrar {
      background: transparent;
      border: none;
      color: #64748b;
      cursor: pointer;
      padding: 0.375rem;
      border-radius: 0.375rem;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.15s;
    }
    .modal-btn-cerrar:hover {
      background: #e2e8f0;
      color: #0f2744;
    }

    .modal-body {
      padding: 1.5rem;
      overflow-y: auto;
      color: #334155;
      font-size: 0.9375rem;
      line-height: 1.5;
    }

    .modal-footer {
      padding: 1rem 1.5rem;
      border-top: 1px solid #e2e8f0;
      background-color: #f8fafc;
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 0.75rem;
    }

    .modal-footer:empty {
      display: none;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @keyframes scaleUp {
      from { opacity: 0; transform: scale(0.96); }
      to { opacity: 1; transform: scale(1); }
    }
  `],
  host: {
    '(document:keydown.escape)': 'alPulsarEscape()'
  }
})
export class Modal {
  readonly abierto = input<boolean>(false);
  readonly titulo = input<string>('');
  readonly icono = input<string>('');
  readonly tamano = input<'sm' | 'md' | 'lg' | 'xl'>('md');
  readonly cerrarAlHacerClicFondo = input<boolean>(true);

  readonly cerrar = output<void>();

  readonly idUnico = Math.random().toString(36).substring(2, 9);

  alClicFondo(): void {
    if (this.cerrarAlHacerClicFondo()) {
      this.cerrar.emit();
    }
  }

  alPulsarEscape(): void {
    if (this.abierto()) {
      this.cerrar.emit();
    }
  }
}

import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

export type VarianteBoton = 'primario' | 'dorado' | 'peligro' | 'secundario' | 'exito' | 'outline' | 'fantasma';
export type TamanoBoton = 'sm' | 'md' | 'lg';

@Component({
  selector: 'app-boton-cargando',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      [type]="tipo()"
      [disabled]="deshabilitado() || cargando()"
      [class]="'btn btn-' + variante() + ' btn-' + tamano()"
      [class.btn-cargando]="cargando()"
      [attr.aria-busy]="cargando()"
      [attr.aria-label]="ariaLabel() || null"
      (click)="alHacerClic($event)"
    >
      @if (cargando()) {
        <span class="spinner" aria-hidden="true"></span>
        <span class="btn-texto">{{ textoCargando() || 'Procesando...' }}</span>
      } @else {
        @if (icono()) {
          <span class="material-icons btn-icono" aria-hidden="true">{{ icono() }}</span>
        }
        <span class="btn-texto">
          <ng-content></ng-content>
        </span>
      }
    </button>
  `,
  styles: [`
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      font-weight: 600;
      border-radius: 0.625rem;
      border: 1px solid transparent;
      cursor: pointer;
      transition: all 0.2s ease;
      font-family: inherit;
      white-space: nowrap;
      user-select: none;
      outline: none;
    }

    .btn:focus-visible {
      box-shadow: 0 0 0 3px rgba(15, 39, 68, 0.25);
    }

    .btn:disabled {
      opacity: 0.55;
      cursor: not-allowed;
      transform: none !important;
      box-shadow: none !important;
    }

    /* Tamaños */
    .btn-sm {
      padding: 0.35rem 0.75rem;
      font-size: 0.8125rem;
      line-height: 1.25;
    }

    .btn-md {
      padding: 0.55rem 1.15rem;
      font-size: 0.875rem;
      line-height: 1.35;
    }

    .btn-lg {
      padding: 0.75rem 1.5rem;
      font-size: 1rem;
      line-height: 1.5;
    }

    .btn-icono {
      font-size: 1.15em;
      line-height: 1;
    }

    /* Variantes - Navy & Gold */
    .btn-primario {
      background-color: #0f2744;
      color: #ffffff;
      border-color: #0a192f;
      box-shadow: 0 2px 4px rgba(15, 39, 68, 0.15);
    }
    .btn-primario:hover:not(:disabled) {
      background-color: #16365c;
      box-shadow: 0 4px 8px rgba(15, 39, 68, 0.2);
    }

    .btn-dorado {
      background: linear-gradient(135deg, #d4af37 0%, #b89326 100%);
      color: #0f2744;
      border-color: #b89326;
      font-weight: 700;
      box-shadow: 0 2px 5px rgba(212, 175, 55, 0.25);
    }
    .btn-dorado:hover:not(:disabled) {
      background: linear-gradient(135deg, #e5bd3d 0%, #c49c2a 100%);
      box-shadow: 0 4px 10px rgba(212, 175, 55, 0.35);
    }

    .btn-secundario {
      background-color: #f1f5f9;
      color: #334155;
      border-color: #cbd5e1;
    }
    .btn-secundario:hover:not(:disabled) {
      background-color: #e2e8f0;
      color: #1e293b;
    }

    .btn-peligro {
      background-color: #dc2626;
      color: #ffffff;
      border-color: #b91c1c;
      box-shadow: 0 2px 4px rgba(220, 38, 38, 0.2);
    }
    .btn-peligro:hover:not(:disabled) {
      background-color: #b91c1c;
    }

    .btn-exito {
      background-color: #059669;
      color: #ffffff;
      border-color: #047857;
      box-shadow: 0 2px 4px rgba(5, 150, 105, 0.2);
    }
    .btn-exito:hover:not(:disabled) {
      background-color: #047857;
    }

    .btn-outline {
      background-color: transparent;
      color: #0f2744;
      border-color: #cbd5e1;
    }
    .btn-outline:hover:not(:disabled) {
      background-color: #f8fafc;
      border-color: #94a3b8;
    }

    .btn-fantasma {
      background-color: transparent;
      color: #64748b;
      border-color: transparent;
    }
    .btn-fantasma:hover:not(:disabled) {
      background-color: #f1f5f9;
      color: #0f2744;
    }

    /* Spinner */
    .spinner {
      width: 1em;
      height: 1em;
      border: 2px solid currentColor;
      border-right-color: transparent;
      border-radius: 50%;
      animation: spin 0.75s linear infinite;
      display: inline-block;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `]
})
export class BotonCargando {
  readonly tipo = input<'button' | 'submit'>('button');
  readonly variante = input<VarianteBoton>('primario');
  readonly tamano = input<TamanoBoton>('md');
  readonly cargando = input<boolean>(false);
  readonly deshabilitado = input<boolean>(false);
  readonly icono = input<string>('');
  readonly textoCargando = input<string>('');
  readonly ariaLabel = input<string>('');

  readonly accionar = output<MouseEvent>();

  alHacerClic(evento: MouseEvent): void {
    if (this.cargando() || this.deshabilitado()) {
      evento.preventDefault();
      evento.stopPropagation();
      return;
    }
    this.accionar.emit(evento);
  }
}

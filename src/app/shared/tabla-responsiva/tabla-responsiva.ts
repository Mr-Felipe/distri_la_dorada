import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
  selector: 'app-tabla-responsiva',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="contenedor-datos">
      @if (cargando()) {
        <div class="estado-cargando">
          <div class="spinner-grande"></div>
          <p class="texto-cargando">{{ mensajeCargando() || 'Cargando registros...' }}</p>
        </div>
      } @else if (error()) {
        <div class="estado-error">
          <span class="material-icons icono-alerta">error_outline</span>
          <h4 class="titulo-error">{{ tituloError() || 'No se pudieron cargar los datos' }}</h4>
          <p class="detalle-error">{{ error() }}</p>
          @if (mostrarReintentar()) {
            <button type="button" class="btn-reintentar" (click)="reintentar.emit()">
              <span class="material-icons">refresh</span>
              Reintentar
            </button>
          }
        </div>
      } @else if (totalElementos() === 0) {
        <div class="estado-vacio">
          <span class="material-icons icono-vacio">{{ iconoVacio() || 'inbox' }}</span>
          <h4 class="titulo-vacio">{{ tituloVacio() || 'Sin resultados' }}</h4>
          <p class="mensaje-vacio">{{ mensajeVacio() || 'No se encontraron registros para mostrar.' }}</p>
          <ng-content select="[slot=accion-vacio]"></ng-content>
        </div>
      } @else {
        <div class="contenido-datos">
          <ng-content></ng-content>
        </div>
      }
    </div>
  `,
  styles: [`
    .contenedor-datos {
      width: 100%;
      position: relative;
      background: #ffffff;
      border-radius: 0.875rem;
      border: 1px solid #e2e8f0;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
      overflow: hidden;
    }

    .estado-cargando,
    .estado-vacio,
    .estado-error {
      padding: 3.5rem 1.5rem;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }

    .spinner-grande {
      width: 2.75rem;
      height: 2.75rem;
      border: 3px solid #e2e8f0;
      border-top-color: #0f2744;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin-bottom: 1rem;
    }

    .texto-cargando {
      margin: 0;
      font-size: 0.9375rem;
      color: #64748b;
      font-weight: 500;
    }

    .icono-vacio,
    .icono-alerta {
      font-size: 3rem;
      line-height: 1;
      margin-bottom: 0.75rem;
    }

    .icono-vacio {
      color: #94a3b8;
    }

    .icono-alerta {
      color: #dc2626;
    }

    .titulo-vacio,
    .titulo-error {
      margin: 0;
      font-size: 1.125rem;
      font-weight: 700;
      color: #0f2744;
    }

    .mensaje-vacio,
    .detalle-error {
      margin: 0.375rem 0 1.25rem 0;
      font-size: 0.875rem;
      color: #64748b;
      max-width: 28rem;
    }

    .btn-reintentar {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      background: #0f2744;
      color: #ffffff;
      border: none;
      padding: 0.5rem 1rem;
      border-radius: 0.5rem;
      font-size: 0.875rem;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.15s;
    }
    .btn-reintentar:hover {
      background: #16365c;
    }

    .contenido-datos {
      width: 100%;
      overflow-x: auto;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `]
})
export class TablaResponsiva {
  readonly cargando = input<boolean>(false);
  readonly error = input<string | null>(null);
  readonly tituloError = input<string>('');
  readonly totalElementos = input<number>(0);
  readonly mensajeCargando = input<string>('Cargando registros...');
  readonly tituloVacio = input<string>('Sin resultados');
  readonly mensajeVacio = input<string>('No se encontraron registros para mostrar.');
  readonly iconoVacio = input<string>('inbox');
  readonly mostrarReintentar = input<boolean>(true);

  readonly reintentar = output<void>();
}

import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { EstadoPedido } from '../../core/models/enums';
import { InfoEstado, obtenerInfoEstado } from '../../core/utils/estados';

@Component({
  selector: 'app-badge-estado',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span
      class="badge-estado"
      [class]="'badge-' + estado()"
      [title]="info().descripcion"
    >
      <span class="material-icons badge-icono">{{ info().icono }}</span>
      <span class="badge-texto">{{ info().etiqueta }}</span>
    </span>
  `,
  styles: [`
    .badge-estado {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      padding: 0.25rem 0.625rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 600;
      letter-spacing: 0.025em;
      border-width: 1px;
      border-style: solid;
      white-space: nowrap;
      user-select: none;
      line-height: 1;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
    }

    .badge-icono {
      font-size: 0.95rem;
      width: 0.95rem;
      height: 0.95rem;
      line-height: 0.95rem;
    }

    .badge-texto {
      display: inline-block;
    }

    .badge-pendiente {
      background-color: #fef3c7;
      color: #92400e;
      border-color: #fde68a;
    }

    .badge-confirmado {
      background-color: #e0f2fe;
      color: #0369a1;
      border-color: #bae6fd;
    }

    .badge-despachado {
      background-color: #dcfce7;
      color: #15803d;
      border-color: #bbf7d0;
    }

    .badge-rechazado {
      background-color: #fee2e2;
      color: #b91c1c;
      border-color: #fecaca;
    }
  `]
})
export class BadgeEstado {
  readonly estado = input.required<EstadoPedido>();

  readonly info = computed<InfoEstado>(() => {
    return obtenerInfoEstado(this.estado());
  });
}

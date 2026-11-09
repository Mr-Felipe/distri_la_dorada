import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { PedidoService } from '../../core/services/pedido.service';
import { EstadoPedido } from '../../core/models/enums';
import { Pedido } from '../../core/models/pedido';
import { formatearCOP, formatearFecha, formatearNumeroPedido } from '../../core/utils/formato';
import { mapError } from '../../core/utils/errores';
import { TablaResponsiva } from '../../shared/tabla-responsiva/tabla-responsiva';
import { BadgeEstado } from '../../shared/badge-estado/badge-estado';

type FiltroEstadoTipo = 'todos' | EstadoPedido;

@Component({
  selector: 'app-pedidos-lista',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, TablaResponsiva, BadgeEstado],
  template: `
    <div class="modulo-header">
      <div class="modulo-titulos">
        <div class="kicker">Gestión Comercial</div>
        <h1 class="titulo-pagina">Pedidos y Despachos</h1>
        <p class="subtitulo-pagina">Seguimiento de pedidos por WhatsApp, confirmación y ciclo de despacho</p>
      </div>

      <div class="modulo-acciones">
        <a routerLink="/pedidos/nuevo" class="btn-nuevo-pedido">
          <span class="material-icons">add_shopping_cart</span>
          Nuevo Pedido
        </a>
      </div>
    </div>

    <!-- Barra de Filtros y Chips de Estado -->
    <div class="filtros-panel">
      <!-- Buscador -->
      <div class="buscador-caja">
        <span class="material-icons buscador-icono">search</span>
        <input
          type="text"
          [formControl]="controlBusqueda"
          placeholder="Buscar por cliente o número (ej. PED-2026-0005)..."
          class="buscador-input"
        />
        @if (terminoBusqueda()) {
          <button type="button" class="btn-limpiar" (click)="controlBusqueda.setValue('')">
            <span class="material-icons">close</span>
          </button>
        }
      </div>

      <!-- Chips de Estados (§8 / CU-05) -->
      <div class="chips-estados" role="tablist" aria-label="Filtrar por estado de pedido">
        @for (filtro of listaFiltros; track filtro.id) {
          <button
            type="button"
            class="chip-item"
            [class.chip-activo]="estadoSeleccionado() === filtro.id"
            [class]="'chip-' + filtro.id"
            (click)="seleccionarEstado(filtro.id)"
          >
            <span class="chip-label">{{ filtro.nombre }}</span>
          </button>
        }
      </div>
    </div>

    <!-- Tabla y Tarjetas de Pedidos -->
    <app-tabla-responsiva
      [cargando]="cargando()"
      [error]="errorCarga()"
      [totalElementos]="pedidosFiltrados().length"
      [mensajeCargando]="'Cargando pedidos de la distribuidora...'"
      [tituloVacio]="'No se encontraron pedidos'"
      [mensajeVacio]="terminoBusqueda() ? 'Sin coincidencias para la búsqueda.' : 'No hay pedidos con el estado seleccionado.'"
      [iconoVacio]="'receipt_long'"
      (reintentar)="cargarPedidos()"
    >
      <!-- Vista Desktop: Tabla de Pedidos -->
      <table class="tabla-dorada desktop-only">
        <thead>
          <tr>
            <th style="width: 12%">Número</th>
            <th style="width: 33%">Cliente</th>
            <th style="width: 15%" class="text-center">Estado</th>
            <th style="width: 18%" class="text-right">Total COP</th>
            <th style="width: 15%">Fecha</th>
            <th style="width: 7%" class="text-right">Detalle</th>
          </tr>
        </thead>
        <tbody>
          @for (pedido of pedidosFiltrados(); track pedido.id) {
            <tr class="fila-clicable" [routerLink]="['/pedidos', pedido.id]">
              <td>
                <span class="pedido-num font-mono">{{ formatearNumero(pedido.numero) }}</span>
              </td>
              <td>
                <div class="cliente-nombre">{{ pedido.cliente }}</div>
                @if (pedido.observacion) {
                  <div class="cliente-obs">{{ pedido.observacion }}</div>
                }
              </td>
              <td class="text-center">
                <app-badge-estado [estado]="pedido.estado"></app-badge-estado>
              </td>
              <td class="text-right font-mono total-valor">
                {{ formatearMoneda(pedido.total) }}
              </td>
              <td class="fecha-texto">
                {{ formatearFecha(pedido.creado_en) }}
              </td>
              <td class="text-right">
                <a [routerLink]="['/pedidos', pedido.id]" class="btn-ver-detalle" aria-label="Ver detalle del pedido">
                  <span class="material-icons">chevron_right</span>
                </a>
              </td>
            </tr>
          }
        </tbody>
      </table>

      <!-- Vista Móvil: Tarjetas Apiladas (Responsive §10) -->
      <div class="tarjetas-pedidos mobile-only">
        @for (pedido of pedidosFiltrados(); track pedido.id) {
          <div class="tarjeta-pedido" [routerLink]="['/pedidos', pedido.id]">
            <div class="tarjeta-pedido-top">
              <span class="pedido-num font-mono">{{ formatearNumero(pedido.numero) }}</span>
              <app-badge-estado [estado]="pedido.estado"></app-badge-estado>
            </div>

            <div class="tarjeta-cliente-bloque">
              <h3 class="tarjeta-cliente">{{ pedido.cliente }}</h3>
              @if (pedido.observacion) {
                <p class="tarjeta-obs">{{ pedido.observacion }}</p>
              }
            </div>

            <div class="tarjeta-pedido-footer">
              <div class="footer-col">
                <span class="footer-label">Total:</span>
                <span class="footer-total font-mono">{{ formatearMoneda(pedido.total) }}</span>
              </div>
              <div class="footer-col text-right">
                <span class="footer-label">Fecha:</span>
                <span class="footer-fecha">{{ formatearFecha(pedido.creado_en, false) }}</span>
              </div>
            </div>
          </div>
        }
      </div>
    </app-tabla-responsiva>
  `,
  styles: [`
    .modulo-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 1.5rem;
      margin-bottom: 1.5rem;
      flex-wrap: wrap;
    }

    .kicker {
      font-size: 0.75rem;
      text-transform: uppercase;
      font-weight: 800;
      letter-spacing: 0.08em;
      color: #b89326;
      margin-bottom: 0.25rem;
    }

    .titulo-pagina {
      font-size: 1.75rem;
      font-weight: 800;
      color: #0f2744;
      margin: 0;
      letter-spacing: -0.02em;
    }

    .subtitulo-pagina {
      margin: 0.25rem 0 0 0;
      font-size: 0.875rem;
      color: #64748b;
    }

    .btn-nuevo-pedido {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      background: linear-gradient(135deg, #d4af37 0%, #b89326 100%);
      color: #0a192f;
      padding: 0.65rem 1.25rem;
      border-radius: 0.625rem;
      font-weight: 800;
      font-size: 0.875rem;
      text-decoration: none;
      box-shadow: 0 2px 5px rgba(212, 175, 55, 0.3);
      transition: all 0.15s ease;
    }
    .btn-nuevo-pedido:hover {
      background: linear-gradient(135deg, #e5bd3d 0%, #c49c2a 100%);
      transform: translateY(-1px);
    }

    .filtros-panel {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 0.875rem;
      padding: 1rem 1.25rem;
      margin-bottom: 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 1rem;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
    }

    .buscador-caja {
      position: relative;
      display: flex;
      align-items: center;
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 0.5rem;
      padding: 0 0.75rem;
      width: 100%;
      box-sizing: border-box;
    }

    .buscador-icono {
      color: #94a3b8;
      font-size: 1.25rem;
      margin-right: 0.5rem;
    }

    .buscador-input {
      flex: 1;
      border: none;
      background: transparent;
      padding: 0.6rem 0;
      font-size: 0.875rem;
      color: #0f2744;
      outline: none;
      font-family: inherit;
    }

    .btn-limpiar {
      background: transparent;
      border: none;
      color: #94a3b8;
      cursor: pointer;
      display: flex;
      align-items: center;
    }

    .chips-estados {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
    }

    .chip-item {
      background: #f1f5f9;
      border: 1px solid #cbd5e1;
      color: #475569;
      border-radius: 9999px;
      padding: 0.35rem 0.875rem;
      font-size: 0.8125rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;
      font-family: inherit;
      user-select: none;
    }
    .chip-item:hover {
      background: #e2e8f0;
      color: #0f2744;
    }

    .chip-activo {
      background: #0f2744 !important;
      color: #ffffff !important;
      border-color: #0a192f !important;
      box-shadow: 0 1px 3px rgba(15, 39, 68, 0.2);
    }

    /* Tabla */
    .tabla-dorada {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
    }

    .tabla-dorada th {
      background: #f8fafc;
      padding: 0.875rem 1.25rem;
      font-size: 0.75rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #475569;
      border-bottom: 1px solid #e2e8f0;
    }

    .tabla-dorada td {
      padding: 1rem 1.25rem;
      border-bottom: 1px solid #f1f5f9;
      font-size: 0.875rem;
      color: #1e293b;
      vertical-align: middle;
    }

    .fila-clicable {
      cursor: pointer;
      transition: background 0.15s;
    }
    .fila-clicable:hover td {
      background-color: #f8fafc;
    }

    .pedido-num {
      display: inline-block;
      font-size: 0.875rem;
      font-weight: 800;
      color: #0f2744;
      background: #f8fafc;
      padding: 0.2rem 0.5rem;
      border-radius: 0.375rem;
      border: 1px solid #e2e8f0;
    }

    .cliente-nombre {
      font-weight: 700;
      color: #0f2744;
    }

    .cliente-obs {
      font-size: 0.75rem;
      color: #64748b;
      margin-top: 0.15rem;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 22rem;
    }

    .total-valor {
      font-weight: 800;
      color: #0f2744;
      font-size: 0.9375rem;
    }

    .fecha-texto {
      color: #64748b;
      font-size: 0.8125rem;
    }

    .btn-ver-detalle {
      color: #94a3b8;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 0.25rem;
      border-radius: 0.25rem;
    }
    .fila-clicable:hover .btn-ver-detalle {
      color: #0f2744;
    }

    /* Tarjetas Móvil */
    .desktop-only { display: table; }
    .mobile-only { display: none; }

    @media (max-width: 768px) {
      .desktop-only { display: none !important; }
      .mobile-only {
        display: flex !important;
        flex-direction: column;
        gap: 0.875rem;
        padding: 0.875rem;
      }

      .tarjeta-pedido {
        background: #ffffff;
        border: 1px solid #e2e8f0;
        border-radius: 0.75rem;
        padding: 1rem;
        cursor: pointer;
        transition: transform 0.15s, box-shadow 0.15s;
        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
      }
      .tarjeta-pedido:active {
        transform: scale(0.99);
      }

      .tarjeta-pedido-top {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 0.625rem;
      }

      .tarjeta-cliente {
        margin: 0;
        font-size: 1rem;
        font-weight: 700;
        color: #0f2744;
      }

      .tarjeta-obs {
        margin: 0.25rem 0 0 0;
        font-size: 0.75rem;
        color: #64748b;
      }

      .tarjeta-pedido-footer {
        margin-top: 0.875rem;
        padding-top: 0.625rem;
        border-top: 1px solid #f1f5f9;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .footer-label {
        display: block;
        font-size: 0.6875rem;
        color: #94a3b8;
        text-transform: uppercase;
      }

      .footer-total {
        font-size: 1rem;
        font-weight: 800;
        color: #0f2744;
      }

      .footer-fecha {
        font-size: 0.75rem;
        color: #64748b;
      }
    }

    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .font-mono { font-family: 'JetBrains Mono', monospace; }
  `]
})
export class PedidosListaComponent implements OnInit {
  private readonly pedidoService = inject(PedidoService);

  readonly pedidos = signal<Pedido[]>([]);
  readonly cargando = signal<boolean>(true);
  readonly errorCarga = signal<string | null>(null);

  readonly controlBusqueda = new FormControl<string>('', { nonNullable: true });
  readonly terminoBusqueda = signal<string>('');
  readonly estadoSeleccionado = signal<FiltroEstadoTipo>('todos');

  readonly listaFiltros: { id: FiltroEstadoTipo; nombre: string }[] = [
    { id: 'todos', nombre: 'Todos' },
    { id: 'pendiente', nombre: 'Pendientes' },
    { id: 'confirmado', nombre: 'Confirmados' },
    { id: 'despachado', nombre: 'Despachados' },
    { id: 'rechazado', nombre: 'Rechazados' }
  ];

  readonly pedidosFiltrados = computed(() => {
    const list = this.pedidos();
    const filtro = this.estadoSeleccionado();
    const query = this.terminoBusqueda().toLowerCase().trim();

    return list.filter(p => {
      if (filtro !== 'todos' && p.estado !== filtro) {
        return false;
      }
      if (!query) return true;

      const numStr = String(p.numero);
      const queryClean = query.replace('#', '');
      return p.cliente.toLowerCase().includes(query) || numStr.includes(queryClean);
    });
  });

  ngOnInit(): void {
    this.controlBusqueda.valueChanges.subscribe(v => this.terminoBusqueda.set(v ?? ''));
    this.cargarPedidos();
  }

  async cargarPedidos(): Promise<void> {
    this.cargando.set(true);
    this.errorCarga.set(null);
    try {
      const data = await this.pedidoService.listar();
      this.pedidos.set(data);
    } catch (err: unknown) {
      const appErr = mapError(err);
      this.errorCarga.set(appErr.mensaje);
    } finally {
      this.cargando.set(false);
    }
  }

  seleccionarEstado(estado: FiltroEstadoTipo): void {
    this.estadoSeleccionado.set(estado);
  }

  formatearNumero(num: string | number): string {
    return formatearNumeroPedido(num);
  }

  formatearMoneda(val: number): string {
    return formatearCOP(val);
  }

  formatearFecha(iso: string, conHora = true): string {
    return formatearFecha(iso, conHora);
  }
}

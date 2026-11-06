import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PedidoService } from '../../core/services/pedido.service';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { Pedido } from '../../core/models/pedido';
import { formatearCOP, formatearFecha, formatearNumeroPedido } from '../../core/utils/formato';
import { mapError } from '../../core/utils/errores';
import { BadgeEstado } from '../../shared/badge-estado/badge-estado';
import { BotonCargando } from '../../shared/boton-cargando/boton-cargando';
import { TablaResponsiva } from '../../shared/tabla-responsiva/tabla-responsiva';
import { Modal } from '../../shared/modal/modal';

@Component({
  selector: 'app-bodega',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, BadgeEstado, BotonCargando, TablaResponsiva, Modal],
  template: `
    <div class="bodega-container">
      <div class="modulo-header">
        <div class="modulo-titulos">
          <div class="kicker">Operación Logística</div>
          <h1 class="titulo-pagina">Bodega y Despachos</h1>
          <p class="subtitulo-pagina">Alistamiento de mercancía para pedidos confirmados y entrega final</p>
        </div>

        <div class="modulo-acciones">
          <button type="button" class="btn-refrescar" (click)="cargarPedidos()">
            <span class="material-icons">refresh</span>
            Actualizar lista
          </button>
        </div>
      </div>

      <!-- Selector de Pestañas: Confirmados (Por despachar) vs Pendientes (Solo Lectura) -->
      <div class="tabs-bodega">
        <button
          type="button"
          class="tab-btn"
          [class.tab-activo]="pestanaActiva() === 'confirmado'"
          (click)="cambiarPestana('confirmado')"
        >
          <span class="material-icons">inventory</span>
          <span>Pedidos por Despachar (Confirmados)</span>
          <span class="badge-contador">{{ conteoConfirmados() }}</span>
        </button>

        <button
          type="button"
          class="tab-btn"
          [class.tab-activo]="pestanaActiva() === 'pendiente'"
          (click)="cambiarPestana('pendiente')"
        >
          <span class="material-icons">pending_actions</span>
          <span>Sin Confirmar (Solo Lectura)</span>
        </button>
      </div>

      @if (pestanaActiva() === 'pendiente') {
        <div class="aviso-lectura">
          <span class="material-icons">info</span>
          <span>Estos pedidos están pendientes de aprobación comercial. Bodega no puede despacharlos hasta que sean confirmados.</span>
        </div>
      }

      <!-- Listado de Pedidos en Bodega -->
      <app-tabla-responsiva
        [cargando]="cargando()"
        [error]="errorCarga()"
        [totalElementos]="pedidosVisibles().length"
        [mensajeCargando]="'Consultando pedidos para despacho en bodega...'"
        [tituloVacio]="pestanaActiva() === 'confirmado' ? 'No hay pedidos pendientes de despacho' : 'No hay pedidos pendientes por confirmar'"
        [mensajeVacio]="pestanaActiva() === 'confirmado' ? 'Todos los pedidos confirmados han sido despachados de bodega.' : 'No existen pedidos en cola comercial.'"
        [iconoVacio]="'local_shipping'"
        (reintentar)="cargarPedidos()"
      >
        <div class="lista-despacho">
          @for (ped of pedidosVisibles(); track ped.id) {
            <div class="tarjeta-despacho">
              <div class="despacho-header">
                <div class="header-izq">
                  <span class="numero-pedido font-mono">{{ formatearNumero(ped.numero) }}</span>
                  <app-badge-estado [estado]="ped.estado"></app-badge-estado>
                  <span class="cliente-nombre">{{ ped.cliente }}</span>
                </div>

                <div class="header-der">
                  <span class="fecha-etiqueta font-mono">
                    {{ formatearFecha(ped.confirmado_en || ped.creado_en) }}
                  </span>

                  @if (pestanaActiva() === 'confirmado' && auth.puedeDespacharPedido()) {
                    <app-boton-cargando
                      [variante]="'exito'"
                      [tamano]="'sm'"
                      [cargando]="despachandoId() === ped.id"
                      [icono]="'local_shipping'"
                      [textoCargando]="'Despachando...'"
                      (accionar)="abrirConfirmarDespacho(ped)"
                    >
                      Despachar
                    </app-boton-cargando>
                  }

                  <a [routerLink]="['/pedidos', ped.id]" class="btn-ver-orden" title="Ver pedido completo">
                    <span class="material-icons">open_in_new</span>
                  </a>
                </div>
              </div>

              @if (ped.observacion) {
                <div class="despacho-obs">
                  <span class="material-icons">notes</span>
                  <span>{{ ped.observacion }}</span>
                </div>
              }

              <!-- Detalle expandible de ítems de bodega -->
              <div class="items-bodega-panel">
                <div class="items-bodega-header">
                  <button
                    type="button"
                    class="btn-toggle-items"
                    (click)="toggleExpandir(ped.id)"
                  >
                    <span class="material-icons">{{ estaExpandido(ped.id) ? 'expand_less' : 'expand_more' }}</span>
                    <span>{{ estaExpandido(ped.id) ? 'Ocultar ítems a alistar' : 'Ver productos a alistar (' + (ped.items?.length || 0) + ')' }}</span>
                  </button>

                  <span class="total-pedido-resumen font-mono">
                    Total: {{ formatearMoneda(ped.total) }}
                  </span>
                </div>

                @if (estaExpandido(ped.id)) {
                  <div class="items-tabla-wrap">
                    <table class="tabla-items-bodega">
                      <thead>
                        <tr>
                          <th>Referencia</th>
                          <th>Producto</th>
                          <th class="text-center">Cantidad a entregar</th>
                        </tr>
                      </thead>
                      <tbody>
                        @for (it of ped.items; track it.id) {
                          <tr>
                            <td>
                              <span class="codigo-ref font-mono">{{ it.producto?.referencia || '—' }}</span>
                            </td>
                            <td>
                              <strong>{{ it.producto?.nombre || 'Producto' }}</strong>
                            </td>
                            <td class="text-center font-mono font-bold valor-alistar">
                              {{ it.cantidad }} unidades
                            </td>
                          </tr>
                        }
                      </tbody>
                    </table>
                  </div>
                }
              </div>
            </div>
          }
        </div>
      </app-tabla-responsiva>
    </div>

    <!-- Modal Confirmar Despacho -->
    <app-modal
      [abierto]="modalDespachoAbierto()"
      [titulo]="'Confirmar Despacho de Mercancía'"
      [icono]="'local_shipping'"
      [tamano]="'sm'"
      (cerrar)="cerrarConfirmarDespacho()"
    >
      @if (pedidoADespachar(); as p) {
        <div class="modal-despacho-body">
          <p>
            ¿Confirmas la entrega y salida física de la mercancía para el pedido
            <strong class="font-mono">{{ formatearNumero(p.numero) }}</strong> de
            <strong>{{ p.cliente }}</strong>?
          </p>
          <p class="nota-despacho">
            El pedido pasará inmediatamente a estado <strong>Despachado</strong> y quedará registrado con la fecha y hora actual.
          </p>
        </div>
      }

      <div slot="footer" class="modal-btns">
        <app-boton-cargando
          [variante]="'secundario'"
          (accionar)="cerrarConfirmarDespacho()"
        >
          Cancelar
        </app-boton-cargando>

        <app-boton-cargando
          [variante]="'exito'"
          [cargando]="guardandoDespacho()"
          [icono]="'check'"
          [textoCargando]="'Registrando...'"
          (accionar)="ejecutarDespacho()"
        >
          Confirmar Despacho
        </app-boton-cargando>
      </div>
    </app-modal>
  `,
  styles: [`
    .bodega-container {
      max-width: 60rem;
      margin: 0 auto;
      padding-bottom: 3.5rem;
    }

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

    .btn-refrescar {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      background: #f1f5f9;
      color: #0f2744;
      border: 1px solid #cbd5e1;
      padding: 0.5rem 1rem;
      border-radius: 0.5rem;
      font-size: 0.8125rem;
      font-weight: 700;
      cursor: pointer;
      transition: background 0.15s;
    }
    .btn-refrescar:hover {
      background: #e2e8f0;
    }

    .tabs-bodega {
      display: flex;
      gap: 0.5rem;
      margin-bottom: 1.25rem;
      border-bottom: 2px solid #e2e8f0;
      padding-bottom: 0.5rem;
      flex-wrap: wrap;
    }

    .tab-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      background: transparent;
      border: none;
      color: #64748b;
      padding: 0.65rem 1rem;
      font-size: 0.875rem;
      font-weight: 700;
      border-radius: 0.5rem;
      cursor: pointer;
      transition: all 0.15s ease;
      font-family: inherit;
    }
    .tab-btn:hover {
      background: #f1f5f9;
      color: #0f2744;
    }

    .tab-activo {
      background: #0f2744 !important;
      color: #ffffff !important;
    }

    .badge-contador {
      background: #b89326;
      color: #ffffff;
      padding: 0.1rem 0.45rem;
      border-radius: 9999px;
      font-size: 0.75rem;
    }
    .tab-activo .badge-contador {
      background: #d4af37;
      color: #0a192f;
      font-weight: 800;
    }

    .aviso-lectura {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-left: 4px solid #64748b;
      border-radius: 0.5rem;
      padding: 0.75rem 1rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.875rem;
      color: #475569;
      margin-bottom: 1.25rem;
    }

    .lista-despacho {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      padding: 1rem;
    }

    .tarjeta-despacho {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 0.875rem;
      padding: 1.25rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
      display: flex;
      flex-direction: column;
      gap: 0.875rem;
    }

    .despacho-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
      flex-wrap: wrap;
    }

    .header-izq {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      flex-wrap: wrap;
    }

    .numero-pedido {
      font-size: 1.125rem;
      font-weight: 800;
      color: #0f2744;
      background: #f8fafc;
      padding: 0.2rem 0.5rem;
      border-radius: 0.375rem;
      border: 1px solid #e2e8f0;
    }

    .cliente-nombre {
      font-size: 1.05rem;
      font-weight: 700;
      color: #0f2744;
    }

    .header-der {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .fecha-etiqueta {
      font-size: 0.8125rem;
      color: #64748b;
    }

    .btn-ver-orden {
      color: #94a3b8;
      display: flex;
      align-items: center;
      padding: 0.35rem;
      border-radius: 0.375rem;
      transition: all 0.15s;
    }
    .btn-ver-orden:hover {
      background: #f1f5f9;
      color: #0f2744;
    }

    .despacho-obs {
      display: flex;
      align-items: center;
      gap: 0.375rem;
      font-size: 0.8125rem;
      color: #64748b;
      background: #f8fafc;
      padding: 0.35rem 0.75rem;
      border-radius: 0.375rem;
    }
    .despacho-obs .material-icons {
      font-size: 1rem;
    }

    .items-bodega-panel {
      background: #fdfdfd;
      border: 1px solid #f1f5f9;
      border-radius: 0.5rem;
      overflow: hidden;
    }

    .items-bodega-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.5rem 0.75rem;
      background: #f8fafc;
    }

    .btn-toggle-items {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      background: transparent;
      border: none;
      color: #0f2744;
      font-size: 0.8125rem;
      font-weight: 700;
      cursor: pointer;
    }

    .total-pedido-resumen {
      font-size: 0.875rem;
      font-weight: 800;
      color: #0f2744;
    }

    .items-tabla-wrap {
      padding: 0.75rem;
    }

    .tabla-items-bodega {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.8125rem;
    }

    .tabla-items-bodega th {
      text-align: left;
      padding: 0.4rem 0.6rem;
      color: #64748b;
      font-size: 0.7rem;
      text-transform: uppercase;
      border-bottom: 1px solid #e2e8f0;
    }

    .tabla-items-bodega td {
      padding: 0.5rem 0.6rem;
      border-bottom: 1px solid #f1f5f9;
      color: #1e293b;
    }

    .codigo-ref {
      font-size: 0.75rem;
      padding: 0.15rem 0.35rem;
      background: #f1f5f9;
      border-radius: 0.25rem;
    }

    .valor-alistar {
      color: #059669;
      font-size: 0.9375rem;
    }

    .modal-despacho-body {
      font-size: 0.9375rem;
      color: #334155;
      line-height: 1.5;
    }

    .nota-despacho {
      font-size: 0.8125rem;
      color: #64748b;
      margin-top: 0.5rem;
    }

    .modal-btns {
      display: flex;
      gap: 0.75rem;
    }

    .font-mono { font-family: 'JetBrains Mono', monospace; }
    .font-bold { font-weight: 700; }
    .text-center { text-align: center; }
  `]
})
export class BodegaComponent implements OnInit {
  private readonly pedidoService = inject(PedidoService);
  readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);

  readonly pestanaActiva = signal<'confirmado' | 'pendiente'>('confirmado');
  readonly pedidos = signal<Pedido[]>([]);
  readonly cargando = signal<boolean>(true);
  readonly errorCarga = signal<string | null>(null);

  // Set of expanded item IDs
  readonly expandidos = signal<Set<string>>(new Set());

  // Despacho modal
  readonly modalDespachoAbierto = signal<boolean>(false);
  readonly pedidoADespachar = signal<Pedido | null>(null);
  readonly guardandoDespacho = signal<boolean>(false);
  readonly despachandoId = signal<string | null>(null);

  get conteoConfirmados(): () => number {
    return () => this.pedidos().filter(p => p.estado === 'confirmado').length;
  }

  get pedidosVisibles(): () => Pedido[] {
    return () => this.pedidos().filter(p => p.estado === this.pestanaActiva());
  }

  ngOnInit(): void {
    this.cargarPedidos();
  }

  async cargarPedidos(): Promise<void> {
    this.cargando.set(true);
    this.errorCarga.set(null);
    try {
      // Traer todos los pedidos recientes para tener confirmados y pendientes
      const lista = await this.pedidoService.listar();
      
      // Enriquecer con sus ítems
      const enriquecidos = await Promise.all(
        lista.slice(0, 30).map(async (ped) => {
          try {
            return await this.pedidoService.obtenerPorId(ped.id);
          } catch {
            return ped;
          }
        })
      );

      this.pedidos.set(enriquecidos);
      // Por defecto expandir los primeros confirmados
      const initialSet = new Set<string>();
      enriquecidos.filter(p => p.estado === 'confirmado').slice(0, 3).forEach(p => initialSet.add(p.id));
      this.expandidos.set(initialSet);
    } catch (err: unknown) {
      const appErr = mapError(err);
      this.errorCarga.set(appErr.mensaje);
    } finally {
      this.cargando.set(false);
    }
  }

  cambiarPestana(tab: 'confirmado' | 'pendiente'): void {
    this.pestanaActiva.set(tab);
  }

  formatearNumero(num: number): string {
    return formatearNumeroPedido(num);
  }

  formatearMoneda(val: number): string {
    return formatearCOP(val);
  }

  formatearFecha(iso: string | null | undefined): string {
    return formatearFecha(iso, true);
  }

  estaExpandido(id: string): boolean {
    return this.expandidos().has(id);
  }

  toggleExpandir(id: string): void {
    const s = new Set(this.expandidos());
    if (s.has(id)) {
      s.delete(id);
    } else {
      s.add(id);
    }
    this.expandidos.set(s);
  }

  abrirConfirmarDespacho(pedido: Pedido): void {
    this.pedidoADespachar.set(pedido);
    this.modalDespachoAbierto.set(true);
  }

  cerrarConfirmarDespacho(): void {
    this.modalDespachoAbierto.set(false);
    this.pedidoADespachar.set(null);
  }

  async ejecutarDespacho(): Promise<void> {
    const p = this.pedidoADespachar();
    if (!p) return;

    this.guardandoDespacho.set(true);
    this.despachandoId.set(p.id);

    try {
      await this.pedidoService.despacharPedido(p.id);
      this.toast.exito(`Pedido #${p.numero} despachado exitosamente.`);
      this.cerrarConfirmarDespacho();
      await this.cargarPedidos();
    } catch (err: unknown) {
      const appErr = mapError(err);
      this.toast.error(appErr.mensaje);
    } finally {
      this.guardandoDespacho.set(false);
      this.despachandoId.set(null);
    }
  }
}

import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ResumenService } from '../../core/services/resumen.service';
import { ResumenEstado } from '../../core/models/pedido';
import { EstadoPedido } from '../../core/models/enums';
import { formatearCOP } from '../../core/utils/formato';
import { mapError } from '../../core/utils/errores';
import { ESTADOS_PEDIDO_INFO } from '../../core/utils/estados';
import { TablaResponsiva } from '../../shared/tabla-responsiva/tabla-responsiva';

@Component({
  selector: 'app-resumen',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, TablaResponsiva],
  template: `
    <div class="resumen-container">
      <div class="modulo-header">
        <div class="modulo-titulos">
          <div class="kicker">Métricas y Analítica</div>
          <h1 class="titulo-pagina">Resumen General por Estado</h1>
          <p class="subtitulo-pagina">
            Balance consolidado de pedidos y montos en COP según la vista operativa en servidor
          </p>
        </div>

        <div class="modulo-acciones">
          <button type="button" class="btn-refrescar" (click)="cargarResumen()">
            <span class="material-icons">refresh</span>
            Actualizar datos
          </button>
        </div>
      </div>

      <!-- Tarjeta Gran Total Consolidado -->
      <div class="gran-total-card">
        <div class="gran-total-izq">
          <div class="icono-balance">
            <span class="material-icons">account_balance_wallet</span>
          </div>
          <div>
            <span class="gran-total-label">Volumen Total Procesado</span>
            <div class="gran-total-valor font-mono">{{ formatearMoneda(totalMontoGeneral()) }}</div>
          </div>
        </div>

        <div class="gran-total-der">
          <div class="stat-pildora">
            <span class="stat-num font-mono">{{ totalPedidosGeneral() }}</span>
            <span class="stat-txt">Pedidos registrados en el sistema</span>
          </div>
        </div>
      </div>

      <!-- Grid de Tarjetas por Estado (§8 / CU-07) -->
      <div class="grid-estados">
        @for (item of estadosMostrados(); track item.estado) {
          @let meta = obtenerMeta(item.estado);
          <div class="tarjeta-estado" [class]="'borde-' + item.estado">
            <div class="estado-card-top">
              <div class="estado-icono-circulo" [class]="'icono-' + item.estado">
                <span class="material-icons">{{ meta.icono }}</span>
              </div>
              <span class="estado-titulo" [class]="'texto-' + item.estado">{{ meta.etiqueta }}</span>
            </div>

            <div class="estado-metrica-cuerpo">
              <div class="metrica-conteo">
                <span class="conteo-num font-mono">{{ item.pedidos }}</span>
                <span class="conteo-etiqueta">pedidos</span>
              </div>

              <div class="metrica-monto">
                <span class="monto-etiqueta">Total acumulado:</span>
                <span class="monto-valor font-mono">{{ formatearMoneda(item.valor) }}</span>
              </div>
            </div>

            <div class="estado-card-footer">
              <span class="estado-desc">{{ meta.descripcion }}</span>
              <a [routerLink]="['/pedidos']" class="link-ver-estado">
                Ver lista
                <span class="material-icons">arrow_forward</span>
              </a>
            </div>
          </div>
        }
      </div>

      <!-- Tabla Comparativa Detallada -->
      <div class="tabla-resumen-card mt-6">
        <div class="tabla-resumen-header">
          <h2 class="subtitulo-seccion">Desglose Operativo y Financiero</h2>
          <span class="badge-origen font-mono">vw_resumen_por_estado / RPC</span>
        </div>

        <app-tabla-responsiva
          [cargando]="cargando()"
          [error]="errorCarga()"
          [totalElementos]="resumenData().length"
          [mensajeCargando]="'Calculando balance en servidor...'"
          (reintentar)="cargarResumen()"
        >
          <table class="tabla-dorada">
            <thead>
              <tr>
                <th style="width: 25%">Estado Operativo</th>
                <th style="width: 20%" class="text-center">Total Pedidos</th>
                <th style="width: 25%" class="text-right">Monto Total COP</th>
                <th style="width: 30%" class="text-right">% Participación Valor</th>
              </tr>
            </thead>
            <tbody>
              @for (row of estadosMostrados(); track row.estado) {
                @let meta = obtenerMeta(row.estado);
                <tr>
                  <td>
                    <div class="estado-celda">
                      <span class="material-icons" [class]="'texto-' + row.estado">{{ meta.icono }}</span>
                      <strong>{{ meta.etiqueta }}</strong>
                    </div>
                  </td>
                  <td class="text-center font-mono font-bold">{{ row.pedidos }}</td>
                  <td class="text-right font-mono font-bold">{{ formatearMoneda(row.valor) }}</td>
                  <td class="text-right font-mono">
                    <div class="porcentaje-wrap">
                      <div class="barra-fondo">
                        <div
                          class="barra-progreso"
                          [class]="'barra-' + row.estado"
                          [style.width.%]="calcularPorcentaje(row.valor)"
                        ></div>
                      </div>
                      <span class="porcentaje-texto">{{ calcularPorcentaje(row.valor) }}%</span>
                    </div>
                  </td>
                </tr>
              }
            </tbody>
            <tfoot>
              <tr class="fila-total-footer">
                <td><strong>TOTAL CONSOLIDADO</strong></td>
                <td class="text-center font-mono font-bold">{{ totalPedidosGeneral() }}</td>
                <td class="text-right font-mono font-bold total-dorado">{{ formatearMoneda(totalMontoGeneral()) }}</td>
                <td class="text-right font-mono font-bold">100.0%</td>
              </tr>
            </tfoot>
          </table>
        </app-tabla-responsiva>
      </div>
    </div>
  `,
  styles: [`
    .resumen-container {
      max-width: 64rem;
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
    }
    .btn-refrescar:hover {
      background: #e2e8f0;
    }

    /* Gran Total Card */
    .gran-total-card {
      background: linear-gradient(135deg, #0f2744 0%, #0a192f 100%);
      color: #ffffff;
      border-radius: 1rem;
      padding: 1.75rem 2rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1.5rem;
      margin-bottom: 1.75rem;
      box-shadow: 0 10px 20px -5px rgba(15, 39, 68, 0.3);
      flex-wrap: wrap;
    }

    .gran-total-izq {
      display: flex;
      align-items: center;
      gap: 1.25rem;
    }

    .icono-balance {
      width: 3.5rem;
      height: 3.5rem;
      border-radius: 0.75rem;
      background: rgba(212, 175, 55, 0.2);
      border: 1px solid rgba(212, 175, 55, 0.4);
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .icono-balance .material-icons {
      font-size: 2rem;
      color: #d4af37;
    }

    .gran-total-label {
      display: block;
      font-size: 0.8125rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #94a3b8;
      margin-bottom: 0.25rem;
    }

    .gran-total-valor {
      font-size: 2.125rem;
      font-weight: 900;
      color: #ffffff;
      line-height: 1;
    }

    .stat-pildora {
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.15);
      padding: 0.625rem 1.25rem;
      border-radius: 0.75rem;
      text-align: right;
    }

    .stat-num {
      display: block;
      font-size: 1.5rem;
      font-weight: 800;
      color: #d4af37;
    }

    .stat-txt {
      font-size: 0.75rem;
      color: #cbd5e1;
    }

    /* Grid de Estados */
    .grid-estados {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(14.5rem, 1fr));
      gap: 1.25rem;
      margin-bottom: 1.75rem;
    }

    .tarjeta-estado {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 1rem;
      padding: 1.25rem;
      display: flex;
      flex-direction: column;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
      border-top-width: 4px;
    }

    .borde-pendiente { border-top-color: #d97706; }
    .borde-confirmado { border-top-color: #2563eb; }
    .borde-despachado { border-top-color: #059669; }
    .borde-rechazado { border-top-color: #dc2626; }

    .estado-card-top {
      display: flex;
      align-items: center;
      gap: 0.625rem;
      margin-bottom: 1rem;
    }

    .estado-icono-circulo {
      width: 2.25rem;
      height: 2.25rem;
      border-radius: 0.5rem;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .icono-pendiente { background: #fef3c7; color: #b45309; }
    .icono-confirmado { background: #dbeafe; color: #1d4ed8; }
    .icono-despachado { background: #d1fae5; color: #047857; }
    .icono-rechazado { background: #fee2e2; color: #b91c1c; }

    .estado-titulo {
      font-size: 1rem;
      font-weight: 800;
      text-transform: capitalize;
    }
    .texto-pendiente { color: #b45309; }
    .texto-confirmado { color: #1d4ed8; }
    .texto-despachado { color: #047857; }
    .texto-rechazado { color: #b91c1c; }

    .estado-metrica-cuerpo {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 0.625rem;
      margin-bottom: 1rem;
    }

    .metrica-conteo {
      display: flex;
      align-items: baseline;
      gap: 0.375rem;
    }

    .conteo-num {
      font-size: 2rem;
      font-weight: 900;
      color: #0f2744;
      line-height: 1;
    }

    .conteo-etiqueta {
      font-size: 0.8125rem;
      color: #64748b;
      font-weight: 600;
    }

    .metrica-monto {
      background: #f8fafc;
      padding: 0.5rem 0.625rem;
      border-radius: 0.375rem;
      border: 1px solid #f1f5f9;
    }

    .monto-etiqueta {
      display: block;
      font-size: 0.6875rem;
      color: #64748b;
      text-transform: uppercase;
      font-weight: 600;
    }

    .monto-valor {
      font-size: 1.125rem;
      font-weight: 800;
      color: #0f2744;
    }

    .estado-card-footer {
      padding-top: 0.75rem;
      border-top: 1px solid #f1f5f9;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .estado-desc {
      font-size: 0.75rem;
      color: #64748b;
      line-height: 1.3;
    }

    .link-ver-estado {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      font-size: 0.75rem;
      font-weight: 700;
      color: #0f2744;
      text-decoration: none;
    }
    .link-ver-estado .material-icons {
      font-size: 0.95rem;
    }

    /* Tabla Desglose */
    .tabla-resumen-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 1rem;
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
    }

    .tabla-resumen-header {
      padding: 1.25rem 1.5rem;
      background: #f8fafc;
      border-bottom: 1px solid #e2e8f0;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .subtitulo-seccion {
      font-size: 1.125rem;
      font-weight: 800;
      color: #0f2744;
      margin: 0;
    }

    .badge-origen {
      font-size: 0.75rem;
      background: #e2e8f0;
      color: #475569;
      padding: 0.2rem 0.5rem;
      border-radius: 0.25rem;
    }

    .tabla-dorada {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
    }

    .tabla-dorada th {
      padding: 0.875rem 1.5rem;
      font-size: 0.75rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #475569;
      border-bottom: 1px solid #e2e8f0;
      background: #ffffff;
    }

    .tabla-dorada td {
      padding: 1rem 1.5rem;
      border-bottom: 1px solid #f1f5f9;
      font-size: 0.875rem;
      color: #1e293b;
      vertical-align: middle;
    }

    .estado-celda {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .estado-celda .material-icons {
      font-size: 1.25rem;
    }

    .porcentaje-wrap {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 0.75rem;
    }

    .barra-fondo {
      width: 6rem;
      height: 0.5rem;
      background: #e2e8f0;
      border-radius: 9999px;
      overflow: hidden;
    }

    .barra-progreso {
      height: 100%;
      border-radius: 9999px;
    }
    .barra-pendiente { background: #d97706; }
    .barra-confirmado { background: #2563eb; }
    .barra-despachado { background: #059669; }
    .barra-rechazado { background: #dc2626; }

    .porcentaje-texto {
      width: 3rem;
      text-align: right;
      font-size: 0.8125rem;
      color: #64748b;
    }

    .fila-total-footer td {
      background: #f8fafc;
      border-top: 2px solid #cbd5e1;
      padding: 1.15rem 1.5rem;
    }

    .total-dorado {
      color: #b89326;
      font-size: 1.125rem;
    }

    .mt-6 { margin-top: 1.5rem; }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .font-mono { font-family: 'JetBrains Mono', monospace; }
    .font-bold { font-weight: 700; }
  `]
})
export class ResumenComponent implements OnInit {
  private readonly resumenService = inject(ResumenService);

  readonly resumenData = signal<ResumenEstado[]>([]);
  readonly cargando = signal<boolean>(true);
  readonly errorCarga = signal<string | null>(null);

  // Asegurar que los 4 estados canónicos siempre se representen en orden comercial
  readonly estadosMostrados = computed<ResumenEstado[]>(() => {
    const raw = this.resumenData();
    const estadosCanonicos: EstadoPedido[] = ['pendiente', 'confirmado', 'despachado', 'rechazado'];

    return estadosCanonicos.map(est => {
      const encontrado = raw.find(r => r.estado === est);
      return {
        estado: est,
        pedidos: encontrado ? Number(encontrado.pedidos) : 0,
        valor: encontrado ? Number(encontrado.valor) : 0
      };
    });
  });

  readonly totalPedidosGeneral = computed(() => {
    return this.estadosMostrados().reduce((acc, curr) => acc + curr.pedidos, 0);
  });

  readonly totalMontoGeneral = computed(() => {
    return this.estadosMostrados().reduce((acc, curr) => acc + curr.valor, 0);
  });

  ngOnInit(): void {
    this.cargarResumen();
  }

  async cargarResumen(): Promise<void> {
    this.cargando.set(true);
    this.errorCarga.set(null);
    try {
      const data = await this.resumenService.obtenerResumen();
      this.resumenData.set(data);
    } catch (err: unknown) {
      const appErr = mapError(err);
      this.errorCarga.set(appErr.mensaje);
    } finally {
      this.cargando.set(false);
    }
  }

  obtenerMeta(estado: EstadoPedido) {
    return ESTADOS_PEDIDO_INFO[estado] || {
      etiqueta: estado,
      icono: 'info',
      descripcion: ''
    };
  }

  formatearMoneda(val: number): string {
    return formatearCOP(val);
  }

  calcularPorcentaje(monto: number): string {
    const total = this.totalMontoGeneral();
    if (total <= 0) return '0.0';
    return ((monto / total) * 100).toFixed(1);
  }
}

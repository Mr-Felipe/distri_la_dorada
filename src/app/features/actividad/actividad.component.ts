import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { AuditoriaService } from '../../core/services/auditoria.service';
import { AuditoriaRegistro } from '../../core/models/auditoria';
import { formatearFecha } from '../../core/utils/formato';
import { mapError } from '../../core/utils/errores';
import { TablaResponsiva } from '../../shared/tabla-responsiva/tabla-responsiva';
import { Modal } from '../../shared/modal/modal';

@Component({
  selector: 'app-actividad',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TablaResponsiva, Modal],
  template: `
    <div class="actividad-container">
      <div class="modulo-header">
        <div class="modulo-titulos">
          <div class="kicker">Seguridad y Trazabilidad</div>
          <h1 class="titulo-pagina">Registro de Auditoría</h1>
          <p class="subtitulo-pagina">
            Trazabilidad de modificaciones en la base de datos (últimos 50 eventos registrados en Supabase)
          </p>
        </div>

        <div class="modulo-acciones">
          <button type="button" class="btn-refrescar" (click)="cargarAuditoria()">
            <span class="material-icons">refresh</span>
            Actualizar registros
          </button>
        </div>
      </div>

      <app-tabla-responsiva
        [cargando]="cargando()"
        [error]="errorCarga()"
        [totalElementos]="registros().length"
        [mensajeCargando]="'Consultando historial de auditoría...'"
        [tituloVacio]="'No hay registros de auditoría'"
        [mensajeVacio]="'Aún no se han capturado eventos en la tabla de auditoría.'"
        [iconoVacio]="'history'"
        (reintentar)="cargarAuditoria()"
      >
        <table class="tabla-dorada">
          <thead>
            <tr>
              <th style="width: 18%">Fecha y Hora</th>
              <th style="width: 15%">Acción</th>
              <th style="width: 17%">Tabla</th>
              <th style="width: 18%">Usuario / Rol</th>
              <th style="width: 20%">ID Registro</th>
              <th style="width: 12%" class="text-right">Payload</th>
            </tr>
          </thead>
          <tbody>
            @for (item of registros(); track item.id) {
              <tr>
                <td class="font-mono text-sm">
                  {{ formatearFecha(item.creado_en) }}
                </td>
                <td>
                  <span
                    class="badge-accion"
                    [class]="'accion-' + item.accion.toLowerCase()"
                  >
                    {{ item.accion }}
                  </span>
                </td>
                <td>
                  <span class="tabla-pill font-mono">{{ item.tabla }}</span>
                </td>
                <td>
                  <div class="usuario-col">
                    <span class="usuario-id font-mono">{{ recortarId(item.usuario_id) }}</span>
                    @if (item.usuario_rol) {
                      <span class="usuario-rol-badge">{{ item.usuario_rol }}</span>
                    }
                  </div>
                </td>
                <td class="font-mono text-sm text-muted">
                  {{ recortarId(item.registro_id) }}
                </td>
                <td class="text-right">
                  @if (item.datos_antes || item.datos_despues) {
                    <button
                      type="button"
                      class="btn-ver-json"
                      (click)="abrirDetalleJson(item)"
                      title="Ver JSON con datos antes y después"
                    >
                      <span class="material-icons">data_object</span>
                      Ver JSON
                    </button>
                  } @else {
                    <span class="text-muted">—</span>
                  }
                </td>
              </tr>
            }
          </tbody>
        </table>
      </app-tabla-responsiva>
    </div>

    <!-- Modal Detalle JSON (Auditoría) -->
    <app-modal
      [abierto]="modalJsonAbierto()"
      [titulo]="'Detalle de Auditoría #' + registroSeleccionado()?.id"
      [icono]="'code'"
      [tamano]="'lg'"
      (cerrar)="cerrarModalJson()"
    >
      @if (registroSeleccionado(); as reg) {
        <div class="modal-json-contenido">
          <div class="meta-row">
            <div><strong>Tabla:</strong> <code>{{ reg.tabla }}</code></div>
            <div><strong>Acción:</strong> <span class="badge-accion font-mono">{{ reg.accion }}</span></div>
            <div><strong>Fecha:</strong> {{ formatearFecha(reg.creado_en) }}</div>
          </div>

          @if (reg.datos_antes) {
            <div class="json-bloque">
              <h4 class="json-titulo titulo-antes">
                <span class="material-icons">history</span>
                Datos Antes (Estado Previo)
              </h4>
              <pre class="json-pre"><code>{{ formatearJson(reg.datos_antes) }}</code></pre>
            </div>
          }

          @if (reg.datos_despues) {
            <div class="json-bloque">
              <h4 class="json-titulo titulo-despues">
                <span class="material-icons">check_circle</span>
                Datos Después (Estado Resultante)
              </h4>
              <pre class="json-pre"><code>{{ formatearJson(reg.datos_despues) }}</code></pre>
            </div>
          }
        </div>
      }

      <div slot="footer">
        <button type="button" class="btn-cerrar-modal" (click)="cerrarModalJson()">
          Cerrar
        </button>
      </div>
    </app-modal>
  `,
  styles: [`
    .actividad-container {
      max-width: 68rem;
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
      padding: 0.875rem 1.25rem;
      border-bottom: 1px solid #f1f5f9;
      font-size: 0.875rem;
      color: #1e293b;
      vertical-align: middle;
    }

    .badge-accion {
      display: inline-block;
      padding: 0.2rem 0.55rem;
      border-radius: 0.25rem;
      font-size: 0.75rem;
      font-weight: 800;
      letter-spacing: 0.05em;
    }
    .accion-insert {
      background: #dcfce7;
      color: #15803d;
      border: 1px solid #bbf7d0;
    }
    .accion-update {
      background: #e0f2fe;
      color: #0369a1;
      border: 1px solid #bae6fd;
    }
    .accion-delete {
      background: #fee2e2;
      color: #b91c1c;
      border: 1px solid #fecaca;
    }

    .tabla-pill {
      background: #f1f5f9;
      color: #0f2744;
      padding: 0.2rem 0.5rem;
      border-radius: 0.375rem;
      font-size: 0.8125rem;
      font-weight: 600;
    }

    .usuario-col {
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
    }

    .usuario-id {
      font-size: 0.8125rem;
      color: #1e293b;
    }

    .usuario-rol-badge {
      font-size: 0.6875rem;
      text-transform: uppercase;
      font-weight: 700;
      color: #64748b;
    }

    .btn-ver-json {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      color: #0f2744;
      padding: 0.3rem 0.65rem;
      border-radius: 0.375rem;
      font-size: 0.75rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s;
    }
    .btn-ver-json:hover {
      background: #0f2744;
      color: #ffffff;
    }
    .btn-ver-json .material-icons {
      font-size: 1rem;
    }

    /* Modal JSON */
    .modal-json-contenido {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }

    .meta-row {
      display: flex;
      gap: 1.5rem;
      padding-bottom: 0.75rem;
      border-bottom: 1px solid #e2e8f0;
      font-size: 0.875rem;
      color: #475569;
      flex-wrap: wrap;
    }

    .json-bloque {
      display: flex;
      flex-direction: column;
      gap: 0.375rem;
    }

    .json-titulo {
      margin: 0;
      font-size: 0.8125rem;
      font-weight: 700;
      display: flex;
      align-items: center;
      gap: 0.375rem;
    }
    .titulo-antes { color: #b45309; }
    .titulo-despues { color: #047857; }
    .json-titulo .material-icons { font-size: 1rem; }

    .json-pre {
      background: #0a192f;
      color: #f8fafc;
      padding: 1rem;
      border-radius: 0.5rem;
      overflow-x: auto;
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.75rem;
      line-height: 1.45;
      margin: 0;
      max-height: 18rem;
    }

    .btn-cerrar-modal {
      background: #f1f5f9;
      border: 1px solid #cbd5e1;
      padding: 0.5rem 1rem;
      border-radius: 0.5rem;
      font-weight: 600;
      color: #334155;
      cursor: pointer;
    }
    .btn-cerrar-modal:hover {
      background: #e2e8f0;
      color: #0f2744;
    }

    .text-sm { font-size: 0.8125rem; }
    .text-muted { color: #94a3b8; }
    .text-right { text-align: right; }
    .font-mono { font-family: 'JetBrains Mono', monospace; }
  `]
})
export class ActividadComponent implements OnInit {
  private readonly auditoriaService = inject(AuditoriaService);

  readonly registros = signal<AuditoriaRegistro[]>([]);
  readonly cargando = signal<boolean>(true);
  readonly errorCarga = signal<string | null>(null);

  readonly modalJsonAbierto = signal<boolean>(false);
  readonly registroSeleccionado = signal<AuditoriaRegistro | null>(null);

  ngOnInit(): void {
    this.cargarAuditoria();
  }

  async cargarAuditoria(): Promise<void> {
    this.cargando.set(true);
    this.errorCarga.set(null);
    try {
      const data = await this.auditoriaService.listarRecientes(50);
      this.registros.set(data);
    } catch (err: unknown) {
      const appErr = mapError(err);
      this.errorCarga.set(appErr.mensaje);
    } finally {
      this.cargando.set(false);
    }
  }

  recortarId(id?: string | null): string {
    if (!id) return '—';
    if (id.length <= 12) return id;
    return `${id.slice(0, 8)}…`;
  }

  formatearFecha(iso: string): string {
    return formatearFecha(iso, true);
  }

  abrirDetalleJson(item: AuditoriaRegistro): void {
    this.registroSeleccionado.set(item);
    this.modalJsonAbierto.set(true);
  }

  cerrarModalJson(): void {
    this.modalJsonAbierto.set(false);
    this.registroSeleccionado.set(null);
  }

  formatearJson(obj: unknown): string {
    if (!obj) return '{}';
    try {
      return JSON.stringify(obj, null, 2);
    } catch {
      return String(obj);
    }
  }
}

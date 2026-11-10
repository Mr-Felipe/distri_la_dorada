import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { PedidoService } from '../../core/services/pedido.service';
import { ProductoService } from '../../core/services/producto.service';
import { ToastService } from '../../core/services/toast.service';
import { Pedido } from '../../core/models/pedido';
import { Producto } from '../../core/models/producto';

/** Línea en edición local (CU-09). `key` identifica la fila en la tabla. */
interface LineaEdicion {
  key: string;
  producto_id: string;
  cantidad: number;
  precio_unitario: number;
  nombre: string;
  referencia: string;
  existencias: number;
}
import { formatearCOP, formatearFecha, formatearNumeroPedido } from '../../core/utils/formato';
import { mapError } from '../../core/utils/errores';
import { BadgeEstado } from '../../shared/badge-estado/badge-estado';
import { BotonCargando } from '../../shared/boton-cargando/boton-cargando';
import { Modal } from '../../shared/modal/modal';

@Component({
  selector: 'app-pedido-detalle',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, ReactiveFormsModule, BadgeEstado, BotonCargando, Modal],
  template: `
    <div class="detalle-container">
      <!-- Barra superior de navegación y estado -->
      <div class="detalle-nav">
        <a routerLink="/pedidos" class="btn-volver">
          <span class="material-icons">arrow_back</span>
          Volver al listado de pedidos
        </a>
      </div>

      @if (cargando()) {
        <div class="cargando-wrap">
          <div class="spinner-grande"></div>
          <p>Cargando detalle del pedido...</p>
        </div>
      } @else if (errorCarga()) {
        <div class="card-error">
          <span class="material-icons error-icon">error_outline</span>
          <h3>No se pudo cargar el pedido</h3>
          <p>{{ errorCarga() }}</p>
          <a routerLink="/pedidos" class="btn-volver-alt">Volver a pedidos</a>
        </div>
      } @else if (pedido(); as ped) {
        <!-- Encabezado Principal del Pedido -->
        <div class="card-cabecera">
          <div class="cabecera-top">
            <div class="pedido-id-bloque">
              <span class="kicker">Distribuidora La Dorada S.A.S.</span>
              <div class="numero-estado-row">
                <h1 class="pedido-numero font-mono">{{ formatearNumero(ped.numero) }}</h1>
                <app-badge-estado [estado]="ped.estado"></app-badge-estado>
              </div>
            </div>

            <!-- Botones de Acción según el estado del pedido (CU-04 / CU-08 / CU-09) -->
            <div class="acciones-cabecera">
              @if (editando()) {
                <!-- Acciones del modo edición (CU-09) -->
                <app-boton-cargando
                  [variante]="'dorado'"
                  [tamano]="'md'"
                  [cargando]="procesandoAccion()"
                  [deshabilitado]="!edicionValida()"
                  [icono]="'save'"
                  [textoCargando]="'Guardando...'"
                  (accionar)="guardarEdicion()"
                >
                  Confirmar cambios
                </app-boton-cargando>
                <app-boton-cargando
                  [variante]="'secundario'"
                  [tamano]="'md'"
                  [deshabilitado]="procesandoAccion()"
                  [icono]="'close'"
                  (accionar)="cancelarEdicion()"
                >
                  Cancelar edición
                </app-boton-cargando>
              } @else {
                <!-- Acción EDITAR (solo estado pendiente, CU-09) -->
                @if (ped.estado === 'pendiente') {
                  <app-boton-cargando
                    [variante]="'secundario'"
                    [tamano]="'md'"
                    [deshabilitado]="procesandoAccion()"
                    [icono]="'edit'"
                    (accionar)="iniciarEdicion()"
                  >
                    Editar Pedido
                  </app-boton-cargando>
                }

                <!-- Acción CONFIRMAR (solo estado pendiente) -->
                @if (ped.estado === 'pendiente') {
                  <app-boton-cargando
                    [variante]="'dorado'"
                    [tamano]="'md'"
                    [cargando]="procesandoAccion()"
                    [icono]="'check_circle'"
                    [textoCargando]="'Confirmando...'"
                    (accionar)="confirmar()"
                  >
                    Confirmar Pedido
                  </app-boton-cargando>
                }

                <!-- Acción DESPACHAR (solo estado confirmado) -->
                @if (ped.estado === 'confirmado') {
                  <app-boton-cargando
                    [variante]="'exito'"
                    [tamano]="'md'"
                    [cargando]="procesandoAccion()"
                    [icono]="'local_shipping'"
                    [textoCargando]="'Despachando...'"
                    (accionar)="despachar()"
                  >
                    Despachar Pedido
                  </app-boton-cargando>
                }

                <!-- Acción CANCELAR (pendiente o confirmado) -->
                @if (ped.estado === 'pendiente' || ped.estado === 'confirmado') {
                  <app-boton-cargando
                    [variante]="'peligro'"
                    [tamano]="'md'"
                    [cargando]="procesandoAccion()"
                    [icono]="'cancel'"
                    (accionar)="abrirModalCancelar()"
                  >
                    Cancelar Pedido
                  </app-boton-cargando>
                }
              }
            </div>
          </div>

          <!-- Nota informativa si el inventario fue descontado -->
          @if (ped.estado === 'confirmado') {
            <div class="banner-stock-descontado">
              <span class="material-icons">info</span>
              <div>
                <strong>Existencias reservadas:</strong> El inventario de este pedido fue descontado del catálogo automáticamente en el servidor.
              </div>
            </div>
          }

          <!-- Modo edición (CU-09): el pedido sigue pendiente hasta la confirmación manual -->
          @if (editando()) {
            <div class="banner-edicion">
              <span class="material-icons">edit_note</span>
              <div>
                <strong>Modo edición:</strong> ajusta cliente, observación y líneas del pedido. Al guardar, el pedido seguirá <strong>pendiente</strong>; la confirmación y el descuento de inventario se hacen después con «Confirmar Pedido» (CU-04).
              </div>
            </div>
          }

          @if (ped.estado === 'rechazado' && ped.motivo_rechazo) {
            <div class="banner-motivo-rechazo">
              <span class="material-icons">report_problem</span>
              <div>
                <strong>Motivo de rechazo / cancelación:</strong>
                <p>{{ ped.motivo_rechazo }}</p>
                @if (ped.confirmado_en) {
                  <span class="nota-reversa">Las existencias asociadas fueron reintegradas al inventario disponible.</span>
                }
              </div>
            </div>
          }

          <!-- Grid de Metadatos del Pedido -->
          <div class="grid-metadatos">
            <div class="meta-item">
              <span class="meta-label">Cliente / Solicitante:</span>
              @if (editando()) {
                <input
                  type="text"
                  class="form-control"
                  [value]="clienteEdicion()"
                  (input)="onClienteEdicionInput($event)"
                  placeholder="Nombre del cliente"
                  maxlength="120"
                />
              } @else {
                <span class="meta-valor cliente-destacado">{{ ped.cliente }}</span>
              }
            </div>

            <div class="meta-item">
              <span class="meta-label">Observaciones:</span>
              @if (editando()) {
                <input
                  type="text"
                  class="form-control"
                  [value]="observacionEdicion()"
                  (input)="onObservacionEdicionInput($event)"
                  placeholder="Observación de entrega (opcional)"
                  maxlength="300"
                />
              } @else {
                <span class="meta-valor">{{ ped.observacion || 'Sin observaciones' }}</span>
              }
            </div>

            <div class="meta-item">
              <span class="meta-label">Fecha de creación:</span>
              <span class="meta-valor font-mono">{{ formatearFecha(ped.creado_en) }}</span>
            </div>

            @if (ped.confirmado_en) {
              <div class="meta-item">
                <span class="meta-label">Fecha de confirmación:</span>
                <span class="meta-valor font-mono text-blue">{{ formatearFecha(ped.confirmado_en) }}</span>
              </div>
            }

            @if (ped.despachado_en) {
              <div class="meta-item">
                <span class="meta-label">Fecha de despacho:</span>
                <span class="meta-valor font-mono text-emerald">{{ formatearFecha(ped.despachado_en) }}</span>
              </div>
            }

            @if (ped.rechazado_en) {
              <div class="meta-item">
                <span class="meta-label">Fecha de cancelación:</span>
                <span class="meta-valor font-mono text-red">{{ formatearFecha(ped.rechazado_en) }}</span>
              </div>
            }
          </div>
        </div>

        <!-- Tabla de Líneas del Pedido -->
        <div class="card-items">
          <div class="items-header">
            <h2 class="items-titulo">Ítems del Pedido (@if (editando()) { {{ lineasEdicion().length }} } @else { {{ ped.items?.length || 0 }} })</h2>
          </div>

          <div class="tabla-wrap">
            <table class="tabla-lineas">
              <thead>
                <tr>
                  <th style="width: 15%">Referencia</th>
                  <th style="width: 40%">Producto</th>
                  <th style="width: 15%" class="text-right">Precio unitario</th>
                  <th style="width: 12%" class="text-center">Cantidad</th>
                  <th style="width: 18%" class="text-right">Subtotal</th>
                  @if (editando()) {
                    <th style="width: 6%" class="text-center">Quitar</th>
                  }
                </tr>
              </thead>
              <tbody>
                @if (editando()) {
                  @for (linea of lineasEdicion(); track linea.key; let i = $index) {
                    <tr>
                      <td>
                        <span class="codigo-ref font-mono">{{ linea.referencia }}</span>
                      </td>
                      <td>
                        <div class="prod-nombre">{{ linea.nombre }}</div>
                        <span
                          class="badge-stock-inline"
                          [class.stock-cero]="linea.existencias === 0"
                          [class.stock-bajo]="linea.existencias > 0 && linea.existencias < 10"
                          [class.stock-ok]="linea.existencias >= 10"
                        >
                          Disp. {{ linea.existencias }} uds
                        </span>
                      </td>
                      <td class="text-right font-mono">
                        {{ formatearMoneda(linea.precio_unitario) }}
                      </td>
                      <td class="text-center">
                        <input
                          type="number"
                          class="input-cantidad-edit"
                          min="1"
                          step="1"
                          [value]="linea.cantidad"
                          (input)="onCantidadEdicionInput(i, $event)"
                          [class.cantidad-invalida]="linea.cantidad < 1"
                        />
                        @if (linea.cantidad < 1) {
                          <span class="error-msg">Mín. 1</span>
                        }
                      </td>
                      <td class="text-right font-mono subtotal-val">
                        {{ formatearMoneda(linea.precio_unitario * (linea.cantidad > 0 ? linea.cantidad : 0)) }}
                      </td>
                      <td class="text-center">
                        <button
                          type="button"
                          class="btn-quitar-linea"
                          [disabled]="lineasEdicion().length <= 1"
                          (click)="quitarLineaEdicion(i)"
                          aria-label="Quitar línea"
                          title="Quitar línea"
                        >
                          <span class="material-icons">delete_outline</span>
                        </button>
                      </td>
                    </tr>
                  }
                } @else {
                  @for (item of ped.items; track item.id) {
                    <tr>
                      <td>
                        <span class="codigo-ref font-mono">{{ item.producto?.referencia || '—' }}</span>
                      </td>
                      <td>
                        <div class="prod-nombre">{{ item.producto?.nombre || 'Producto' }}</div>
                      </td>
                      <td class="text-right font-mono">
                        {{ formatearMoneda(item.precio_unitario) }}
                      </td>
                      <td class="text-center font-mono font-bold">
                        {{ item.cantidad }} uds
                      </td>
                      <td class="text-right font-mono subtotal-val">
                        {{ formatearMoneda(item.precio_unitario * item.cantidad) }}
                      </td>
                    </tr>
                  }
                }
              </tbody>
            </table>
          </div>

          <!-- Agregar línea (solo modo edición, CU-09) -->
          @if (editando()) {
            <div class="agregar-linea-bar">
              <select
                class="form-control select-producto"
                [value]="productoNuevoId()"
                (change)="onProductoNuevoChange($event)"
              >
                <option value="">Agregar producto...</option>
                @for (p of productosActivos(); track p.id) {
                  <option [value]="p.id">
                    {{ p.nombre }} ({{ p.referencia }}) — disp. {{ p.existencias }}
                  </option>
                }
              </select>
              <input
                type="number"
                class="input-cantidad-edit"
                min="1"
                step="1"
                [value]="cantidadNueva()"
                (input)="onCantidadNuevaInput($event)"
                placeholder="Cant."
                [class.cantidad-invalida]="cantidadNueva() < 1"
              />
              <app-boton-cargando
                [variante]="'secundario'"
                [tamano]="'md'"
                [deshabilitado]="!puedeAgregarLinea()"
                [icono]="'add'"
                (accionar)="agregarLineaEdicion()"
              >
                Agregar línea
              </app-boton-cargando>
            </div>
            @if (!edicionValida()) {
              <div class="aviso-edicion-invalida">
                <span class="material-icons">warning_amber</span>
                {{ motivoEdicionInvalida() }}
              </div>
            }
          }

          <!-- Total Final Liquidado -->
          <div class="total-resumen-box">
            <div class="total-bloque">
              <span class="total-etiqueta">Total del Pedido (COP):</span>
              <span class="total-monto font-mono">
                {{ formatearMoneda(editando() ? totalEdicion() : ped.total) }}
              </span>
            </div>
          </div>
        </div>
      }
    </div>

    <!-- Modal Cancelar Pedido (Motivo Obligatorio) -->
    <app-modal
      [abierto]="modalCancelarAbierto()"
      [titulo]="'Cancelar Pedido'"
      [icono]="'cancel'"
      [tamano]="'md'"
      (cerrar)="cerrarModalCancelar()"
    >
      <div class="modal-cancelar-body">
        <p class="alerta-cancelar">
          ¿Estás seguro de que deseas cancelar este pedido? Esta acción cambiará el estado a <strong>Rechazado</strong>.
        </p>

        @if (pedido()?.estado === 'confirmado') {
          <div class="aviso-reversa">
            <span class="material-icons">info</span>
            <span><strong>Aviso de inventario:</strong> Como este pedido ya estaba confirmado, las cantidades de los productos se reintegrarán automáticamente al inventario físico en bodega.</span>
          </div>
        }

        <div class="form-group mt-3">
          <label for="motivoRechazo" class="form-label">
            Motivo de cancelación <span class="text-red font-bold">*</span>:
          </label>
          <textarea
            id="motivoRechazo"
            rows="3"
            [formControl]="controlMotivo"
            placeholder="Ej. El cliente no respondió la confirmación de entrega / Pedido duplicado..."
            class="form-control"
          ></textarea>
          @if (controlMotivo.invalid && controlMotivo.touched) {
            <span class="text-error">El motivo de cancelación es obligatorio</span>
          }
        </div>
      </div>

      <div slot="footer" class="modal-btns">
        <app-boton-cargando
          [variante]="'secundario'"
          (accionar)="cerrarModalCancelar()"
        >
          No, regresar
        </app-boton-cargando>

        <app-boton-cargando
          [variante]="'peligro'"
          [cargando]="procesandoAccion()"
          [deshabilitado]="controlMotivo.invalid"
          [icono]="'cancel'"
          (accionar)="confirmarCancelacion()"
        >
          Sí, cancelar pedido
        </app-boton-cargando>
      </div>
    </app-modal>
  `,
  styles: [`
    .detalle-container {
      max-width: 58rem;
      margin: 0 auto;
      padding-bottom: 3.5rem;
    }

    .detalle-nav {
      margin-bottom: 1.25rem;
    }

    .btn-volver {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      color: #64748b;
      font-size: 0.875rem;
      font-weight: 600;
      text-decoration: none;
    }
    .btn-volver:hover {
      color: #0f2744;
    }
    .btn-volver .material-icons {
      font-size: 1.1rem;
    }

    .card-cabecera {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 1rem;
      padding: 1.75rem 2rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
      margin-bottom: 1.5rem;
    }

    .cabecera-top {
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

    .numero-estado-row {
      display: flex;
      align-items: center;
      gap: 0.875rem;
      flex-wrap: wrap;
    }

    .pedido-numero {
      font-size: 2rem;
      font-weight: 900;
      color: #0f2744;
      margin: 0;
      letter-spacing: -0.02em;
    }

    .acciones-cabecera {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      flex-wrap: wrap;
    }

    .banner-stock-descontado {
      background: #eff6ff;
      border-left: 4px solid #3b82f6;
      border-radius: 0.5rem;
      padding: 0.75rem 1rem;
      display: flex;
      align-items: center;
      gap: 0.625rem;
      color: #1e40af;
      font-size: 0.875rem;
      margin-bottom: 1.5rem;
    }

    .banner-motivo-rechazo {
      background: #fef2f2;
      border-left: 4px solid #dc2626;
      border-radius: 0.5rem;
      padding: 0.875rem 1rem;
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
      color: #991b1b;
      font-size: 0.875rem;
      margin-bottom: 1.5rem;
    }
    .banner-motivo-rechazo p {
      margin: 0.25rem 0 0 0;
      font-weight: 600;
    }
    .nota-reversa {
      display: block;
      font-size: 0.75rem;
      color: #b91c1c;
      margin-top: 0.35rem;
    }

    .banner-edicion {
      background: #fffbeb;
      border-left: 4px solid #d4af37;
      border-radius: 0.5rem;
      padding: 0.75rem 1rem;
      display: flex;
      align-items: flex-start;
      gap: 0.625rem;
      color: #92400e;
      font-size: 0.875rem;
      margin-bottom: 1.5rem;
    }

    .banner-edicion strong {
      color: #78350f;
    }

    .grid-metadatos {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(13rem, 1fr));
      gap: 1.25rem;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 0.75rem;
      padding: 1.25rem 1.5rem;
    }

    .meta-item {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .meta-label {
      font-size: 0.75rem;
      text-transform: uppercase;
      font-weight: 700;
      color: #64748b;
      letter-spacing: 0.04em;
    }

    .meta-valor {
      font-size: 0.9375rem;
      font-weight: 600;
      color: #1e293b;
    }

    .cliente-destacado {
      font-size: 1.125rem;
      font-weight: 800;
      color: #0f2744;
    }

    /* Tabla Items */
    .card-items {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 1rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
      overflow: hidden;
    }

    .items-header {
      padding: 1.25rem 1.75rem;
      border-bottom: 1px solid #e2e8f0;
      background: #f8fafc;
    }

    .items-titulo {
      margin: 0;
      font-size: 1.125rem;
      font-weight: 800;
      color: #0f2744;
    }

    .tabla-wrap {
      overflow-x: auto;
    }

    .tabla-lineas {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
    }

    .tabla-lineas th {
      padding: 0.875rem 1.5rem;
      font-size: 0.75rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #475569;
      border-bottom: 1px solid #e2e8f0;
      background: #fdfdfd;
    }

    .tabla-lineas td {
      padding: 1rem 1.5rem;
      border-bottom: 1px solid #f1f5f9;
      font-size: 0.875rem;
      color: #1e293b;
      vertical-align: middle;
    }

    .codigo-ref {
      font-size: 0.8125rem;
      font-weight: 600;
      color: #0f2744;
      background: #f1f5f9;
      padding: 0.2rem 0.45rem;
      border-radius: 0.25rem;
    }

    .prod-nombre {
      font-weight: 600;
      color: #0f2744;
    }

    .subtotal-val {
      font-weight: 800;
      color: #0f2744;
      font-size: 0.9375rem;
    }

    /* Total Resumen Box */
    .total-resumen-box {
      padding: 1.5rem 1.75rem;
      background: #f8fafc;
      border-top: 1px solid #e2e8f0;
      display: flex;
      justify-content: flex-end;
    }

    .total-bloque {
      display: flex;
      align-items: baseline;
      gap: 1rem;
    }

    .total-etiqueta {
      font-size: 1.125rem;
      font-weight: 800;
      color: #0f2744;
    }

    .total-monto {
      font-size: 1.75rem;
      font-weight: 900;
      color: #b89326;
    }

    /* Edición de líneas (CU-09) */
    .input-cantidad-edit {
      width: 4.5rem;
      box-sizing: border-box;
      padding: 0.4rem 0.5rem;
      border: 1px solid #cbd5e1;
      border-radius: 0.5rem;
      font-size: 0.875rem;
      font-family: inherit;
      text-align: center;
      outline: none;
    }
    .input-cantidad-edit:focus {
      border-color: #0f2744;
      box-shadow: 0 0 0 3px rgba(15, 39, 68, 0.1);
    }
    .input-cantidad-edit.cantidad-invalida {
      border-color: #dc2626;
      background: #fef2f2;
    }

    .error-msg {
      display: block;
      font-size: 0.6875rem;
      color: #dc2626;
      font-weight: 600;
      margin-top: 0.25rem;
    }

    .btn-quitar-linea {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 2.25rem;
      height: 2.25rem;
      border: 1px solid #fecaca;
      border-radius: 0.5rem;
      background: #fef2f2;
      color: #dc2626;
      cursor: pointer;
      transition: background 0.15s ease;
    }
    .btn-quitar-linea:hover:not(:disabled) {
      background: #fee2e2;
    }
    .btn-quitar-linea:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }
    .btn-quitar-linea .material-icons {
      font-size: 1.15rem;
    }

    .agregar-linea-bar {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 1rem 1.75rem;
      background: #f8fafc;
      border-top: 1px solid #e2e8f0;
      flex-wrap: wrap;
    }

    .select-producto {
      flex: 1;
      min-width: 14rem;
      width: auto;
    }

    .aviso-edicion-invalida {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.65rem 1.75rem;
      background: #fef2f2;
      border-top: 1px solid #fecaca;
      color: #b91c1c;
      font-size: 0.8125rem;
      font-weight: 600;
    }
    .aviso-edicion-invalida .material-icons {
      font-size: 1.1rem;
    }

    .badge-stock-inline {
      display: inline-block;
      font-size: 0.6875rem;
      font-weight: 700;
      padding: 0.15rem 0.45rem;
      border-radius: 0.375rem;
      margin-top: 0.25rem;
    }
    .stock-ok { background: #dcfce7; color: #15803d; }
    .stock-bajo { background: #fef3c7; color: #b45309; }
    .stock-cero { background: #fee2e2; color: #b91c1c; }

    /* Modal Cancelar */
    .alerta-cancelar {
      margin: 0 0 1rem 0;
      font-size: 0.9375rem;
      color: #334155;
    }

    .aviso-reversa {
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      border-radius: 0.5rem;
      padding: 0.75rem;
      display: flex;
      gap: 0.5rem;
      color: #1d4ed8;
      font-size: 0.8125rem;
      margin-bottom: 1rem;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 0.375rem;
    }

    .form-label {
      font-size: 0.875rem;
      font-weight: 700;
      color: #1e293b;
    }

    .form-control {
      width: 100%;
      box-sizing: border-box;
      padding: 0.65rem 0.75rem;
      border: 1px solid #cbd5e1;
      border-radius: 0.5rem;
      font-size: 0.875rem;
      font-family: inherit;
      outline: none;
    }
    .form-control:focus {
      border-color: #0f2744;
      box-shadow: 0 0 0 3px rgba(15, 39, 68, 0.1);
    }

    .text-error {
      font-size: 0.75rem;
      color: #dc2626;
      font-weight: 600;
    }

    .modal-btns {
      display: flex;
      gap: 0.75rem;
    }

    .cargando-wrap {
      text-align: center;
      padding: 5rem 1rem;
      color: #64748b;
    }
    .spinner-grande {
      width: 2.75rem;
      height: 2.75rem;
      border: 3px solid #e2e8f0;
      border-top-color: #0f2744;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin: 0 auto 1rem auto;
    }

    .card-error {
      background: #ffffff;
      border-radius: 1rem;
      border: 1px solid #e2e8f0;
      padding: 3rem 1.5rem;
      text-align: center;
    }
    .error-icon {
      font-size: 3rem;
      color: #dc2626;
    }

    .btn-volver-alt {
      display: inline-block;
      margin-top: 1rem;
      background: #0f2744;
      color: #ffffff;
      padding: 0.5rem 1rem;
      border-radius: 0.5rem;
      text-decoration: none;
      font-weight: 600;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    @media (max-width: 640px) {
      .card-cabecera {
        padding: 1.25rem 1rem;
      }
      .cabecera-top {
        flex-direction: column;
        align-items: stretch;
      }
      .acciones-cabecera {
        width: 100%;
      }
      .total-resumen-box {
        justify-content: stretch;
      }
      .total-bloque {
        width: 100%;
        justify-content: space-between;
      }
    }

    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .text-blue { color: #1d4ed8; }
    .text-emerald { color: #059669; }
    .text-red { color: #dc2626; }
    .font-mono { font-family: 'JetBrains Mono', monospace; }
    .font-bold { font-weight: 700; }
  `]
})
export class PedidoDetalleComponent implements OnInit {
  private readonly pedidoService = inject(PedidoService);
  private readonly productoService = inject(ProductoService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  readonly pedido = signal<Pedido | null>(null);
  readonly cargando = signal<boolean>(true);
  readonly errorCarga = signal<string | null>(null);
  readonly procesandoAccion = signal<boolean>(false);

  // Modal Cancelar
  readonly modalCancelarAbierto = signal<boolean>(false);
  readonly controlMotivo = new FormControl<string>('', {
    nonNullable: true,
    validators: [Validators.required, Validators.minLength(3)]
  });

  // Modo edición de líneas (CU-09)
  readonly editando = signal<boolean>(false);
  readonly lineasEdicion = signal<LineaEdicion[]>([]);
  readonly clienteEdicion = signal<string>('');
  readonly observacionEdicion = signal<string>('');
  readonly productosActivos = signal<Producto[]>([]);
  readonly productoNuevoId = signal<string>('');
  readonly cantidadNueva = signal<number>(1);

  /** Total recalculado en vivo mientras se edita. */
  readonly totalEdicion = computed(() =>
    this.lineasEdicion().reduce(
      (suma, l) => suma + l.precio_unitario * (l.cantidad > 0 ? l.cantidad : 0),
      0
    )
  );

  /** Valida el formulario de edición completo. */
  readonly edicionValida = computed(() => {
    if (this.clienteEdicion().trim().length === 0) return false;
    const lineas = this.lineasEdicion();
    if (lineas.length === 0) return false;
    return lineas.every(l => Number.isInteger(l.cantidad) && l.cantidad >= 1);
  });

  /** Mensaje del motivo por el cual la edición no es válida. */
  readonly motivoEdicionInvalida = computed(() => {
    if (this.clienteEdicion().trim().length === 0) {
      return 'El nombre del cliente es obligatorio.';
    }
    if (this.lineasEdicion().length === 0) {
      return 'El pedido debe tener al menos una línea.';
    }
    if (this.lineasEdicion().some(l => !Number.isInteger(l.cantidad) || l.cantidad < 1)) {
      return 'Hay líneas con cantidad inválida: la cantidad debe ser al menos 1.';
    }
    return '';
  });

  /** Habilita «Agregar línea» solo con producto y cantidad válidos. */
  readonly puedeAgregarLinea = computed(() => {
    if (this.productoNuevoId().length === 0) return false;
    const cant = this.cantidadNueva();
    return Number.isInteger(cant) && cant >= 1;
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.cargarDetalle(id);
    } else {
      this.router.navigate(['/pedidos']);
    }
  }

  async cargarDetalle(id: string): Promise<void> {
    this.cargando.set(true);
    this.errorCarga.set(null);
    try {
      const data = await this.pedidoService.obtenerPorId(id);
      this.pedido.set(data);
    } catch (err: unknown) {
      const appErr = mapError(err);
      this.errorCarga.set(appErr.mensaje);
    } finally {
      this.cargando.set(false);
    }
  }

  formatearNumero(num: string | number): string {
    return formatearNumeroPedido(num);
  }

  formatearMoneda(val: number): string {
    return formatearCOP(val);
  }

  formatearFecha(iso: string | null | undefined): string {
    return formatearFecha(iso, true);
  }

  async confirmar(): Promise<void> {
    const ped = this.pedido();
    if (!ped || this.procesandoAccion()) return;

    this.procesandoAccion.set(true);
    try {
      await this.pedidoService.confirmarPedido(ped.id);
      this.toast.exito('Pedido confirmado con éxito. Se descontó el inventario en bodega.', 'Pedido Confirmado');
      // Recargar datos actualizados
      await this.cargarDetalle(ped.id);
    } catch (err: unknown) {
      const appErr = mapError(err);
      this.toast.error(appErr.mensaje, appErr.titulo);
    } finally {
      this.procesandoAccion.set(false);
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Modo edición de un pedido pendiente (CU-09)
  // ─────────────────────────────────────────────────────────────

  /** Entra en modo edición: carga líneas actuales y el catálogo de productos activos. */
  async iniciarEdicion(): Promise<void> {
    const ped = this.pedido();
    if (!ped || ped.estado !== 'pendiente' || this.editando()) return;

    this.lineasEdicion.set(
      (ped.items ?? []).map(it => ({
        key: it.id,
        producto_id: it.producto_id,
        cantidad: it.cantidad,
        precio_unitario: it.precio_unitario,
        nombre: it.producto?.nombre || 'Producto',
        referencia: it.producto?.referencia || '—',
        existencias: it.producto?.existencias ?? 0
      }))
    );
    this.clienteEdicion.set(ped.cliente);
    this.observacionEdicion.set(ped.observacion ?? '');
    this.productoNuevoId.set('');
    this.cantidadNueva.set(1);

    try {
      const productos = await this.productoService.listar(undefined, true);
      this.productosActivos.set(productos);
    } catch {
      this.productosActivos.set([]);
      this.toast.advertencia(
        'No se pudo cargar el catálogo de productos para agregar líneas.',
        'Catálogo no disponible'
      );
    }

    this.editando.set(true);
  }

  /** Sale del modo edición descartando los cambios. */
  cancelarEdicion(): void {
    if (this.procesandoAccion()) return;
    this.editando.set(false);
    this.lineasEdicion.set([]);
  }

  /**
   * Guarda los cambios con la RPC editar_pedido.
   * El pedido sigue PENDIENTE: la confirmación y el descuento de
   * inventario se hacen después con «Confirmar Pedido» (CU-04).
   */
  async guardarEdicion(): Promise<void> {
    const ped = this.pedido();
    if (!ped || !this.editando() || !this.edicionValida() || this.procesandoAccion()) return;

    this.procesandoAccion.set(true);
    try {
      await this.pedidoService.editarPedido(
        ped.id,
        this.clienteEdicion(),
        this.lineasEdicion().map(l => ({ producto_id: l.producto_id, cantidad: l.cantidad })),
        this.observacionEdicion()
      );
      this.toast.exito(
        'Pedido actualizado. Sigue pendiente: revisa las líneas y pulsa «Confirmar Pedido» cuando el inventario alcance.',
        'Cambios guardados'
      );
      this.editando.set(false);
      this.lineasEdicion.set([]);
      await this.cargarDetalle(ped.id);
    } catch (err: unknown) {
      const appErr = mapError(err);
      this.toast.error(appErr.mensaje, appErr.titulo);
    } finally {
      this.procesandoAccion.set(false);
    }
  }

  onClienteEdicionInput(event: Event): void {
    this.clienteEdicion.set((event.target as HTMLInputElement).value);
  }

  onObservacionEdicionInput(event: Event): void {
    this.observacionEdicion.set((event.target as HTMLInputElement).value);
  }

  onCantidadEdicionInput(index: number, event: Event): void {
    const raw = (event.target as HTMLInputElement).value;
    const valor = raw === '' ? 0 : Math.floor(Number(raw));
    this.lineasEdicion.update(lineas =>
      lineas.map((l, i) => (i === index ? { ...l, cantidad: Number.isFinite(valor) ? valor : 0 } : l))
    );
  }

  quitarLineaEdicion(index: number): void {
    if (this.lineasEdicion().length <= 1) return;
    this.lineasEdicion.update(lineas => lineas.filter((_, i) => i !== index));
  }

  onProductoNuevoChange(event: Event): void {
    this.productoNuevoId.set((event.target as HTMLSelectElement).value);
  }

  onCantidadNuevaInput(event: Event): void {
    const raw = (event.target as HTMLInputElement).value;
    const valor = raw === '' ? 0 : Math.floor(Number(raw));
    this.cantidadNueva.set(Number.isFinite(valor) ? valor : 0);
  }

  /** Agrega una línea al pedido en edición (no se guarda hasta «Confirmar cambios»). */
  agregarLineaEdicion(): void {
    if (!this.puedeAgregarLinea()) return;

    const producto = this.productosActivos().find(p => p.id === this.productoNuevoId());
    if (!producto) return;

    this.lineasEdicion.update(lineas => [
      ...lineas,
      {
        key: `nueva-${Date.now()}-${lineas.length}`,
        producto_id: producto.id,
        cantidad: this.cantidadNueva(),
        precio_unitario: producto.precio,
        nombre: producto.nombre,
        referencia: producto.referencia,
        existencias: producto.existencias
      }
    ]);
    this.productoNuevoId.set('');
    this.cantidadNueva.set(1);
  }

  async despachar(): Promise<void> {
    const ped = this.pedido();
    if (!ped || this.procesandoAccion()) return;

    this.procesandoAccion.set(true);
    try {
      await this.pedidoService.despacharPedido(ped.id);
      this.toast.exito('Pedido marcado como despachado con éxito', 'Despacho registrado');
      await this.cargarDetalle(ped.id);
    } catch (err: unknown) {
      const appErr = mapError(err);
      this.toast.error(appErr.mensaje);
    } finally {
      this.procesandoAccion.set(false);
    }
  }

  abrirModalCancelar(): void {
    this.controlMotivo.reset();
    this.modalCancelarAbierto.set(true);
  }

  cerrarModalCancelar(): void {
    this.modalCancelarAbierto.set(false);
    this.controlMotivo.reset();
  }

  async confirmarCancelacion(): Promise<void> {
    const ped = this.pedido();
    if (!ped || this.controlMotivo.invalid || this.procesandoAccion()) return;

    this.procesandoAccion.set(true);
    try {
      const motivo = this.controlMotivo.value.trim();
      await this.pedidoService.cancelarPedido(ped.id, motivo);
      this.toast.advertencia('El pedido ha sido cancelado y rechazado.', 'Pedido Cancelado');
      this.cerrarModalCancelar();
      await this.cargarDetalle(ped.id);
    } catch (err: unknown) {
      const appErr = mapError(err);
      this.toast.error(appErr.mensaje);
    } finally {
      this.procesandoAccion.set(false);
    }
  }
}

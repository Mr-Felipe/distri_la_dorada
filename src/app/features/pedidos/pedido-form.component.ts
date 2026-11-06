import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormArray, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ProductoService } from '../../core/services/producto.service';
import { PedidoService } from '../../core/services/pedido.service';
import { ToastService } from '../../core/services/toast.service';
import { Producto } from '../../core/models/producto';
import { formatearCOP } from '../../core/utils/formato';
import { mapError } from '../../core/utils/errores';
import { BotonCargando } from '../../shared/boton-cargando/boton-cargando';

interface LineaFormItem {
  producto_id: FormControl<string>;
  cantidad: FormControl<number>;
}

@Component({
  selector: 'app-pedido-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, BotonCargando],
  template: `
    <div class="pedido-form-container">
      <div class="form-header">
        <a routerLink="/pedidos" class="btn-volver">
          <span class="material-icons">arrow_back</span>
          Volver a pedidos
        </a>
        <div class="kicker">Creación de Pedido por WhatsApp</div>
        <h1 class="form-title">Nuevo Pedido Comercial</h1>
        <p class="form-subtitle">Ingresa los datos del cliente y los productos solicitados. El pedido nace en estado <strong>Pendiente</strong>.</p>
      </div>

      @if (cargandoCatalogo()) {
        <div class="cargando-box">
          <div class="spinner-inline"></div>
          <p>Cargando catálogo de productos activos...</p>
        </div>
      } @else {
        <form [formGroup]="formulario" (ngSubmit)="guardarPedido()" class="form-card" novalidate>
          @if (errorServidor()) {
            <div class="banner-error" role="alert">
              <span class="material-icons">error_outline</span>
              <div>
                <strong>Error al procesar:</strong>
                <p>{{ errorServidor() }}</p>
              </div>
            </div>
          }

          <!-- Sección Cliente y Observación -->
          <div class="seccion-bloque">
            <h2 class="seccion-titulo">1. Datos del Cliente</h2>

            <div class="grid-cliente">
              <div class="campo-grupo">
                <label for="cliente" class="campo-label">
                  Nombre completo / Razón social <span class="requerido">*</span>
                </label>
                <div class="input-wrap" [class.campo-invalido]="clienteInvalido()">
                  <span class="material-icons input-icon">person</span>
                  <input
                    id="cliente"
                    type="text"
                    formControlName="cliente"
                    placeholder="Ej. Tienda Doña Marta / Juan Pérez"
                    class="form-control"
                  />
                </div>
                @if (clienteInvalido()) {
                  <span class="error-msg">El nombre del cliente es obligatorio</span>
                }
              </div>

              <div class="campo-grupo">
                <label for="observacion" class="campo-label">Observaciones del pedido (Opcional)</label>
                <div class="input-wrap">
                  <span class="material-icons input-icon">notes</span>
                  <input
                    id="observacion"
                    type="text"
                    formControlName="observacion"
                    placeholder="Ej. Entregar antes de las 2 PM por WhatsApp..."
                    class="form-control"
                  />
                </div>
              </div>
            </div>
          </div>

          <!-- Sección Productos Solicitados -->
          <div class="seccion-bloque">
            <div class="lineas-header">
              <div>
                <h2 class="seccion-titulo">2. Líneas de Productos</h2>
                <p class="seccion-sub">Selecciona el producto y la cantidad requerida</p>
              </div>

              <button
                type="button"
                class="btn-agregar-linea"
                (click)="agregarLinea()"
                [disabled]="productosActivos().length === 0"
              >
                <span class="material-icons">add</span>
                Agregar producto
              </button>
            </div>

            <!-- Tabla de Líneas dinámicas -->
            <div class="tabla-lineas-wrap">
              <table class="tabla-lineas">
                <thead>
                  <tr>
                    <th style="width: 44%">Producto</th>
                    <th style="width: 14%" class="text-center">Existencias</th>
                    <th style="width: 16%" class="text-right">Precio unitario</th>
                    <th style="width: 14%">Cantidad</th>
                    <th style="width: 18%" class="text-right">Subtotal</th>
                    <th style="width: 6%" class="text-center"></th>
                  </tr>
                </thead>
                <tbody formArrayName="items">
                  @for (linea of lineasItems.controls; track $index; let i = $index) {
                    <tr [formGroupName]="i" class="fila-linea">
                      <!-- Selector Producto -->
                      <td>
                        <select
                          formControlName="producto_id"
                          class="select-producto"
                          (change)="alCambiarProducto()"
                        >
                          <option value="" disabled>Seleccione un producto...</option>
                          @for (p of productosActivos(); track p.id) {
                            <option [value]="p.id">
                              [{{ p.referencia }}] {{ p.nombre }}
                            </option>
                          }
                        </select>
                      </td>

                      <!-- Stock disponible (solo lectura) -->
                      <td class="text-center">
                        @let pSeleccionado = obtenerProductoSeleccionado(i);
                        @if (pSeleccionado) {
                          <span
                            class="badge-stock-inline"
                            [class.stock-cero]="pSeleccionado.existencias === 0"
                            [class.stock-bajo]="pSeleccionado.existencias > 0 && pSeleccionado.existencias < 10"
                            [class.stock-ok]="pSeleccionado.existencias >= 10"
                          >
                            {{ pSeleccionado.existencias }} uds
                          </span>
                        } @else {
                          <span class="text-muted">—</span>
                        }
                      </td>

                      <!-- Precio Unitario -->
                      <td class="text-right font-mono">
                        @let prod = obtenerProductoSeleccionado(i);
                        {{ prod ? formatearMoneda(prod.precio) : '—' }}
                      </td>

                      <!-- Cantidad (mínimo 1) -->
                      <td>
                        <input
                          type="number"
                          min="1"
                          step="1"
                          formControlName="cantidad"
                          class="input-cantidad text-center font-mono"
                          (input)="alCambiarCantidad()"
                        />
                      </td>

                      <!-- Subtotal línea -->
                      <td class="text-right font-mono subtotal-celda">
                        {{ formatearMoneda(calcularSubtotalLinea(i)) }}
                      </td>

                      <!-- Quitar línea -->
                      <td class="text-center">
                        @if (lineasItems.length > 1) {
                          <button
                            type="button"
                            class="btn-quitar-linea"
                            (click)="removerLinea(i)"
                            aria-label="Quitar producto"
                          >
                            <span class="material-icons">delete_outline</span>
                          </button>
                        }
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>

            @if (lineasItems.length === 0) {
              <div class="alerta-vacio">
                <span class="material-icons">shopping_bag</span>
                Debes agregar al menos un producto al pedido.
              </div>
            }
          </div>

          <!-- Resumen de Totales y Liquidación -->
          <div class="liquidacion-panel">
            <div class="liquidacion-filas">
              <div class="liq-fila">
                <span class="liq-label">Líneas en el pedido:</span>
                <span class="liq-val">{{ lineasItems.length }} ítem(s)</span>
              </div>
              <div class="liq-fila">
                <span class="liq-label">Unidades totales:</span>
                <span class="liq-val font-mono">{{ totalUnidades() }} uds</span>
              </div>
              <div class="liq-fila total-destacado">
                <span class="liq-label-gran">Total a cobrar:</span>
                <span class="liq-val-gran font-mono">{{ formatearMoneda(totalCalculado()) }}</span>
              </div>
            </div>
          </div>

          <!-- Botones de Acción -->
          <div class="acciones-finales">
            <a routerLink="/pedidos" class="btn-cancelar">Cancelar</a>
            <app-boton-cargando
              [tipo]="'submit'"
              [variante]="'dorado'"
              [tamano]="'lg'"
              [cargando]="guardando()"
              [deshabilitado]="formulario.invalid || totalCalculado() <= 0"
              [icono]="'check_circle'"
              [textoCargando]="'Registrando pedido en Supabase...'"
            >
              Crear Pedido
            </app-boton-cargando>
          </div>
        </form>
      }
    </div>
  `,
  styles: [`
    .pedido-form-container {
      max-width: 56rem;
      margin: 0 auto;
      padding-bottom: 3.5rem;
    }

    .form-header {
      margin-bottom: 1.75rem;
    }

    .btn-volver {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      color: #64748b;
      font-size: 0.875rem;
      font-weight: 600;
      text-decoration: none;
      margin-bottom: 0.5rem;
    }
    .btn-volver:hover {
      color: #0f2744;
    }
    .btn-volver .material-icons {
      font-size: 1.1rem;
    }

    .kicker {
      font-size: 0.75rem;
      text-transform: uppercase;
      font-weight: 800;
      letter-spacing: 0.08em;
      color: #b89326;
      margin-bottom: 0.25rem;
    }

    .form-title {
      font-size: 1.75rem;
      font-weight: 800;
      color: #0f2744;
      margin: 0;
    }

    .form-subtitle {
      margin: 0.25rem 0 0 0;
      font-size: 0.875rem;
      color: #64748b;
    }

    .form-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 1rem;
      padding: 1.75rem 2rem;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.04);
      display: flex;
      flex-direction: column;
      gap: 2rem;
    }

    .seccion-bloque {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .seccion-titulo {
      font-size: 1.125rem;
      font-weight: 700;
      color: #0f2744;
      margin: 0;
    }

    .seccion-sub {
      margin: 0.15rem 0 0 0;
      font-size: 0.8125rem;
      color: #64748b;
    }

    .grid-cliente {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 1.25rem;
    }

    .campo-grupo {
      display: flex;
      flex-direction: column;
      gap: 0.375rem;
    }

    .campo-label {
      font-size: 0.875rem;
      font-weight: 700;
      color: #1e293b;
    }

    .requerido {
      color: #dc2626;
    }

    .input-wrap {
      display: flex;
      align-items: center;
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 0.5rem;
      padding: 0 0.75rem;
    }
    .input-wrap:focus-within {
      border-color: #0f2744;
      background: #ffffff;
      box-shadow: 0 0 0 3px rgba(15, 39, 68, 0.1);
    }

    .input-icon {
      color: #94a3b8;
      font-size: 1.25rem;
      margin-right: 0.5rem;
    }

    .form-control {
      flex: 1;
      border: none;
      background: transparent;
      padding: 0.65rem 0;
      font-size: 0.9375rem;
      color: #0f2744;
      outline: none;
      font-family: inherit;
    }

    .campo-invalido {
      border-color: #dc2626 !important;
      background: #fffafa !important;
    }

    .error-msg {
      font-size: 0.75rem;
      color: #dc2626;
      font-weight: 600;
    }

    /* Líneas Header */
    .lineas-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      flex-wrap: wrap;
    }

    .btn-agregar-linea {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      background: #f1f5f9;
      color: #0f2744;
      border: 1px solid #cbd5e1;
      padding: 0.45rem 0.875rem;
      border-radius: 0.5rem;
      font-size: 0.8125rem;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.15s;
    }
    .btn-agregar-linea:hover:not(:disabled) {
      background: #e2e8f0;
      border-color: #0f2744;
    }
    .btn-agregar-linea:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .btn-agregar-linea .material-icons {
      font-size: 1.1rem;
    }

    /* Tabla Líneas */
    .tabla-lineas-wrap {
      overflow-x: auto;
      border: 1px solid #e2e8f0;
      border-radius: 0.75rem;
    }

    .tabla-lineas {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
    }

    .tabla-lineas th {
      background: #f8fafc;
      padding: 0.75rem 1rem;
      font-size: 0.75rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #475569;
      border-bottom: 1px solid #e2e8f0;
    }

    .tabla-lineas td {
      padding: 0.75rem 1rem;
      border-bottom: 1px solid #f1f5f9;
      font-size: 0.875rem;
      vertical-align: middle;
    }

    .select-producto {
      width: 100%;
      box-sizing: border-box;
      padding: 0.5rem 0.65rem;
      border: 1px solid #cbd5e1;
      border-radius: 0.375rem;
      background: #ffffff;
      font-size: 0.875rem;
      color: #0f2744;
      outline: none;
      font-family: inherit;
    }
    .select-producto:focus {
      border-color: #0f2744;
    }

    .badge-stock-inline {
      display: inline-block;
      padding: 0.2rem 0.45rem;
      border-radius: 0.25rem;
      font-size: 0.75rem;
      font-weight: 700;
    }
    .stock-ok { background: #dcfce7; color: #15803d; }
    .stock-bajo { background: #fef3c7; color: #b45309; }
    .stock-cero { background: #fee2e2; color: #b91c1c; }

    .input-cantidad {
      width: 4.5rem;
      padding: 0.45rem 0.5rem;
      border: 1px solid #cbd5e1;
      border-radius: 0.375rem;
      font-size: 0.9375rem;
      outline: none;
      font-weight: 700;
    }
    .input-cantidad:focus {
      border-color: #0f2744;
    }

    .subtotal-celda {
      font-weight: 800;
      color: #0f2744;
      font-size: 0.9375rem;
    }

    .btn-quitar-linea {
      background: transparent;
      border: none;
      color: #94a3b8;
      cursor: pointer;
      padding: 0.25rem;
      border-radius: 0.25rem;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }
    .btn-quitar-linea:hover {
      color: #dc2626;
      background: #fee2e2;
    }
    .btn-quitar-linea .material-icons {
      font-size: 1.2rem;
    }

    /* Panel Liquidación */
    .liquidacion-panel {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 0.75rem;
      padding: 1.25rem 1.5rem;
      display: flex;
      justify-content: flex-end;
    }

    .liquidacion-filas {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      min-width: 18rem;
    }

    .liq-fila {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.875rem;
      color: #475569;
    }

    .liq-val {
      font-weight: 600;
      color: #1e293b;
    }

    .total-destacado {
      margin-top: 0.5rem;
      padding-top: 0.75rem;
      border-top: 2px solid #cbd5e1;
    }

    .liq-label-gran {
      font-size: 1.125rem;
      font-weight: 800;
      color: #0f2744;
    }

    .liq-val-gran {
      font-size: 1.35rem;
      font-weight: 900;
      color: #b89326;
    }

    .acciones-finales {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 1rem;
      margin-top: 0.5rem;
    }

    .btn-cancelar {
      color: #64748b;
      font-size: 0.875rem;
      font-weight: 600;
      text-decoration: none;
      padding: 0.5rem 1rem;
      border-radius: 0.5rem;
    }
    .btn-cancelar:hover {
      background: #f1f5f9;
      color: #0f2744;
    }

    .banner-error {
      background: #fef2f2;
      border-left: 4px solid #dc2626;
      border-radius: 0.5rem;
      padding: 0.875rem 1rem;
      display: flex;
      gap: 0.75rem;
      color: #b91c1c;
      font-size: 0.875rem;
    }

    .cargando-box {
      text-align: center;
      padding: 4rem 1rem;
      color: #64748b;
    }

    .spinner-inline {
      width: 2rem;
      height: 2rem;
      border: 3px solid #e2e8f0;
      border-top-color: #0f2744;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin: 0 auto 0.75rem auto;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    @media (max-width: 640px) {
      .grid-cliente {
        grid-template-columns: 1fr;
      }
      .form-card {
        padding: 1.25rem 1rem;
      }
      .liquidacion-panel {
        justify-content: stretch;
      }
      .liquidacion-filas {
        width: 100%;
      }
    }

    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .text-muted { color: #94a3b8; }
    .font-mono { font-family: 'JetBrains Mono', monospace; }
  `]
})
export class PedidoFormComponent implements OnInit {
  private readonly productoService = inject(ProductoService);
  private readonly pedidoService = inject(PedidoService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  readonly productosActivos = signal<Producto[]>([]);
  readonly cargandoCatalogo = signal<boolean>(true);
  readonly guardando = signal<boolean>(false);
  readonly errorServidor = signal<string | null>(null);

  // Formulario reactivo
  readonly formulario = new FormGroup({
    cliente: new FormControl<string>('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(2)]
    }),
    observacion: new FormControl<string>('', {
      nonNullable: true
    }),
    items: new FormArray<FormGroup<LineaFormItem>>([])
  });

  get lineasItems(): FormArray<FormGroup<LineaFormItem>> {
    return this.formulario.controls.items;
  }

  // Version reactive trigger para recalcular totales
  private readonly cambioTrigger = signal<number>(0);

  readonly totalCalculado = computed(() => {
    this.cambioTrigger(); // dependency
    let total = 0;
    const items = this.lineasItems.controls;
    const prods = this.productosActivos();

    for (const linea of items) {
      const prodId = linea.controls.producto_id.value;
      const cant = Number(linea.controls.cantidad.value) || 0;
      const p = prods.find(item => item.id === prodId);
      if (p) {
        total += p.precio * cant;
      }
    }
    return total;
  });

  readonly totalUnidades = computed(() => {
    this.cambioTrigger();
    let uds = 0;
    for (const linea of this.lineasItems.controls) {
      uds += Number(linea.controls.cantidad.value) || 0;
    }
    return uds;
  });

  ngOnInit(): void {
    this.cargarCatalogo();
  }

  async cargarCatalogo(): Promise<void> {
    this.cargandoCatalogo.set(true);
    try {
      // Filtrar solo productos activos para nuevo pedido
      const lista = await this.productoService.listar(undefined, true);
      this.productosActivos.set(lista);

      // Agregar primera línea por defecto
      if (lista.length > 0) {
        this.agregarLinea(lista[0].id);
      } else {
        this.agregarLinea();
      }
    } catch {
      this.toast.error('No se pudo cargar el catálogo para el pedido');
    } finally {
      this.cargandoCatalogo.set(false);
    }
  }

  agregarLinea(productoIdPredeterminado = ''): void {
    const grupo = new FormGroup<LineaFormItem>({
      producto_id: new FormControl<string>(productoIdPredeterminado, {
        nonNullable: true,
        validators: [Validators.required]
      }),
      cantidad: new FormControl<number>(1, {
        nonNullable: true,
        validators: [Validators.required, Validators.min(1)]
      })
    });

    this.lineasItems.push(grupo);
    this.alCambiarCantidad();
  }

  removerLinea(index: number): void {
    if (this.lineasItems.length > 1) {
      this.lineasItems.removeAt(index);
      this.alCambiarCantidad();
    }
  }

  obtenerProductoSeleccionado(index: number): Producto | undefined {
    const prodId = this.lineasItems.at(index)?.controls.producto_id.value;
    if (!prodId) return undefined;
    return this.productosActivos().find(p => p.id === prodId);
  }

  calcularSubtotalLinea(index: number): number {
    const prod = this.obtenerProductoSeleccionado(index);
    if (!prod) return 0;
    const cant = Number(this.lineasItems.at(index)?.controls.cantidad.value) || 0;
    return prod.precio * cant;
  }

  alCambiarProducto(): void {
    this.alCambiarCantidad();
  }

  alCambiarCantidad(): void {
    this.cambioTrigger.update(v => v + 1);
  }

  clienteInvalido(): boolean {
    const c = this.formulario.controls.cliente;
    return c.invalid && (c.dirty || c.touched);
  }

  formatearMoneda(val: number): string {
    return formatearCOP(val);
  }

  async guardarPedido(): Promise<void> {
    if (this.formulario.invalid || this.guardando()) return;

    // Validar líneas
    const itemsRaw = this.lineasItems.getRawValue();
    const itemsValidos = itemsRaw.filter(i => i.producto_id && i.cantidad > 0);

    if (itemsValidos.length === 0) {
      this.toast.advertencia('Debes seleccionar al menos un producto con cantidad válida.');
      return;
    }

    this.guardando.set(true);
    this.errorServidor.set(null);

    const { cliente, observacion } = this.formulario.getRawValue();

    try {
      const nuevoId = await this.pedidoService.crearPedido(
        cliente,
        itemsValidos.map(i => ({ producto_id: i.producto_id, cantidad: Number(i.cantidad) })),
        observacion
      );

      this.toast.exito('Pedido creado exitosamente en estado pendiente');
      
      if (nuevoId) {
        this.router.navigate(['/pedidos', nuevoId]);
      } else {
        this.router.navigate(['/pedidos']);
      }
    } catch (err: unknown) {
      const appErr = mapError(err);
      this.errorServidor.set(appErr.mensaje);
      this.toast.error(appErr.mensaje);
    } finally {
      this.guardando.set(false);
    }
  }
}

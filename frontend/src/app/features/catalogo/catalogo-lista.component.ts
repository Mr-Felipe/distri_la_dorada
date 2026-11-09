import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ProductoService } from '../../core/services/producto.service';
import { ToastService } from '../../core/services/toast.service';
import { Producto } from '../../core/models/producto';
import { formatearCOP } from '../../core/utils/formato';
import { mapError } from '../../core/utils/errores';
import { TablaResponsiva } from '../../shared/tabla-responsiva/tabla-responsiva';
import { BotonCargando } from '../../shared/boton-cargando/boton-cargando';
import { Modal } from '../../shared/modal/modal';

@Component({
  selector: 'app-catalogo-lista',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    TablaResponsiva,
    BotonCargando,
    Modal
  ],
  template: `
    <div class="modulo-header">
      <div class="modulo-titulos">
        <div class="kicker">Catálogo de Productos</div>
        <h1 class="titulo-pagina">Gestión de Inventario y Precios</h1>
        <p class="subtitulo-pagina">Control de referencias, existencias y precios para venta por WhatsApp</p>
      </div>

      <div class="modulo-acciones">
        <a routerLink="/catalogo/nuevo" class="btn-nuevo">
          <span class="material-icons">add_box</span>
          Nuevo Producto
        </a>
      </div>
    </div>

    <!-- Barra de Búsqueda y Filtros -->
    <div class="filtros-card">
      <div class="buscador-wrap">
        <span class="material-icons buscador-icono">search</span>
        <input
          type="text"
          [formControl]="controlBusqueda"
          placeholder="Buscar por nombre o referencia (ej. JAB-001)..."
          class="buscador-input"
        />
        @if (terminoBusqueda()) {
          <button type="button" class="btn-limpiar-busqueda" (click)="controlBusqueda.setValue('')">
            <span class="material-icons">close</span>
          </button>
        }
      </div>

      <div class="filtro-estados">
        <label class="switch-filtro">
          <input
            type="checkbox"
            [checked]="mostrarSoloActivos()"
            (change)="alternarSoloActivos()"
          />
          <span class="switch-label">Solo activos para venta</span>
        </label>
      </div>
    </div>

    <!-- Tabla Responsiva de Productos -->
    <app-tabla-responsiva
      [cargando]="cargando()"
      [error]="errorCarga()"
      [totalElementos]="productosFiltrados().length"
      [mensajeCargando]="'Consultando catálogo de productos...'"
      [tituloVacio]="'No se encontraron productos'"
      [mensajeVacio]="terminoBusqueda() ? 'No hay coincidencias para la búsqueda.' : 'No hay productos registrados en el sistema.'"
      [iconoVacio]="'inventory_2'"
      (reintentar)="cargarProductos()"
    >
      <!-- Vista Desktop / Tablet: Tabla Estructurada -->
      <table class="tabla-dorada desktop-only">
        <thead>
          <tr>
            <th style="width: 15%">Referencia</th>
            <th style="width: 35%">Producto</th>
            <th style="width: 15%" class="text-right">Precio COP</th>
            <th style="width: 15%" class="text-center">Existencias</th>
            <th style="width: 10%" class="text-center">Estado</th>
            <th style="width: 10%" class="text-right">Acciones</th>
          </tr>
        </thead>
        <tbody>
          @for (prod of productosFiltrados(); track prod.id) {
            <tr [class.fila-inactiva]="!prod.activo">
              <td>
                <span class="codigo-ref">{{ prod.referencia }}</span>
              </td>
              <td>
                <div class="nombre-producto">{{ prod.nombre }}</div>
              </td>
              <td class="text-right font-mono valor-precio">
                {{ formatearMoneda(prod.precio) }}
              </td>
              <td class="text-center">
                <span
                  class="badge-stock"
                  [class]="obtenerClaseStock(prod.existencias)"
                  [title]="prod.existencias + ' unidades físicas disponibles'"
                >
                  <span class="stock-num">{{ prod.existencias }}</span>
                  <span class="stock-unidad">uds</span>
                </span>
              </td>
              <td class="text-center">
                @if (prod.activo) {
                  <span class="badge-activo">Activo</span>
                } @else {
                  <span class="badge-inactivo">Inactivo</span>
                }
              </td>
              <td class="text-right">
                <div class="acciones-fila">
                  <button
                    type="button"
                    class="btn-accion-icono btn-ajustar"
                    (click)="abrirModalStock(prod)"
                    title="Ajustar existencias físicas"
                  >
                    <span class="material-icons">swap_vert</span>
                  </button>

                  <a
                    [routerLink]="['/catalogo', prod.id]"
                    class="btn-accion-icono"
                    title="Editar información del producto"
                  >
                    <span class="material-icons">edit</span>
                  </a>

                  <button
                    type="button"
                    class="btn-accion-icono"
                    [class.btn-activar]="!prod.activo"
                    [class.btn-desactivar]="prod.activo"
                    (click)="confirmarAlternarActivo(prod)"
                    [title]="prod.activo ? 'Desactivar producto' : 'Activar producto'"
                  >
                    <span class="material-icons">{{ prod.activo ? 'toggle_on' : 'toggle_off' }}</span>
                  </button>
                </div>
              </td>
            </tr>
          }
        </tbody>
      </table>

      <!-- Vista Móvil: Tarjetas Apiladas (Responsive) -->
      <div class="tarjetas-movil mobile-only">
        @for (prod of productosFiltrados(); track prod.id) {
          <div class="tarjeta-producto" [class.tarjeta-inactiva]="!prod.activo">
            <div class="tarjeta-header">
              <span class="codigo-ref">{{ prod.referencia }}</span>
              @if (prod.activo) {
                <span class="badge-activo">Activo</span>
              } @else {
                <span class="badge-inactivo">Inactivo</span>
              }
            </div>

            <h3 class="tarjeta-nombre">{{ prod.nombre }}</h3>

            <div class="tarjeta-detalles">
              <div class="detalle-col">
                <span class="detalle-label">Precio:</span>
                <span class="detalle-valor font-mono">{{ formatearMoneda(prod.precio) }}</span>
              </div>
              <div class="detalle-col">
                <span class="detalle-label">Stock:</span>
                <span class="badge-stock" [class]="obtenerClaseStock(prod.existencias)">
                  {{ prod.existencias }} uds
                </span>
              </div>
            </div>

            <div class="tarjeta-acciones">
              <button
                type="button"
                class="btn-movil-accion"
                (click)="abrirModalStock(prod)"
              >
                <span class="material-icons">swap_vert</span>
                Ajustar Stock
              </button>

              <a
                [routerLink]="['/catalogo', prod.id]"
                class="btn-movil-accion btn-movil-edit"
              >
                <span class="material-icons">edit</span>
                Editar
              </a>
            </div>
          </div>
        }
      </div>
    </app-tabla-responsiva>

    <!-- Modal para Ajuste Rápido de Existencias (Bodega / Admin) -->
    <app-modal
      [abierto]="modalStockAbierto()"
      [titulo]="'Ajustar Existencias de Inventario'"
      [icono]="'inventory'"
      [tamano]="'sm'"
      (cerrar)="cerrarModalStock()"
    >
      @if (productoSeleccionado(); as prod) {
        <div class="modal-stock-contenido">
          <p class="modal-stock-info">
            Producto: <strong>{{ prod.nombre }}</strong><br>
            Referencia: <span class="font-mono">{{ prod.referencia }}</span>
          </p>

          <div class="stock-actual-caja">
            <span class="caja-label">Existencias actuales en sistema:</span>
            <span class="caja-valor">{{ prod.existencias }} unidades</span>
          </div>

          <div class="form-group mt-4">
            <label for="nuevoStock" class="form-label">Nuevo conteo físico (uds):</label>
            <input
              id="nuevoStock"
              type="number"
              min="0"
              step="1"
              [value]="nuevoStockValor()"
              (input)="alCambiarNuevoStock($event)"
              class="form-control text-center text-lg font-bold"
            />
          </div>
        </div>
      }

      <div slot="footer" class="modal-footer-btns">
        <app-boton-cargando
          [variante]="'secundario'"
          (accionar)="cerrarModalStock()"
        >
          Cancelar
        </app-boton-cargando>

        <app-boton-cargando
          [variante]="'dorado'"
          [cargando]="guardandoStock()"
          [icono]="'check'"
          (accionar)="guardarNuevoStock()"
        >
          Confirmar Ajuste
        </app-boton-cargando>
      </div>
    </app-modal>
  `,
  styles: [`
    .modulo-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 1.5rem;
      margin-bottom: 1.75rem;
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

    .btn-nuevo {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      background: #0f2744;
      color: #ffffff;
      padding: 0.65rem 1.25rem;
      border-radius: 0.625rem;
      font-weight: 700;
      font-size: 0.875rem;
      text-decoration: none;
      box-shadow: 0 2px 4px rgba(15, 39, 68, 0.15);
      transition: background 0.15s, transform 0.15s;
    }
    .btn-nuevo:hover {
      background: #16365c;
      transform: translateY(-1px);
    }

    /* Filtros y Buscador */
    .filtros-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 0.875rem;
      padding: 1rem 1.25rem;
      margin-bottom: 1.25rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      flex-wrap: wrap;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
    }

    .buscador-wrap {
      flex: 1;
      min-width: 18rem;
      position: relative;
      display: flex;
      align-items: center;
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 0.5rem;
      padding: 0 0.75rem;
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

    .btn-limpiar-busqueda {
      background: transparent;
      border: none;
      color: #94a3b8;
      cursor: pointer;
      display: flex;
      align-items: center;
    }

    .filtro-estados {
      display: flex;
      align-items: center;
    }

    .switch-filtro {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      cursor: pointer;
      font-size: 0.875rem;
      color: #334155;
      font-weight: 500;
      user-select: none;
    }

    /* Tabla Estructurada Propia */
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
      user-select: none;
    }

    .tabla-dorada td {
      padding: 1rem 1.25rem;
      border-bottom: 1px solid #f1f5f9;
      font-size: 0.875rem;
      color: #1e293b;
      vertical-align: middle;
    }

    .tabla-dorada tr:hover td {
      background-color: #f8fafc;
    }

    .fila-inactiva td {
      opacity: 0.6;
    }

    .codigo-ref {
      display: inline-block;
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.8125rem;
      font-weight: 600;
      color: #0f2744;
      background: #f1f5f9;
      padding: 0.2rem 0.5rem;
      border-radius: 0.375rem;
      border: 1px solid #e2e8f0;
    }

    .nombre-producto {
      font-weight: 600;
      color: #0f2744;
    }

    .valor-precio {
      font-weight: 700;
      color: #0f2744;
    }

    /* Badges de Existencias (§8) */
    .badge-stock {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      padding: 0.25rem 0.625rem;
      border-radius: 9999px;
      font-size: 0.8125rem;
      font-weight: 700;
      border: 1px solid transparent;
    }

    .stock-verde {
      background: #dcfce7;
      color: #15803d;
      border-color: #bbf7d0;
    }

    .stock-ambar {
      background: #fef3c7;
      color: #b45309;
      border-color: #fde68a;
    }

    .stock-rojo {
      background: #fee2e2;
      color: #b91c1c;
      border-color: #fecaca;
    }

    .stock-unidad {
      font-size: 0.6875rem;
      font-weight: 500;
      opacity: 0.85;
    }

    .badge-activo {
      display: inline-block;
      padding: 0.2rem 0.5rem;
      border-radius: 0.375rem;
      background: #ecfdf5;
      color: #065f46;
      font-size: 0.75rem;
      font-weight: 600;
    }

    .badge-inactivo {
      display: inline-block;
      padding: 0.2rem 0.5rem;
      border-radius: 0.375rem;
      background: #f1f5f9;
      color: #64748b;
      font-size: 0.75rem;
      font-weight: 600;
    }

    .acciones-fila {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 0.375rem;
    }

    .btn-accion-icono {
      background: transparent;
      border: 1px solid transparent;
      color: #64748b;
      padding: 0.375rem;
      border-radius: 0.375rem;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      transition: all 0.15s ease;
      text-decoration: none;
    }
    .btn-accion-icono:hover {
      background: #f1f5f9;
      color: #0f2744;
      border-color: #cbd5e1;
    }
    .btn-accion-icono .material-icons {
      font-size: 1.25rem;
    }

    .btn-ajustar {
      color: #b89326;
    }
    .btn-ajustar:hover {
      background: #fef9c3;
      color: #854d0e;
    }

    .btn-desactivar:hover {
      color: #dc2626;
    }
    .btn-activar {
      color: #059669;
    }

    /* Modal Stock */
    .modal-stock-contenido {
      text-align: center;
    }

    .modal-stock-info {
      margin: 0 0 1rem 0;
      color: #475569;
      font-size: 0.875rem;
    }

    .stock-actual-caja {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 0.5rem;
      padding: 0.75rem;
      margin-bottom: 1.25rem;
    }

    .caja-label {
      display: block;
      font-size: 0.75rem;
      color: #64748b;
      text-transform: uppercase;
      font-weight: 600;
      margin-bottom: 0.25rem;
    }

    .caja-valor {
      font-size: 1.25rem;
      font-weight: 800;
      color: #0f2744;
    }

    .form-group {
      text-align: left;
    }

    .form-label {
      display: block;
      font-size: 0.875rem;
      font-weight: 600;
      color: #1e293b;
      margin-bottom: 0.375rem;
    }

    .form-control {
      width: 100%;
      box-sizing: border-box;
      padding: 0.65rem 0.875rem;
      border: 1px solid #cbd5e1;
      border-radius: 0.5rem;
      font-size: 1rem;
      color: #0f2744;
      outline: none;
      font-family: inherit;
    }
    .form-control:focus {
      border-color: #0f2744;
      box-shadow: 0 0 0 3px rgba(15, 39, 68, 0.1);
    }

    .modal-footer-btns {
      display: flex;
      gap: 0.75rem;
      width: 100%;
      justify-content: flex-end;
    }

    /* Tarjetas Móvil */
    .desktop-only {
      display: table;
    }
    .mobile-only {
      display: none;
    }

    @media (max-width: 768px) {
      .desktop-only {
        display: none !important;
      }
      .mobile-only {
        display: flex !important;
        flex-direction: column;
        gap: 0.875rem;
        padding: 0.875rem;
      }

      .tarjeta-producto {
        background: #ffffff;
        border: 1px solid #e2e8f0;
        border-radius: 0.75rem;
        padding: 1rem;
        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
      }

      .tarjeta-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 0.5rem;
      }

      .tarjeta-nombre {
        margin: 0 0 0.75rem 0;
        font-size: 1rem;
        font-weight: 700;
        color: #0f2744;
      }

      .tarjeta-detalles {
        display: flex;
        justify-content: space-between;
        background: #f8fafc;
        border-radius: 0.5rem;
        padding: 0.625rem 0.875rem;
        margin-bottom: 0.875rem;
      }

      .detalle-label {
        display: block;
        font-size: 0.75rem;
        color: #64748b;
        margin-bottom: 0.125rem;
      }

      .detalle-valor {
        font-size: 0.9375rem;
        font-weight: 700;
        color: #0f2744;
      }

      .tarjeta-acciones {
        display: flex;
        gap: 0.5rem;
      }

      .btn-movil-accion {
        flex: 1;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 0.375rem;
        background: #f1f5f9;
        color: #0f2744;
        border: 1px solid #cbd5e1;
        padding: 0.5rem;
        border-radius: 0.5rem;
        font-size: 0.8125rem;
        font-weight: 600;
        cursor: pointer;
        text-decoration: none;
      }
      .btn-movil-accion .material-icons {
        font-size: 1.1rem;
      }

      .btn-movil-edit {
        background: #0f2744;
        color: #ffffff;
        border-color: #0f2744;
      }
    }

    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .font-mono { font-family: 'JetBrains Mono', monospace; }
  `]
})
export class CatalogoListaComponent implements OnInit {
  private readonly productoService = inject(ProductoService);
  private readonly toast = inject(ToastService);

  readonly productos = signal<Producto[]>([]);
  readonly cargando = signal<boolean>(true);
  readonly errorCarga = signal<string | null>(null);

  readonly controlBusqueda = new FormControl<string>('', { nonNullable: true });
  readonly terminoBusqueda = signal<string>('');
  readonly mostrarSoloActivos = signal<boolean>(false);

  // Modal ajuste existencias
  readonly modalStockAbierto = signal<boolean>(false);
  readonly productoSeleccionado = signal<Producto | null>(null);
  readonly nuevoStockValor = signal<number>(0);
  readonly guardandoStock = signal<boolean>(false);

  // Computado de productos filtrados localmente para mayor agilidad
  readonly productosFiltrados = computed(() => {
    const list = this.productos();
    const query = this.terminoBusqueda().toLowerCase().trim();
    const soloActivos = this.mostrarSoloActivos();

    return list.filter(p => {
      if (soloActivos && !p.activo) return false;
      if (!query) return true;
      return p.nombre.toLowerCase().includes(query) || p.referencia.toLowerCase().includes(query);
    });
  });

  ngOnInit(): void {
    this.controlBusqueda.valueChanges.subscribe(v => this.terminoBusqueda.set(v ?? ''));
    this.cargarProductos();
  }

  async cargarProductos(): Promise<void> {
    this.cargando.set(true);
    this.errorCarga.set(null);
    try {
      const data = await this.productoService.listar();
      this.productos.set(data);
    } catch (err: unknown) {
      const appErr = mapError(err);
      this.errorCarga.set(appErr.mensaje);
    } finally {
      this.cargando.set(false);
    }
  }

  alternarSoloActivos(): void {
    this.mostrarSoloActivos.update(v => !v);
  }

  formatearMoneda(val: number): string {
    return formatearCOP(val);
  }

  obtenerClaseStock(existencias: number): string {
    if (existencias >= 10) return 'stock-verde';
    if (existencias >= 1) return 'stock-ambar';
    return 'stock-rojo';
  }

  abrirModalStock(prod: Producto): void {
    this.productoSeleccionado.set(prod);
    this.nuevoStockValor.set(prod.existencias);
    this.modalStockAbierto.set(true);
  }

  cerrarModalStock(): void {
    this.modalStockAbierto.set(false);
    this.productoSeleccionado.set(null);
  }

  alCambiarNuevoStock(event: Event): void {
    const valor = Number((event.target as HTMLInputElement).value);
    this.nuevoStockValor.set(isNaN(valor) ? 0 : Math.max(0, Math.floor(valor)));
  }

  async guardarNuevoStock(): Promise<void> {
    const prod = this.productoSeleccionado();
    if (!prod) return;

    this.guardandoStock.set(true);
    try {
      const nuevo = this.nuevoStockValor();
      await this.productoService.ajustarExistencias(prod.id, nuevo);
      
      // Actualizar lista local reactiva
      this.productos.update(lista =>
        lista.map(item => item.id === prod.id ? { ...item, existencias: nuevo } : item)
      );

      this.toast.exito(`Existencias de «${prod.referencia}» actualizadas a ${nuevo} uds`);
      this.cerrarModalStock();
    } catch (err: unknown) {
      const appErr = mapError(err);
      this.toast.error(appErr.mensaje);
    } finally {
      this.guardandoStock.set(false);
    }
  }

  async confirmarAlternarActivo(prod: Producto): Promise<void> {
    const nuevoEstado = !prod.activo;
    try {
      await this.productoService.alternarActivo(prod.id, nuevoEstado);
      this.productos.update(lista =>
        lista.map(item => item.id === prod.id ? { ...item, activo: nuevoEstado } : item)
      );
      this.toast.info(`Producto «${prod.referencia}» ${nuevoEstado ? 'activado' : 'desactivado'}`);
    } catch (err: unknown) {
      const appErr = mapError(err);
      this.toast.error(appErr.mensaje);
    }
  }
}

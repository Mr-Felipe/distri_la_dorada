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
    <!-- Vista de Tarjetas: 3 por fila (desktop), responsive a 2 y 1 -->
    <div class="grid-productos">
      @for (prod of productosFiltrados(); track prod.id) {
        <article class="tarjeta-producto" [class.tarjeta-inactiva]="!prod.activo">
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
            <div class="detalle-col detalle-col-derecha">
              <span class="detalle-label">Existencias:</span>
              <span
                class="badge-stock"
                [class]="obtenerClaseStock(prod.existencias)"
                [title]="prod.existencias + ' unidades físicas disponibles'"
              >
                <span class="stock-num">{{ prod.existencias }}</span>
                <span class="stock-unidad">uds</span>
              </span>
            </div>
          </div>

          <div class="tarjeta-acciones">
            <button
              type="button"
              class="btn-accion-tarjeta btn-ajustar"
              (click)="abrirModalStock(prod)"
              title="Ajustar existencias físicas"
            >
              <span class="material-icons">swap_vert</span>
              Ajustar stock
            </button>

            <a
              [routerLink]="['/catalogo', prod.id]"
              class="btn-accion-tarjeta btn-editar-tarjeta"
              title="Editar información del producto"
            >
              <span class="material-icons">edit</span>
              Editar
            </a>

            <button
              type="button"
              class="btn-accion-tarjeta"
              [class.btn-activar]="!prod.activo"
              [class.btn-desactivar]="prod.activo"
              (click)="confirmarAlternarActivo(prod)"
              [title]="prod.activo ? 'Desactivar producto' : 'Activar producto'"
            >
              <span class="material-icons">{{ prod.activo ? 'toggle_on' : 'toggle_off' }}</span>
              {{ prod.activo ? 'Desactivar' : 'Activar' }}
            </button>
          </div>
        </article>
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

    /* Grid de Tarjetas de Productos (3 por fila) */
    .grid-productos {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 1rem;
      padding: 1.25rem;
    }

    .tarjeta-producto {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 0.75rem;
      padding: 1rem;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
      display: flex;
      flex-direction: column;
      transition: box-shadow 0.15s, transform 0.15s;
    }
    .tarjeta-producto:hover {
      box-shadow: 0 4px 12px rgba(15, 39, 68, 0.08);
      transform: translateY(-2px);
    }

    .tarjeta-inactiva {
      opacity: 0.6;
    }

    .tarjeta-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 0.5rem;
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
      align-items: flex-end;
      gap: 0.75rem;
      background: #f8fafc;
      border-radius: 0.5rem;
      padding: 0.625rem 0.875rem;
      margin-bottom: 0.875rem;
    }

    .detalle-col-derecha {
      text-align: right;
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

    .tarjeta-acciones {
      display: flex;
      gap: 0.5rem;
      margin-top: auto;
    }

    .btn-accion-tarjeta {
      flex: 1;
      min-width: 0;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.375rem;
      background: #f1f5f9;
      color: #0f2744;
      border: 1px solid #cbd5e1;
      padding: 0.5rem 0.375rem;
      border-radius: 0.5rem;
      font-size: 0.8125rem;
      font-weight: 600;
      cursor: pointer;
      text-decoration: none;
      white-space: nowrap;
      overflow: hidden;
      transition: all 0.15s ease;
    }
    .btn-accion-tarjeta .material-icons {
      font-size: 1.1rem;
    }
    .btn-accion-tarjeta:hover {
      background: #e2e8f0;
      color: #0f2744;
      border-color: #94a3b8;
    }

    .btn-editar-tarjeta {
      background: #0f2744;
      color: #ffffff;
      border-color: #0f2744;
    }
    .btn-editar-tarjeta:hover {
      background: #16365c;
      color: #ffffff;
      border-color: #16365c;
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

    /* Responsive del grid de tarjetas */
    @media (max-width: 1100px) {
      .grid-productos {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }

    @media (max-width: 768px) {
      .grid-productos {
        grid-template-columns: 1fr;
        padding: 0.875rem;
        gap: 0.875rem;
      }

      .tarjeta-acciones {
        flex-wrap: wrap;
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

import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ProductoService } from '../../core/services/producto.service';
import { ToastService } from '../../core/services/toast.service';
import { BotonCargando } from '../../shared/boton-cargando/boton-cargando';
import { formatearCOP } from '../../core/utils/formato';
import { mapError } from '../../core/utils/errores';

@Component({
  selector: 'app-producto-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, BotonCargando],
  template: `
    <div class="form-page-container">
      <div class="form-header">
        <a routerLink="/catalogo" class="btn-volver">
          <span class="material-icons">arrow_back</span>
          Volver al catálogo
        </a>
        <h1 class="form-title">
          {{ esModoEdicion() ? 'Editar Producto' : 'Nuevo Producto' }}
        </h1>
        <p class="form-subtitle">
          {{ esModoEdicion() ? 'Actualiza los datos comerciales y de inventario del producto.' : 'Registra un nuevo producto en el catálogo de Distribuidora La Dorada.' }}
        </p>
      </div>

      @if (cargandoInicial()) {
        <div class="cargando-wrap">
          <div class="spinner-inline"></div>
          <p>Cargando información del producto...</p>
        </div>
      } @else {
        <form [formGroup]="formulario" (ngSubmit)="guardar()" class="card-formulario" novalidate>
          @if (errorServidor()) {
            <div class="banner-error" role="alert">
              <span class="material-icons">error_outline</span>
              <div>
                <strong>Error al procesar:</strong>
                <p>{{ errorServidor() }}</p>
              </div>
            </div>
          }

          <div class="grid-campos">
            <!-- Referencia -->
            <div class="campo-grupo">
              <label for="referencia" class="campo-label">
                Referencia única <span class="requerido">*</span>
              </label>
              <input
                id="referencia"
                type="text"
                formControlName="referencia"
                placeholder="Ej. REF-ARR-01"
                class="campo-control font-mono uppercase"
                [class.campo-invalido]="campoInvalido('referencia')"
              />
              <span class="campo-ayuda">Código alfanumérico único para el producto</span>
              @if (campoInvalido('referencia')) {
                <span class="error-msg">La referencia es obligatoria</span>
              }
            </div>

            <!-- Nombre -->
            <div class="campo-grupo span-2">
              <label for="nombre" class="campo-label">
                Nombre del producto <span class="requerido">*</span>
              </label>
              <input
                id="nombre"
                type="text"
                formControlName="nombre"
                maxlength="120"
                placeholder="Ej. Arroz Diana Premium 1000g"
                class="campo-control"
                [class.campo-invalido]="campoInvalido('nombre')"
              />
              <div class="campo-flex-meta">
                <span class="campo-ayuda">Máximo 120 caracteres</span>
                <span class="char-count">{{ formulario.controls.nombre.value.length || 0 }}/120</span>
              </div>
              @if (campoInvalido('nombre')) {
                <span class="error-msg">El nombre es obligatorio (hasta 120 caracteres)</span>
              }
            </div>

            <!-- Precio -->
            <div class="campo-grupo">
              <label for="precio" class="campo-label">
                Precio unitario (COP) <span class="requerido">*</span>
              </label>
              <input
                id="precio"
                type="number"
                min="0.01"
                step="0.01"
                formControlName="precio"
                placeholder="0"
                class="campo-control font-mono"
                [class.campo-invalido]="campoInvalido('precio')"
              />
              <span class="campo-ayuda">Vista previa: {{ formatearPreview(formulario.controls.precio.value) }}</span>
              @if (campoInvalido('precio')) {
                <span class="error-msg">El precio debe ser un número mayor a 0</span>
              }
            </div>

            <!-- Existencias -->
            <div class="campo-grupo">
              <label for="existencias" class="campo-label">
                Existencias iniciales (Stock)
              </label>
              <input
                id="existencias"
                type="number"
                min="0"
                step="1"
                formControlName="existencias"
                placeholder="0"
                class="campo-control font-mono"
                [class.campo-invalido]="campoInvalido('existencias')"
              />
              <span class="campo-ayuda">Unidades físicas en bodega</span>
            </div>

            <!-- Activo para venta -->
            <div class="campo-grupo span-2 mt-2">
              <label class="checkbox-label">
                <input
                  type="checkbox"
                  formControlName="activo"
                />
                <span class="checkbox-text">
                  <strong>Producto activo para venta</strong>
                  <span class="checkbox-desc">Si está desactivado, no se podrá agregar a nuevos pedidos.</span>
                </span>
              </label>
            </div>
          </div>

          <!-- Acciones del formulario -->
          <div class="form-acciones">
            <a routerLink="/catalogo" class="btn-cancelar">Cancelar</a>
            <app-boton-cargando
              [tipo]="'submit'"
              [variante]="'dorado'"
              [tamano]="'md'"
              [cargando]="guardando()"
              [deshabilitado]="formulario.invalid"
              [icono]="'save'"
              [textoCargando]="'Guardando producto...'"
            >
              {{ esModoEdicion() ? 'Actualizar Producto' : 'Crear Producto' }}
            </app-boton-cargando>
          </div>
        </form>
      }
    </div>
  `,
  styles: [`
    .form-page-container {
      max-width: 44rem;
      margin: 0 auto;
      padding-bottom: 3rem;
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
      margin-bottom: 0.75rem;
      transition: color 0.15s;
    }
    .btn-volver:hover {
      color: #0f2744;
    }
    .btn-volver .material-icons {
      font-size: 1.1rem;
    }

    .form-title {
      font-size: 1.625rem;
      font-weight: 800;
      color: #0f2744;
      margin: 0;
    }

    .form-subtitle {
      margin: 0.25rem 0 0 0;
      font-size: 0.875rem;
      color: #64748b;
    }

    .card-formulario {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 1rem;
      padding: 1.75rem 2rem;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
    }

    .banner-error {
      background: #fef2f2;
      border-left: 4px solid #dc2626;
      border-radius: 0.5rem;
      padding: 0.875rem 1rem;
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
      margin-bottom: 1.5rem;
      color: #b91c1c;
      font-size: 0.875rem;
    }

    .grid-campos {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 1.25rem;
    }

    .span-2 {
      grid-column: span 2;
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
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .requerido {
      color: #dc2626;
    }

    .badge-bloqueado {
      font-size: 0.6875rem;
      font-weight: 600;
      color: #94a3b8;
    }

    .campo-control {
      padding: 0.65rem 0.875rem;
      border: 1px solid #cbd5e1;
      border-radius: 0.5rem;
      background: #ffffff;
      font-size: 0.9375rem;
      color: #0f2744;
      outline: none;
      font-family: inherit;
      transition: border-color 0.15s, box-shadow 0.15s;
    }

    .campo-control:focus {
      border-color: #0f2744;
      box-shadow: 0 0 0 3px rgba(15, 39, 68, 0.12);
    }

    .campo-deshabilitado {
      background-color: #f1f5f9;
      cursor: not-allowed;
      color: #64748b;
    }

    .campo-invalido {
      border-color: #dc2626;
      background-color: #fffafa;
    }

    .campo-ayuda {
      font-size: 0.75rem;
      color: #64748b;
    }

    .campo-flex-meta {
      display: flex;
      justify-content: space-between;
    }

    .char-count {
      font-size: 0.75rem;
      color: #94a3b8;
      font-family: 'JetBrains Mono', monospace;
    }

    .error-msg {
      font-size: 0.75rem;
      color: #dc2626;
      font-weight: 600;
    }

    .checkbox-label {
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
      cursor: pointer;
      user-select: none;
      padding: 0.75rem;
      background: #f8fafc;
      border-radius: 0.5rem;
      border: 1px solid #e2e8f0;
    }

    .checkbox-text strong {
      display: block;
      font-size: 0.875rem;
      color: #0f2744;
    }

    .checkbox-desc {
      display: block;
      font-size: 0.75rem;
      color: #64748b;
      margin-top: 0.125rem;
    }

    .form-acciones {
      margin-top: 2rem;
      padding-top: 1.25rem;
      border-top: 1px solid #e2e8f0;
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 1rem;
    }

    .btn-cancelar {
      color: #64748b;
      font-size: 0.875rem;
      font-weight: 600;
      text-decoration: none;
      padding: 0.5rem 1rem;
      border-radius: 0.5rem;
      transition: background 0.15s;
    }
    .btn-cancelar:hover {
      background: #f1f5f9;
      color: #0f2744;
    }

    .cargando-wrap {
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
      .grid-campos {
        grid-template-columns: 1fr;
      }
      .span-2 {
        grid-column: span 1;
      }
      .card-formulario {
        padding: 1.25rem 1rem;
      }
    }

    .font-mono { font-family: 'JetBrains Mono', monospace; }
    .uppercase { text-transform: uppercase; }
  `]
})
export class ProductoFormComponent implements OnInit {
  private readonly productoService = inject(ProductoService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  readonly esModoEdicion = signal<boolean>(false);
  readonly productoId = signal<string | null>(null);
  readonly cargandoInicial = signal<boolean>(false);
  readonly guardando = signal<boolean>(false);
  readonly errorServidor = signal<string | null>(null);

  readonly formulario = new FormGroup({
    referencia: new FormControl<string>('', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(/^[A-Za-z0-9_-]+$/)]
    }),
    nombre: new FormControl<string>('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(120)]
    }),
    precio: new FormControl<number>(0, {
      nonNullable: true,
      validators: [Validators.required, Validators.min(0.01)]
    }),
    existencias: new FormControl<number>(0, {
      nonNullable: true,
      validators: [Validators.required, Validators.min(0)]
    }),
    activo: new FormControl<boolean>(true, {
      nonNullable: true
    })
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id && id !== 'nuevo') {
      this.esModoEdicion.set(true);
      this.productoId.set(id);
      this.cargarProducto(id);
    }
  }

  async cargarProducto(id: string): Promise<void> {
    this.cargandoInicial.set(true);
    try {
      const prod = await this.productoService.obtenerPorId(id);
      this.formulario.patchValue({
        referencia: prod.referencia,
        nombre: prod.nombre,
        precio: prod.precio,
        existencias: prod.existencias,
        activo: prod.activo
      });
    } catch {
      this.toast.error('No se pudo encontrar el producto solicitado');
      this.router.navigate(['/catalogo']);
    } finally {
      this.cargandoInicial.set(false);
    }
  }

  campoInvalido(nombre: keyof typeof this.formulario.controls): boolean {
    const ctrl = this.formulario.controls[nombre];
    return ctrl.invalid && (ctrl.dirty || ctrl.touched);
  }

  formatearPreview(val: number | null | undefined): string {
    return formatearCOP(val);
  }

  async guardar(): Promise<void> {
    if (this.formulario.invalid || this.guardando()) return;

    this.guardando.set(true);
    this.errorServidor.set(null);

    const raw = this.formulario.getRawValue();

    try {
      if (this.esModoEdicion() && this.productoId()) {
        await this.productoService.actualizar(this.productoId()!, {
          referencia: raw.referencia,
          nombre: raw.nombre,
          precio: raw.precio,
          existencias: raw.existencias,
          activo: raw.activo
        });
        this.toast.exito(`Producto «${raw.referencia}» actualizado`);
      } else {
        await this.productoService.crear({
          referencia: raw.referencia,
          nombre: raw.nombre,
          precio: raw.precio,
          existencias: raw.existencias,
          activo: raw.activo
        });
        this.toast.exito(`Producto «${raw.referencia}» registrado exitosamente`);
      }

      this.router.navigate(['/catalogo']);
    } catch (err: unknown) {
      const appErr = mapError(err);
      this.errorServidor.set(appErr.mensaje);
      this.toast.error(appErr.mensaje);
    } finally {
      this.guardando.set(false);
    }
  }
}

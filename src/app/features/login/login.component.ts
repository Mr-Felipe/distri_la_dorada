import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { BotonCargando } from '../../shared/boton-cargando/boton-cargando';
import { ToastService } from '../../core/services/toast.service';

interface CredencialPrueba {
  email: string;
  clave: string;
  rol: string;
  descripcion: string;
}

@Component({
  selector: 'app-login',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, BotonCargando],
  template: `
    <div class="login-wrapper">
      <div class="login-card">
        <!-- Logo / Marca -->
        <div class="brand-section">
          <div class="logo-shield">
            <span class="material-icons logo-icon">warehouse</span>
          </div>
          <span class="brand-kicker">Distribuidora La Dorada S.A.S.</span>
          <h1 class="brand-title">Gestión de Pedidos e Inventario</h1>
          <p class="brand-sub">Ingreso seguro al sistema comercial y logístico</p>
        </div>

        @if (errorMensaje()) {
          <div class="error-banner" role="alert">
            <span class="material-icons banner-icon">error</span>
            <div class="banner-body">
              <strong>Error de ingreso</strong>
              <p>{{ errorMensaje() }}</p>
            </div>
          </div>
        }

        <!-- Formulario -->
        <form [formGroup]="formulario" (ngSubmit)="ingresar()" class="form-login" novalidate>
          <div class="form-group">
            <label for="email" class="form-label">Correo electrónico</label>
            <div class="input-wrap" [class.input-invalid]="emailInvalido()">
              <span class="material-icons input-icon">email</span>
              <input
                id="email"
                type="email"
                formControlName="email"
                placeholder="ejemplo@ladorada.test"
                autocomplete="email"
                class="form-control"
              />
            </div>
            @if (emailInvalido()) {
              <span class="field-error">Ingresa un correo electrónico válido</span>
            }
          </div>

          <div class="form-group">
            <label for="password" class="form-label">Contraseña</label>
            <div class="input-wrap" [class.input-invalid]="passwordInvalido()">
              <span class="material-icons input-icon">lock</span>
              <input
                id="password"
                [type]="mostrarClave() ? 'text' : 'password'"
                formControlName="password"
                placeholder="••••••••"
                autocomplete="current-password"
                class="form-control"
              />
              <button
                type="button"
                class="btn-toggle-eye"
                (click)="toggleMostrarClave()"
                [attr.aria-label]="mostrarClave() ? 'Ocultar contraseña' : 'Ver contraseña'"
              >
                <span class="material-icons">{{ mostrarClave() ? 'visibility_off' : 'visibility' }}</span>
              </button>
            </div>
            @if (passwordInvalido()) {
              <span class="field-error">La contraseña es obligatoria</span>
            }
          </div>

          <div class="submit-wrap">
            <app-boton-cargando
              [tipo]="'submit'"
              [variante]="'primario'"
              [tamano]="'lg'"
              [cargando]="enviando()"
              [deshabilitado]="formulario.invalid"
              [textoCargando]="'Iniciando sesión...'"
              [icono]="'login'"
            >
              Iniciar sesión
            </app-boton-cargando>
          </div>
        </form>

        <!-- Accesos rápidos de prueba (Docencia / Auditoría) -->
        <div class="test-users-card">
          <div class="test-header">
            <span class="material-icons test-header-icon">supervised_user_circle</span>
            <span class="test-header-text">Usuarios de prueba disponibles (haz clic para autocompletar):</span>
          </div>

          <div class="test-grid">
            @for (cred of usuariosPrueba; track cred.email) {
              <button
                type="button"
                class="test-user-pill"
                (click)="autocompletar(cred.email, cred.clave)"
                [title]="'Cargar credenciales de ' + cred.rol"
              >
                <div class="pill-top">
                  <span class="pill-role" [class]="'pill-' + cred.rol">{{ cred.rol }}</span>
                  <span class="pill-desc">{{ cred.descripcion }}</span>
                </div>
                <div class="pill-email">{{ cred.email }}</div>
              </button>
            }
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .login-wrapper {
      min-height: 100vh;
      background: radial-gradient(circle at 50% 20%, #16365c 0%, #0a192f 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1.5rem 1rem;
    }

    .login-card {
      background: #ffffff;
      border-radius: 1.25rem;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.4);
      width: 100%;
      max-width: 31rem;
      padding: 2.25rem 2rem;
      border: 1px solid rgba(255, 255, 255, 0.1);
    }

    .brand-section {
      text-align: center;
      margin-bottom: 2rem;
    }

    .logo-shield {
      width: 4rem;
      height: 4rem;
      margin: 0 auto 1rem auto;
      background: linear-gradient(135deg, #d4af37 0%, #b89326 100%);
      border-radius: 1rem;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 14px rgba(212, 175, 55, 0.35);
    }

    .logo-icon {
      font-size: 2.25rem;
      color: #0a192f;
    }

    .brand-kicker {
      display: block;
      font-size: 0.8125rem;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      font-weight: 800;
      color: #b89326;
      margin-bottom: 0.25rem;
    }

    .brand-title {
      font-size: 1.5rem;
      font-weight: 800;
      color: #0f2744;
      margin: 0;
      letter-spacing: -0.02em;
    }

    .brand-sub {
      margin: 0.375rem 0 0 0;
      font-size: 0.875rem;
      color: #64748b;
    }

    .error-banner {
      background: #fef2f2;
      border-left: 4px solid #dc2626;
      border-radius: 0.5rem;
      padding: 0.875rem 1rem;
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
      margin-bottom: 1.5rem;
    }

    .banner-icon {
      color: #dc2626;
      font-size: 1.25rem;
      margin-top: 0.1rem;
    }

    .banner-body strong {
      display: block;
      color: #991b1b;
      font-size: 0.875rem;
    }

    .banner-body p {
      margin: 0.2rem 0 0 0;
      color: #b91c1c;
      font-size: 0.8125rem;
    }

    .form-login {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 0.375rem;
    }

    .form-label {
      font-size: 0.875rem;
      font-weight: 600;
      color: #1e293b;
    }

    .input-wrap {
      position: relative;
      display: flex;
      align-items: center;
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 0.625rem;
      transition: all 0.15s ease;
    }

    .input-wrap:focus-within {
      border-color: #0f2744;
      background: #ffffff;
      box-shadow: 0 0 0 3px rgba(15, 39, 68, 0.12);
    }

    .input-invalid {
      border-color: #dc2626 !important;
      background: #fffafa !important;
    }

    .input-icon {
      margin-left: 0.875rem;
      color: #94a3b8;
      font-size: 1.25rem;
    }

    .form-control {
      flex: 1;
      border: none;
      background: transparent;
      padding: 0.75rem 0.875rem;
      font-size: 0.9375rem;
      color: #0f2744;
      font-family: inherit;
      outline: none;
    }

    .form-control::placeholder {
      color: #94a3b8;
    }

    .btn-toggle-eye {
      background: transparent;
      border: none;
      color: #94a3b8;
      cursor: pointer;
      padding: 0.75rem;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .btn-toggle-eye:hover {
      color: #0f2744;
    }

    .field-error {
      font-size: 0.75rem;
      color: #dc2626;
      font-weight: 500;
    }

    .submit-wrap {
      margin-top: 0.75rem;
    }
    .submit-wrap app-boton-cargando {
      display: block;
      width: 100%;
    }
    :host ::ng-deep .submit-wrap .btn {
      width: 100%;
    }

    .test-users-card {
      margin-top: 2rem;
      padding-top: 1.5rem;
      border-top: 1px dashed #e2e8f0;
    }

    .test-header {
      display: flex;
      align-items: center;
      gap: 0.375rem;
      margin-bottom: 0.75rem;
    }

    .test-header-icon {
      font-size: 1.1rem;
      color: #64748b;
    }

    .test-header-text {
      font-size: 0.75rem;
      font-weight: 600;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .test-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 0.5rem;
    }

    .test-user-pill {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 0.5rem;
      padding: 0.5rem 0.625rem;
      text-align: left;
      cursor: pointer;
      transition: all 0.15s ease;
      font-family: inherit;
    }

    .test-user-pill:hover {
      border-color: #0f2744;
      background: #f1f5f9;
      transform: translateY(-1px);
    }

    .pill-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.25rem;
      margin-bottom: 0.2rem;
    }

    .pill-role {
      font-size: 0.6875rem;
      font-weight: 700;
      text-transform: uppercase;
      padding: 0.1rem 0.35rem;
      border-radius: 0.25rem;
    }

    .pill-admin {
      background: #fee2e2;
      color: #991b1b;
    }
    .pill-vendedor {
      background: #fef3c7;
      color: #92400e;
    }
    .pill-bodega {
      background: #e0f2fe;
      color: #075985;
    }

    .pill-desc {
      font-size: 0.6875rem;
      color: #94a3b8;
    }

    .pill-email {
      font-size: 0.75rem;
      color: #334155;
      font-family: 'JetBrains Mono', monospace;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    @media (max-width: 480px) {
      .login-card {
        padding: 1.75rem 1.25rem;
      }
      .test-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class LoginComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  readonly enviando = signal<boolean>(false);
  readonly errorMensaje = signal<string | null>(null);
  readonly mostrarClave = signal<boolean>(false);

  readonly formulario = new FormGroup({
    email: new FormControl<string>('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email]
    }),
    password: new FormControl<string>('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(4)]
    })
  });

  readonly usuariosPrueba: CredencialPrueba[] = [
    { email: 'admin@ladorada.test', clave: 'Admin1234*', rol: 'admin', descripcion: 'Control total' },
    { email: 'vendedor@ladorada.test', clave: 'Vende1234*', rol: 'vendedor', descripcion: 'Pedidos y ventas' },
    { email: 'bodega@ladorada.test', clave: 'Bode1234*', rol: 'bodega', descripcion: 'Despacho y stock' },
    { email: 'prueba@ladorada.test', clave: 'Prueba1234*', rol: 'vendedor', descripcion: 'Segundo vendedor' }
  ];

  ngOnInit(): void {
    if (this.auth.autenticado()) {
      this.router.navigate(['/catalogo']);
    }
  }

  emailInvalido(): boolean {
    const c = this.formulario.controls.email;
    return c.invalid && (c.dirty || c.touched);
  }

  passwordInvalido(): boolean {
    const c = this.formulario.controls.password;
    return c.invalid && (c.dirty || c.touched);
  }

  toggleMostrarClave(): void {
    this.mostrarClave.update(v => !v);
  }

  autocompletar(email: string, clave: string): void {
    this.formulario.setValue({ email, password: clave });
    this.errorMensaje.set(null);
  }

  async ingresar(): Promise<void> {
    if (this.formulario.invalid || this.enviando()) return;

    this.enviando.set(true);
    this.errorMensaje.set(null);

    const { email, password } = this.formulario.getRawValue();

    const resultado = await this.auth.login(email, password);

    if (resultado.exito) {
      this.toast.exito(`Bienvenido, ${this.auth.nombreUsuario()}`);
      this.router.navigate(['/catalogo']);
    } else {
      this.errorMensaje.set(resultado.error || 'Correo o contraseña incorrectos.');
    }

    this.enviando.set(false);
  }
}

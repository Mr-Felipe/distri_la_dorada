import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-no-autorizado',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    <div class="forbidden-container">
      <div class="forbidden-card">
        <div class="icon-wrap">
          <span class="material-icons lock-icon">lock_person</span>
        </div>
        <h1 class="forbidden-title">Acceso Restringido (403)</h1>
        <p class="forbidden-text">
          Tu cuenta con rol <strong class="role-badge">{{ auth.rol() || 'desconocido' }}</strong>
          no cuenta con los permisos necesarios para acceder a este módulo.
        </p>
        <div class="actions">
          <a routerLink="/catalogo" class="btn-home">
            <span class="material-icons">storefront</span>
            Ir al Catálogo
          </a>
          <button type="button" class="btn-back" (click)="regresar()">
            <span class="material-icons">arrow_back</span>
            Regresar
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .forbidden-container {
      min-height: 70vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2rem 1rem;
    }

    .forbidden-card {
      background: #ffffff;
      border-radius: 1.25rem;
      border: 1px solid #e2e8f0;
      box-shadow: 0 10px 25px -5px rgba(15, 39, 68, 0.08);
      padding: 3rem 2rem;
      max-width: 32rem;
      width: 100%;
      text-align: center;
    }

    .icon-wrap {
      width: 4.5rem;
      height: 4.5rem;
      margin: 0 auto 1.5rem auto;
      background: #fee2e2;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .lock-icon {
      font-size: 2.5rem;
      color: #dc2626;
    }

    .forbidden-title {
      font-size: 1.5rem;
      font-weight: 800;
      color: #0f2744;
      margin: 0 0 0.75rem 0;
    }

    .forbidden-text {
      font-size: 0.95rem;
      color: #475569;
      line-height: 1.5;
      margin: 0 0 2rem 0;
    }

    .role-badge {
      text-transform: uppercase;
      background: #f1f5f9;
      padding: 0.15rem 0.5rem;
      border-radius: 0.25rem;
      color: #0f2744;
      font-size: 0.85rem;
    }

    .actions {
      display: flex;
      gap: 0.75rem;
      justify-content: center;
      flex-wrap: wrap;
    }

    .btn-home {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      background: #0f2744;
      color: #ffffff;
      padding: 0.65rem 1.25rem;
      border-radius: 0.625rem;
      font-weight: 600;
      text-decoration: none;
      transition: background 0.15s;
    }
    .btn-home:hover {
      background: #16365c;
    }

    .btn-back {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      background: #f1f5f9;
      color: #334155;
      padding: 0.65rem 1.25rem;
      border-radius: 0.625rem;
      border: 1px solid #cbd5e1;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.15s;
    }
    .btn-back:hover {
      background: #e2e8f0;
    }
  `]
})
export class NoAutorizadoComponent {
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  regresar(): void {
    window.history.back();
  }
}

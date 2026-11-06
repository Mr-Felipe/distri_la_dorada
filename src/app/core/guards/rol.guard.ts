import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { RolUsuario } from '../models/enums';

export function rolGuard(rolesPermitidos: RolUsuario[]): CanActivateFn {
  return async () => {
    const auth = inject(AuthService);
    const router = inject(Router);

    // Esperar inicialización
    if (!auth.inicializado()) {
      let intentos = 0;
      while (!auth.inicializado() && intentos < 20) {
        await new Promise(r => setTimeout(r, 50));
        intentos++;
      }
    }

    if (!auth.autenticado()) {
      return router.createUrlTree(['/login']);
    }

    const rolActual = auth.rol();
    if (rolActual && rolesPermitidos.includes(rolActual)) {
      return true;
    }

    // Redirección amigable a pantalla 403
    return router.createUrlTree(['/no-autorizado']);
  };
}

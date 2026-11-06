import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  // Si aún está inicializando, esperar brevemente a que el SDK responda
  if (!auth.inicializado()) {
    let intentos = 0;
    while (!auth.inicializado() && intentos < 20) {
      await new Promise(r => setTimeout(r, 50));
      intentos++;
    }
  }

  if (auth.autenticado()) {
    return true;
  }

  return router.createUrlTree(['/login']);
};

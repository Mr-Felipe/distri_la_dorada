import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { rolGuard } from './core/guards/rol.guard';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'catalogo'
  },
  {
    path: 'login',
    loadComponent: () => import('./features/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'catalogo',
    canActivate: [authGuard],
    children: [
      {
        path: '',
        loadComponent: () => import('./features/catalogo/catalogo-lista.component').then(m => m.CatalogoListaComponent)
      },
      {
        path: 'nuevo',
        canActivate: [rolGuard(['admin', 'vendedor', 'bodega'])],
        loadComponent: () => import('./features/catalogo/producto-form.component').then(m => m.ProductoFormComponent)
      },
      {
        path: ':id',
        canActivate: [rolGuard(['admin', 'vendedor', 'bodega'])],
        loadComponent: () => import('./features/catalogo/producto-form.component').then(m => m.ProductoFormComponent)
      }
    ]
  },
  {
    path: 'pedidos',
    canActivate: [authGuard],
    children: [
      {
        path: '',
        loadComponent: () => import('./features/pedidos/pedidos-lista.component').then(m => m.PedidosListaComponent)
      },
      {
        path: 'nuevo',
        canActivate: [rolGuard(['admin', 'vendedor'])],
        loadComponent: () => import('./features/pedidos/pedido-form.component').then(m => m.PedidoFormComponent)
      },
      {
        path: ':id',
        loadComponent: () => import('./features/pedidos/pedido-detalle.component').then(m => m.PedidoDetalleComponent)
      }
    ]
  },
  {
    path: 'bodega',
    canActivate: [rolGuard(['admin', 'bodega'])],
    loadComponent: () => import('./features/bodega/bodega.component').then(m => m.BodegaComponent)
  },
  {
    path: 'resumen',
    canActivate: [authGuard],
    loadComponent: () => import('./features/resumen/resumen.component').then(m => m.ResumenComponent)
  },
  {
    path: 'actividad',
    canActivate: [rolGuard(['admin'])],
    loadComponent: () => import('./features/actividad/actividad.component').then(m => m.ActividadComponent)
  },
  {
    path: 'no-autorizado',
    loadComponent: () => import('./features/no-autorizado/no-autorizado.component').then(m => m.NoAutorizadoComponent)
  },
  {
    path: '**',
    redirectTo: 'catalogo'
  }
];

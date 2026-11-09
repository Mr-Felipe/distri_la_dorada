import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'catalogo'
  },
  {
    path: 'catalogo',
    children: [
      {
        path: '',
        loadComponent: () => import('./features/catalogo/catalogo-lista.component').then(m => m.CatalogoListaComponent)
      },
      {
        path: 'nuevo',
        loadComponent: () => import('./features/catalogo/producto-form.component').then(m => m.ProductoFormComponent)
      },
      {
        path: ':id',
        loadComponent: () => import('./features/catalogo/producto-form.component').then(m => m.ProductoFormComponent)
      }
    ]
  },
  {
    path: 'pedidos',
    children: [
      {
        path: '',
        loadComponent: () => import('./features/pedidos/pedidos-lista.component').then(m => m.PedidosListaComponent)
      },
      {
        path: 'nuevo',
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
    loadComponent: () => import('./features/bodega/bodega.component').then(m => m.BodegaComponent)
  },
  {
    path: 'resumen',
    loadComponent: () => import('./features/resumen/resumen.component').then(m => m.ResumenComponent)
  },
  {
    path: '**',
    redirectTo: 'catalogo'
  }
];

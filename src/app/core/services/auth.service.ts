import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Session, User } from '@supabase/supabase-js';
import { Perfil } from '../models/perfil';
import { RolUsuario } from '../models/enums';
import { SupabaseService } from './supabase.service';
import { mapError } from '../utils/errores';
import {
  puedeAjustarExistencias,
  puedeConfirmarCancelarPedido,
  puedeCrearEditarProducto,
  puedeCrearPedido,
  puedeDesactivarProducto,
  puedeDespacharPedido,
  puedeVerActividad
} from '../utils/estados';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly supabase = inject(SupabaseService);
  private readonly router = inject(Router);

  readonly sesion = signal<Session | null>(null);
  readonly perfil = signal<Perfil | null>(null);
  readonly cargando = signal<boolean>(true);
  readonly inicializado = signal<boolean>(false);

  // Computeds
  readonly usuario = computed<User | null>(() => this.sesion()?.user ?? null);
  readonly autenticado = computed<boolean>(() => !!this.sesion() && !!this.perfil());
  
  readonly rol = computed<RolUsuario | null>(() => {
    const p = this.perfil();
    if (p && p.rol) {
      return p.rol;
    }
    // Respaldo desde app_metadata del JWT si aún no ha cargado el perfil
    const jwtRol = this.sesion()?.user?.app_metadata?.['rol'] as RolUsuario | undefined;
    if (jwtRol && ['admin', 'vendedor', 'bodega'].includes(jwtRol)) {
      return jwtRol;
    }
    return null;
  });

  readonly nombreUsuario = computed<string>(() => {
    return this.perfil()?.nombre || this.usuario()?.email?.split('@')[0] || 'Usuario';
  });

  // Permisos computados según §6
  readonly esAdmin = computed(() => this.rol() === 'admin');
  readonly esVendedor = computed(() => this.rol() === 'vendedor');
  readonly esBodega = computed(() => this.rol() === 'bodega');

  readonly puedeCrearEditarProducto = computed(() => puedeCrearEditarProducto(this.rol()));
  readonly puedeAjustarExistencias = computed(() => puedeAjustarExistencias(this.rol()));
  readonly puedeDesactivarProducto = computed(() => puedeDesactivarProducto(this.rol()));
  readonly puedeCrearPedido = computed(() => puedeCrearPedido(this.rol()));
  readonly puedeConfirmarCancelarPedido = computed(() => puedeConfirmarCancelarPedido(this.rol()));
  readonly puedeDespacharPedido = computed(() => puedeDespacharPedido(this.rol()));
  readonly puedeVerActividad = computed(() => puedeVerActividad(this.rol()));

  constructor() {
    this.iniciarSesionListener();
  }

  private async iniciarSesionListener(): Promise<void> {
    try {
      // 1. Obtener sesión activa inicial
      const { data: { session } } = await this.supabase.client.auth.getSession();
      this.sesion.set(session);

      if (session?.user) {
        await this.cargarPerfil(session.user.id);
      }
    } catch (err) {
      console.error('Error al inicializar sesión:', err);
    } finally {
      this.cargando.set(false);
      this.inicializado.set(true);
    }

    // 2. Escuchar cambios de autenticación
    this.supabase.client.auth.onAuthStateChange(async (event, session) => {
      this.sesion.set(session);

      if (session?.user) {
        if (!this.perfil() || this.perfil()?.id !== session.user.id) {
          await this.cargarPerfil(session.user.id);
        }
      } else {
        this.perfil.set(null);
      }
      this.cargando.set(false);
    });
  }

  async cargarPerfil(userId: string): Promise<Perfil | null> {
    try {
      const { data, error } = await this.supabase.client
        .from('perfiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.warn('No se pudo cargar perfil de la BD, usando respaldo:', error);
      }

      if (data) {
        const perfilCargado: Perfil = {
          id: data.id,
          nombre: data.nombre || 'Usuario',
          rol: data.rol as RolUsuario,
          activo: data.activo !== false,
          creado_en: data.creado_en,
          actualizado_en: data.actualizado_en
        };
        this.perfil.set(perfilCargado);
        return perfilCargado;
      }

      // Si no existe fila en perfiles, construir fallback temporal con datos del usuario
      const u = this.sesion()?.user;
      const fallbackRol = (u?.app_metadata?.['rol'] || 'vendedor') as RolUsuario;
      const fallbackPerfil: Perfil = {
        id: userId,
        nombre: u?.email?.split('@')[0] || 'Usuario',
        rol: fallbackRol,
        activo: true
      };
      this.perfil.set(fallbackPerfil);
      return fallbackPerfil;
    } catch (e) {
      console.error('Excepción al cargar perfil:', e);
      return null;
    }
  }

  async login(email: string, password: string): Promise<{ exito: boolean; error?: string }> {
    this.cargando.set(true);
    try {
      const { data, error } = await this.supabase.client.auth.signInWithPassword({
        email: email.trim(),
        password
      });

      if (error) {
        const appErr = mapError(error);
        return { exito: false, error: appErr.mensaje };
      }

      if (data.session?.user) {
        this.sesion.set(data.session);
        await this.cargarPerfil(data.session.user.id);
        return { exito: true };
      }

      return { exito: false, error: 'No se pudo iniciar sesión.' };
    } catch (err) {
      const appErr = mapError(err);
      return { exito: false, error: appErr.mensaje };
    } finally {
      this.cargando.set(false);
    }
  }

  async logout(): Promise<void> {
    try {
      await this.supabase.client.auth.signOut();
    } catch (e) {
      console.error('Error al cerrar sesión:', e);
    } finally {
      this.sesion.set(null);
      this.perfil.set(null);
      this.router.navigate(['/login']);
    }
  }
}

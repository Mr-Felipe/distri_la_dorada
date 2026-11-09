import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class SupabaseService {
  private readonly supabaseClient: SupabaseClient;

  constructor() {
    this.supabaseClient = createClient(
      environment.supabaseUrl,
      environment.supabaseAnonKey,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false
        }
      }
    );
  }

  get client(): SupabaseClient {
    return this.supabaseClient;
  }
}

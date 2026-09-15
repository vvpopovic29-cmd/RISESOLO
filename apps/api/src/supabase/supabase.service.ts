import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { ApiEnv } from "../config/env";

/**
 * Jedini nacin na koji apps/api prica sa Supabase-om. Koristi
 * SUPABASE_SERVICE_ROLE_KEY - ZAOBILAZI RLS, pa je ovaj servis namerno
 * dostupan SAMO backend-u (nikad se ne izlaze klijentu). "Server je
 * jedini autoritet" (Faza 6) se ovde doslovno sprovodi: klijent nikad ne
 * dobija service-role klijent, samo HTTP odgovore ovog API-ja.
 */
@Injectable()
export class SupabaseService {
  private readonly client: SupabaseClient;

  constructor(configService: ConfigService<ApiEnv, true>) {
    const url = configService.get("SUPABASE_URL", { infer: true });
    const serviceRoleKey = configService.get("SUPABASE_SERVICE_ROLE_KEY", { infer: true });

    this.client = createClient(url, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }

  /** Service-role klijent za DB citanje/pisanje (zaobilazi RLS - koristi ga SAMO iz repository sloja). */
  getClient(): SupabaseClient {
    return this.client;
  }

  /** Verifikuje Bearer JWT protiv Supabase Auth-a i vraca ID korisnika kome pripada. */
  async verifyAccessToken(accessToken: string): Promise<{ id: string; email: string | null } | null> {
    const { data, error } = await this.client.auth.getUser(accessToken);
    if (error || !data.user) {
      return null;
    }
    return { id: data.user.id, email: data.user.email ?? null };
  }
}

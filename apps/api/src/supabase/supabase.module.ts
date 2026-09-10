import { Global, Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { ApiEnv } from "../config/env";

/** DI token za service-role Supabase klijent - videti SupabaseModule. */
export const SUPABASE_CLIENT = Symbol("SUPABASE_CLIENT");

/**
 * Globalni provider za jedan deljeni service-role Supabase klijent.
 * Service-role kljuc zaobilazi RLS, sto je namerno: sve poslovne
 * mutacije idu kroz SECURITY DEFINER RPC funkcije koje same validiraju
 * uslove (videti supabase/migrations/), a ovaj klijent nikad ne napusta
 * backend proces.
 */
@Global()
@Module({
  providers: [
    {
      provide: SUPABASE_CLIENT,
      inject: [ConfigService],
      useFactory: (configService: ConfigService<ApiEnv, true>): SupabaseClient => {
        const url = configService.get("SUPABASE_URL", { infer: true });
        const serviceRoleKey = configService.get("SUPABASE_SERVICE_ROLE_KEY", { infer: true });

        return createClient(url, serviceRoleKey, {
          auth: { autoRefreshToken: false, persistSession: false },
        });
      },
    },
  ],
  exports: [SUPABASE_CLIENT],
})
export class SupabaseModule {}

import { Module } from "@nestjs/common";
import { SupabaseAuthGuard } from "./supabase-auth.guard";
import { SupabaseJwtVerifier } from "./supabase-jwt-verifier";

@Module({
  providers: [SupabaseJwtVerifier, SupabaseAuthGuard],
  exports: [SupabaseJwtVerifier, SupabaseAuthGuard],
})
export class AuthModule {}

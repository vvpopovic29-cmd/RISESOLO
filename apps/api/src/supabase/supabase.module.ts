import { Global, Module } from "@nestjs/common";
import { SupabaseService } from "./supabase.service";

/**
 * Global - svaki drugi modul (Player/Exercises/Quests/Workouts) injektuje
 * SupabaseService bez potrebe da ga svaki put uvozi zasebno.
 */
@Global()
@Module({
  providers: [SupabaseService],
  exports: [SupabaseService],
})
export class SupabaseModule {}

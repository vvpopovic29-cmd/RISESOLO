import { Injectable, InternalServerErrorException } from "@nestjs/common";
import { exerciseRowSchema, mapExerciseRowToDomain } from "@risesolo/validation";
import type { Exercise } from "@risesolo/domain";
import { SupabaseService } from "../supabase/supabase.service";

@Injectable()
export class ExercisesRepository {
  constructor(private readonly supabaseService: SupabaseService) {}

  /** Ceo katalog (240 vezbi) - filtriranje radi ExercisesService preko @risesolo/domain query helpera. */
  async listAll(): Promise<Exercise[]> {
    const { data, error } = await this.supabaseService.getClient().from("exercises").select("*");

    if (error || !data) {
      throw new InternalServerErrorException(`Neuspesno ucitavanje exercises: ${error?.message}`);
    }
    return data.map((row) => mapExerciseRowToDomain(exerciseRowSchema.parse(row)));
  }
}

import { BadRequestException, type PipeTransform } from "@nestjs/common";
import type { z } from "@risesolo/validation";
import { formatZodError } from "@risesolo/validation";

/**
 * Validira request body protiv deljene Zod seme iz `@risesolo/validation`
 * (isti izvor istine koji koristi i api-client). Zamenjuje class-validator
 * DTO dekoratore - u skladu sa arhitektonskim pravilom #5 (jedan izvor
 * istine za DTO ugovore).
 */
export class ZodValidationPipe<TSchema extends z.ZodTypeAny> implements PipeTransform {
  constructor(private readonly schema: TSchema) {}

  transform(value: unknown): z.infer<TSchema> {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      throw new BadRequestException(`Nevalidan zahtev:\n${formatZodError(result.error)}`);
    }
    return result.data;
  }
}

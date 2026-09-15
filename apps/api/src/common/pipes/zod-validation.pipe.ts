import { BadRequestException, type PipeTransform } from "@nestjs/common";
import { formatZodError, type z } from "@risesolo/validation";

/**
 * Validira request body/query protiv deljene Zod seme iz
 * `@risesolo/validation` - isti ugovor koji koristi i `packages/api-client`.
 * Ovo je jedina tacka gde ulaz sa mreze postaje tipiziran DTO.
 */
export class ZodValidationPipe<TSchema extends z.ZodTypeAny> implements PipeTransform {
  constructor(private readonly schema: TSchema) {}

  transform(value: unknown): z.infer<TSchema> {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      throw new BadRequestException(formatZodError(result.error));
    }
    return result.data;
  }
}

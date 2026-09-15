import { BadRequestException, type PipeTransform } from "@nestjs/common";
import type { z } from "@risesolo/validation";

/**
 * Validira request body protiv date Zod seme - dosledno sa ostatkom
 * repoa gde je Zod jedini validacioni alat (packages/validation).
 * Koristi se preko `new ZodValidationPipe(schema)` u @Body() dekoratoru.
 */
export class ZodValidationPipe<TSchema extends z.ZodTypeAny> implements PipeTransform {
  constructor(private readonly schema: TSchema) {}

  transform(value: unknown): z.infer<TSchema> {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      throw new BadRequestException(result.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })));
    }
    return result.data;
  }
}

import { BadRequestException, Injectable, type PipeTransform } from "@nestjs/common";
import type { z } from "@risesolo/validation";
import { formatZodError } from "@risesolo/validation";

/**
 * Validira request body (ili bilo koji drugi pipe-ovan ulaz) protiv
 * deljene Zod seme iz `@risesolo/validation` - jedini nacin na koji ulazni
 * podaci ulaze u kontroler. Nevalidan zahtev nikad ne stigne do servisa.
 */
@Injectable()
export class ZodValidationPipe<TSchema extends z.ZodTypeAny> implements PipeTransform {
  constructor(private readonly schema: TSchema) {}

  transform(value: unknown): z.infer<TSchema> {
    const result = this.schema.safeParse(value);

    if (!result.success) {
      throw new BadRequestException({
        message: "Nevalidan zahtev",
        details: formatZodError(result.error),
      });
    }

    return result.data as z.infer<TSchema>;
  }
}

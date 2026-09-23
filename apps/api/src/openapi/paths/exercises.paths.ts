import { exerciseSchema, listExercisesQuerySchema, z } from "@risesolo/validation";
import { AUTH_RESPONSES, AUTH_SECURITY, jsonResponse, registry } from "../registry";

export function registerExercisesPaths(): void {
  const Exercise = registry.register("Exercise", exerciseSchema);
  const ExerciseList = registry.register("ExerciseList", z.array(exerciseSchema));
  const ListExercisesQuery = registry.register("ListExercisesQuery", listExercisesQuerySchema);

  registry.registerPath({
    method: "get",
    path: "/exercises",
    tags: ["Exercises"],
    summary: "Lista vežbi iz biblioteke (filter po kategoriji/tipu/težini)",
    security: AUTH_SECURITY,
    request: { query: ListExercisesQuery },
    responses: {
      200: jsonResponse(ExerciseList),
      ...AUTH_RESPONSES,
    },
  });

  registry.registerPath({
    method: "get",
    path: "/exercises/{slug}",
    tags: ["Exercises"],
    summary: "Detalji jedne vežbe po slug-u",
    security: AUTH_SECURITY,
    request: { params: z.object({ slug: z.string() }) },
    responses: {
      200: jsonResponse(Exercise),
      404: { description: "Vežba sa datim slug-om ne postoji" },
      ...AUTH_RESPONSES,
    },
  });
}

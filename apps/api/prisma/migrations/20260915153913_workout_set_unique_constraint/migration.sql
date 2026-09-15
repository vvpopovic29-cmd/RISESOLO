-- DropIndex
DROP INDEX "workout_sets_session_id_idx";

-- CreateIndex
CREATE UNIQUE INDEX "workout_sets_session_id_exercise_id_set_number_key" ON "workout_sets"("session_id", "exercise_id", "set_number");


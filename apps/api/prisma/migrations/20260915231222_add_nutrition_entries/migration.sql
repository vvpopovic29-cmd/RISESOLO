-- CreateEnum
CREATE TYPE "meal_type" AS ENUM ('BREAKFAST', 'LUNCH', 'DINNER', 'SNACK');

-- CreateTable
CREATE TABLE "nutrition_entries" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "meal_type" "meal_type" NOT NULL,
    "name" TEXT NOT NULL,
    "calories" INTEGER NOT NULL,
    "protein_g" INTEGER NOT NULL,
    "carbs_g" INTEGER NOT NULL,
    "fat_g" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "nutrition_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "nutrition_entries_user_id_date_idx" ON "nutrition_entries"("user_id", "date");

-- AddForeignKey
ALTER TABLE "nutrition_entries" ADD CONSTRAINT "nutrition_entries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

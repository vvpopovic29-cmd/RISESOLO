-- AlterTable
ALTER TABLE "profiles" ADD COLUMN     "equipped_avatar_frame_id" TEXT,
ADD COLUMN     "equipped_title_id" TEXT;

-- CreateTable
CREATE TABLE "user_cosmetics" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "item_id" TEXT NOT NULL,
    "purchased_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_cosmetics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_cosmetics_user_id_idx" ON "user_cosmetics"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_cosmetics_user_id_item_id_key" ON "user_cosmetics"("user_id", "item_id");

-- AddForeignKey
ALTER TABLE "user_cosmetics" ADD CONSTRAINT "user_cosmetics_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

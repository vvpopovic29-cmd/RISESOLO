-- AlterEnum
ALTER TYPE "item_source" ADD VALUE 'AI_GENERATED';

-- AlterTable
ALTER TABLE "inventory_items" ADD COLUMN     "generated_description" TEXT,
ADD COLUMN     "generated_name" TEXT;
